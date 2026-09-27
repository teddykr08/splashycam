// stamp-video (Android): burns the Splashy Cam camcorder stamp into a video, on-device.
//
// STATUS: written against the Media3 1.9.0 sources (the version expo-video pins in
// SDK 57) and Expo's module API, but NEVER COMPILED OR RUN. It needs a real build (EAS,
// Gradle) and a real phone before anyone relies on it. Things most likely to need fixing
// on first run are marked "CHECK ON DEVICE".
//
// Approach: Media3 Transformer + OverlayEffect with a BitmapOverlay. The overlay bitmap
// is re-drawn once per second so the stamp's clock counts up like a camcorder.

package expo.modules.stampvideo

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.media.MediaMetadataRetriever
import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.OverlaySettings
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.StaticOverlaySettings
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class StampSpec : Record {
  @Field
  val code: String = ""

  @Field
  val startEpochMs: Double = 0.0

  @Field
  val place: String? = null
}

class StampVideoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StampVideo")

    // Transformer must be created and started on a thread with a Looper, and its
    // callbacks arrive on that thread, so this runs on the main queue.
    AsyncFunction("burnStamp") { inputUri: String, spec: StampSpec, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      StampVideoRenderer(context).burn(Uri.parse(inputUri), spec, promise)
    }.runOnQueue(Queues.MAIN)
  }
}

@OptIn(UnstableApi::class)
internal class StampVideoRenderer(private val context: Context) {
  // On-screen stamp was designed for a ~390 dp wide phone; scale to the video's width.
  private val designWidth = 390f

  fun burn(input: Uri, spec: StampSpec, promise: Promise) {
    val displayWidth = try {
      videoDisplayWidth(input)
    } catch (e: Exception) {
      promise.reject("ERR_STAMP_READ", "Couldn't read the video: ${e.message}", e)
      return
    }
    val scale = displayWidth / designWidth

    // CHECK ON DEVICE: anchors are in normalized coordinates (-1..1, y up, per Media3's
    // StaticOverlaySettings docs). (-1,-1) on the overlay pinned near (-1,-1) of the frame
    // should put the stamp bottom-left. Verify on a portrait clip; if Media3 applies effects
    // before rotation on this device, the stamp will land on the wrong edge.
    val settings = StaticOverlaySettings.Builder()
      .setOverlayFrameAnchor(-1f, -1f)
      .setBackgroundFrameAnchor(-0.94f, -0.94f)
      .build()

    val overlay = object : BitmapOverlay() {
      private var second = -1L
      private var bitmap: Bitmap? = null

      override fun getBitmap(presentationTimeUs: Long): Bitmap {
        val s = maxOf(0L, presentationTimeUs / 1_000_000L)
        val cached = bitmap
        if (cached != null && s == second) return cached
        val next = StampBitmap.make(spec, Date(spec.startEpochMs.toLong() + s * 1000L), scale)
        bitmap = next
        second = s
        return next
      }

      override fun getOverlaySettings(presentationTimeUs: Long): OverlaySettings = settings
    }

    val edited = EditedMediaItem.Builder(MediaItem.fromUri(input))
      .setEffects(Effects(listOf(), listOf(OverlayEffect(listOf(overlay)))))
      .build()

    val out = File(context.cacheDir, "stamped-${System.currentTimeMillis()}.mp4")

    val transformer = Transformer.Builder(context)
      .addListener(object : Transformer.Listener {
        override fun onCompleted(composition: Composition, exportResult: ExportResult) {
          promise.resolve(Uri.fromFile(out).toString())
        }

        override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
          out.delete()
          promise.reject("ERR_STAMP_EXPORT", exportException.message ?: "Export failed", exportException)
        }
      })
      .build()

    transformer.start(edited, out.absolutePath)
  }

  /** Width of the picture as it's shown (portrait clips are stored rotated). */
  private fun videoDisplayWidth(uri: Uri): Float {
    val r = MediaMetadataRetriever()
    try {
      r.setDataSource(context, uri)
      val w = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toFloatOrNull() ?: 1080f
      val h = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toFloatOrNull() ?: 1920f
      val rot = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      return if (rot == 90 || rot == 270) h else w
    } finally {
      r.release()
    }
  }
}

/**
 * Draws the same camcorder stamp as components/StampOverlay.tsx: dark plate, blue dot,
 * "SPLASHY CAM", big code, fixed-width time, city in caps.
 */
internal object StampBitmap {
  // Must match lib/code.ts stampTime(). SimpleDateFormat isn't thread-safe, so one per call.
  private fun time(d: Date) = SimpleDateFormat("yyyy-MM-dd  HH:mm:ss", Locale.US).format(d)

  private data class Line(val text: String, val size: Float, val bold: Boolean, val color: Int, val kern: Float)

  fun make(spec: StampSpec, at: Date, scale: Float): Bitmap {
    val tint = Color.rgb(0xDC, 0xE6, 0xFF)
    val lines = mutableListOf(
      Line("SPLASHY CAM", 10f, true, tint, 2f),
      Line(spec.code, 22f, true, Color.WHITE, 3f),
      Line(time(at), 13f, false, Color.WHITE, 1f),
    )
    spec.place?.takeIf { it.isNotBlank() }?.let { lines.add(Line(it.uppercase(Locale.US), 12f, false, tint, 1.5f)) }

    val paints = lines.map { l ->
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create(Typeface.MONOSPACE, if (l.bold) Typeface.BOLD else Typeface.NORMAL)
        textSize = l.size * scale
        color = l.color
        letterSpacing = l.kern / l.size // Android letterSpacing is in ems
      }
    }
    val padX = 10f * scale
    val padY = 8f * scale
    val gap = 2f * scale
    val dot = 7f * scale
    val dotGap = 6f * scale

    val widths = lines.mapIndexed { i, l -> paints[i].measureText(l.text) + if (i == 0) dot + dotGap else 0f }
    val heights = paints.map { it.fontMetrics.let { m -> m.descent - m.ascent } }
    val w = (widths.maxOrNull() ?: 0f) + padX * 2
    val h = heights.sum() + gap * (lines.size - 1) + padY * 2

    val bmp = Bitmap.createBitmap(kotlin.math.ceil(w).toInt(), kotlin.math.ceil(h).toInt(), Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    c.drawRoundRect(RectF(0f, 0f, w, h), 6f * scale, 6f * scale, Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb((0.68f * 255).toInt(), 0, 0, 0)
    })

    var y = padY
    lines.forEachIndexed { i, l ->
      var x = padX
      val baseline = y - paints[i].fontMetrics.ascent
      if (i == 0) {
        c.drawCircle(x + dot / 2, y + heights[i] / 2, dot / 2, Paint(Paint.ANTI_ALIAS_FLAG).apply {
          color = Color.rgb(0x2E, 0x7B, 0xFF)
        })
        x += dot + dotGap
      }
      c.drawText(l.text, x, baseline, paints[i])
      y += heights[i] + gap
    }
    return bmp
  }
}
