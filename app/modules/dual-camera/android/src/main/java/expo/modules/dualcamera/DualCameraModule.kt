// dual-camera (Android): front camera on the top half, back camera on the bottom half,
// recorded as ONE video.
//
// STATUS: written against CameraX's concurrent-camera "composition mode" (ConcurrentCamera.
// SingleCameraConfig + CompositionSettings, read from the androidx source) and Expo's
// module/view API, but NEVER COMPILED OR RUN. CameraX is pinned to 1.6.0 to match
// expo-camera; the API was checked against androidx-main, not the 1.6.0 tag. Needs an EAS
// build and a phone that reports a front+back concurrent pair. "CHECK ON DEVICE" marks the
// spots most likely to need fixing.

package expo.modules.dualcamera

import android.annotation.SuppressLint
import android.content.Context
import android.hardware.camera2.CameraManager
import android.net.Uri
import android.os.Build
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.CompositionSettings
import androidx.camera.core.ConcurrentCamera.SingleCameraConfig
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.File

class DualCameraModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DualCamera")

    // CameraManager.getConcurrentCameraIds() is API 30+. A phone supports front + back at
    // once if any listed combination holds two cameras.
    Function("isSupported") {
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return@Function false
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
        ?: return@Function false
      try {
        manager.concurrentCameraIds.any { it.size >= 2 }
      } catch (e: Exception) {
        false
      }
    }

    View(DualCameraView::class) {
      Events("onCameraReady", "onMountError")

      AsyncFunction("startRecording") { view: DualCameraView ->
        view.startRecording()
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("stopRecording") { view: DualCameraView, promise: Promise ->
        view.stopRecording(promise)
      }.runOnQueue(Queues.MAIN)
    }
  }
}

class DualCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onCameraReady by EventDispatcher<Unit>()
  private val onMountError by EventDispatcher<Map<String, String>>()

  private val previewView = PreviewView(context).also {
    // The composed stream (front top half + back bottom half) is what's shown, so the preview matches
    // the recording exactly.
    it.scaleType = PreviewView.ScaleType.FILL_CENTER
    addView(it, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
  }

  private var provider: ProcessCameraProvider? = null
  private var videoCapture: VideoCapture<Recorder>? = null
  private var recording: Recording? = null
  private var outputFile: File? = null
  private var stopPromise: Promise? = null

  init {
    bindCameras()
  }

  private fun fail(message: String) = onMountError(mapOf("message" to message))

  private fun bindCameras() {
    val owner = appContext.currentActivity as? AppCompatActivity ?: return fail("No activity to attach the cameras to")
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      try {
        val p = future.get()
        provider = p

        val hasPair = p.availableConcurrentCameraInfos.any { infos ->
          infos.any { it.lensFacing == CameraSelector.LENS_FACING_BACK } &&
            infos.any { it.lensFacing == CameraSelector.LENS_FACING_FRONT }
        }
        if (!hasPair) return@addListener fail("This phone can't run the front and back cameras at once")

        val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
        val recorder = Recorder.Builder()
          .setQualitySelector(QualitySelector.from(Quality.FHD, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
          .build()
        val capture = VideoCapture.withOutput(recorder)

        // Composition mode: BOTH cameras bind the SAME preview + video capture instances, and
        // CameraX composes them into one stream.
        val group = UseCaseGroup.Builder().addUseCase(preview).addUseCase(capture).build()

        // Split layout (mirrors LAYOUT in ../index.ts): front on the top half, back on the
        // bottom half. Normalized device coordinates: origin at centre, +y up, -1..1; offset
        // is applied after scale.
        //
        // CHECK ON DEVICE, LIKELY NEEDS REWORK:
        //  1. CompositionSettings can only scale and offset, not crop. Scaling a full-height
        //     camera frame to half height (scaleY 0.5) SQUASHES it. Fixes to try: a uniform
        //     scale (letterboxed, not squashed), or record the two cameras separately
        //     (non-composition mode) and stack them with Media3 in the stamp-video export.
        //  2. CameraX's docs say rotation and mirroring are applied AFTER composition, so on a
        //     portrait phone "top half" here may come out as a left/right half. If so, swap to
        //     setScale(0.5f, 1f) with setOffset(±0.5f, 0f).
        val frontLayout = CompositionSettings.Builder().setAlpha(1f).setOffset(0f, 0.5f).setScale(1f, 0.5f).build()
        val backLayout = CompositionSettings.Builder().setAlpha(1f).setOffset(0f, -0.5f).setScale(1f, 0.5f).build()

        p.unbindAll()
        p.bindToLifecycle(
          listOf(
            SingleCameraConfig(CameraSelector.DEFAULT_BACK_CAMERA, group, backLayout, owner),
            SingleCameraConfig(CameraSelector.DEFAULT_FRONT_CAMERA, group, frontLayout, owner),
          )
        )
        videoCapture = capture
        onCameraReady(Unit)
      } catch (e: Exception) {
        fail("Couldn't start both cameras: ${e.message}")
      }
    }, ContextCompat.getMainExecutor(context))
  }

  // Camera + mic permissions are granted by the JS screen before this view is shown.
  @SuppressLint("MissingPermission")
  fun startRecording() {
    val capture = videoCapture ?: throw IllegalStateException("Cameras aren't ready")
    if (recording != null) throw IllegalStateException("Already recording")
    val file = File(context.cacheDir, "dual-${System.currentTimeMillis()}.mp4")
    outputFile = file
    recording = capture.output
      .prepareRecording(context, FileOutputOptions.Builder(file).build())
      .withAudioEnabled()
      .start(ContextCompat.getMainExecutor(context)) { event ->
        if (event is VideoRecordEvent.Finalize) {
          val promise = stopPromise
          stopPromise = null
          if (!event.hasError()) {
            promise?.resolve(Uri.fromFile(file).toString())
          } else {
            promise?.reject("ERR_DUAL_RECORD", "Recording failed (error ${event.error})", event.cause)
          }
        }
      }
  }

  fun stopRecording(promise: Promise) {
    val r = recording ?: return promise.reject("ERR_DUAL_RECORD", "Not recording", null)
    stopPromise = promise
    recording = null
    r.stop() // resolves in the Finalize event above
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    recording?.stop()
    recording = null
    provider?.unbindAll()
  }
}
