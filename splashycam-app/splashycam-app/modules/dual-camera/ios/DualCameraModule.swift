// dual-camera (iOS). STATUS: capability check only, NEVER COMPILED. See ../README.md.

import AVFoundation
import ExpoModulesCore

public class DualCameraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DualCamera")

    // AVCaptureMultiCamSession exists since iOS 13 and runs on A12 (iPhone XS) and later.
    Function("isSupported") { () -> Bool in
      AVCaptureMultiCamSession.isMultiCamSupported
    }
  }
}
