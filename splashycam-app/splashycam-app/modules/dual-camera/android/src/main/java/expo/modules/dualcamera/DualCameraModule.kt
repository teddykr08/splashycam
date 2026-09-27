// dual-camera (Android). STATUS: capability check only, NEVER COMPILED. See ../README.md.

package expo.modules.dualcamera

import android.content.Context
import android.hardware.camera2.CameraManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

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
  }
}
