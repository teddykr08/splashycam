# dual-camera: back + front at the same time

Records **one video**: the back camera fills the frame, with the front camera inset
in the top-right (the BeReal / TikTok dual layout). The inset is 30% of the frame
width, at 16:9.

## Status: written, not proven

| | |
|---|---|
| Written | **iOS** (`ios/DualCameraModule.swift`): `AVCaptureMultiCamSession`, two preview layers on explicit connections, and back frames composited with the latest front frame via Core Image, written with `AVAssetWriter` plus mic audio. This is the approach of Apple's *AVMultiCamPiP* sample. **Android** (`android/.../DualCameraModule.kt`): CameraX concurrent camera in composition mode. Both cameras bind the same `Preview` + `VideoCapture`, and `CompositionSettings` places the front camera. **JS** (`index.ts`): `isAvailable`, `isSupported()`, and `DualCameraView`, whose `startRecording()` / `stopRecording()` are called through a ref, the same pattern as `expo-camera`. |
| Checked | Expo autolinking resolves the module on both platforms, and `expo prebuild` succeeds with it. The CameraX classes used (`ConcurrentCamera.SingleCameraConfig`, `CompositionSettings`, `bindToLifecycle(List<SingleCameraConfig>)`) were read from the androidx source on its main branch, **not the 1.6.0 tag**. |
| **Not checked** | **Never compiled or run.** There was no Xcode or Android SDK in the environment where it was written. Expect compile errors first, then tuning on a device. `CHECK ON DEVICE` in the source marks the likeliest problems. |

## How the app uses it

`app/record.tsx` renders `DualCameraView` only when the module is in the build **and**
`isSupported()` is true. Otherwise it records the back camera with `expo-camera` and
shows a dashed **FRONT CAM** box in the inset's position. The box says why it's empty
("Needs the full app" in Expo Go, "This phone can't run both cameras" on older
phones) and "Not recording" while filming. It never pretends to be a camera.

The dual video then goes through the same trim → stamp → share flow as a normal clip.

## Versions: must match Expo's

- **Android:** CameraX is pinned to **1.6.0**, the version `expo-camera` uses. Check
  `node_modules/expo-camera/android/build.gradle` (`camerax_version`) after every
  Expo SDK upgrade.
- **iOS:** needs iOS 16.4+ (Expo's minimum) and an A12 chip or newer (iPhone XS and
  later).

## What to test on a device, in order

1. **It builds.**
2. **Preview:** back camera fills the screen, front camera sits top-right below the
   top bar, and the front view is mirrored.
3. **Record 10 s, then play the file:** one video with the front camera inset
   top-right, and audio present.
4. **Hardware cost (iOS):** if the view reports "too much for this iPhone", lower the
   camera formats. See `hardwareCost` in the source.
5. **Orientation:** portrait recording is upright in the saved file on both platforms.
6. **Unsupported phone:** the app falls back to back camera only, with the FRONT CAM
   box.

## Known limits

- **Resolution:** Apple caps resolution and frame rate when two cameras run at once.
  1080p is the target.
- **Android support varies:** many mid-range phones report no front + back
  concurrent pair. Those get the single-camera fallback.
- **Inset corners:** rounded on screen, square in the iOS recording. Rounding them in
  the recording is a Core Image mask to add later.
