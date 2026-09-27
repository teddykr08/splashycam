# dual-camera: front + back at the same time

**The goal:** record both cameras at once, so the clip shows the hit (back camera)
and the shooter (front camera) in picture-in-picture.

## Status: prep only

| | |
|---|---|
| Written | JS interface (`index.ts`). Native `isSupported()` on iOS (`AVCaptureMultiCamSession.isMultiCamSupported`) and Android (`CameraManager.getConcurrentCameraIds()`, API 30+). |
| **Not written** | The recording itself. That needs its own native camera view, designed below. |
| **Not checked** | Nothing here has been compiled. Like `stamp-video`, it only loads in an EAS build, never in Expo Go. The app doesn't call it yet. |

## Why this can't be done in Expo Go

`expo-camera` runs one camera at a time. Recording two means a capture session that
owns both cameras. That's native code, and Expo Go can't load native code.

## Design for the recording

- **iOS:** an `AVCaptureMultiCamSession` with both cameras as inputs. Frames from
  both are composited into one picture-in-picture frame and written with
  `AVAssetWriter`. Apple's *AVMultiCamPiP* sample does exactly this and is the
  starting point.
- **Android:** CameraX's concurrent camera API (1.3+). Pass both cameras to one
  `bindToLifecycle` call as a list of `SingleCameraConfig`s. Newer CameraX adds a
  composition mode that records picture-in-picture directly.
- **In the app:** exposed as a native view, `DualCameraView`, with the same
  record/stop API the recorder uses today. `record.tsx` would render it instead of
  `CameraView` when `isSupported()` is true and the user turns dual mode on. The
  stamp and burn-in stay the same.

## Known limits to plan around

- **iOS hardware:** A12 chip or later, and Apple limits resolution and frame rate
  when two cameras run at once. Budget for 1080p or lower.
- **Android hardware:** support varies by phone. Many mid-range phones report no
  concurrent camera pairs, so the single-camera path must stay the default.
- **Size of the job:** this is the largest native piece in the app. Build and test
  `stamp-video` first.
