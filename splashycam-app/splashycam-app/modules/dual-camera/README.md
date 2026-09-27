# dual-camera: back + front at the same time

Records **one video, split top/bottom**: the front camera fills the top half, the back
camera the bottom half. Each camera is centre-cropped to fill its half, with no
stretching. Other layouts (a small front inset, or back camera only) could become a
personal setting later. `LAYOUT` in `index.ts` is the one place the split is defined
in JS.

## Status: written, not proven

| | |
|---|---|
| Written | **iOS** (`ios/DualCameraModule.swift`): `AVCaptureMultiCamSession`, two preview layers on explicit connections (front top half, back bottom half), and each back frame stacked under the latest front frame via Core Image (each aspect-filled into its half), written with `AVAssetWriter` plus mic audio. This is the approach of Apple's *AVMultiCamPiP* sample. **Android** (`android/.../DualCameraModule.kt`): CameraX concurrent camera in composition mode. Both cameras bind the same `Preview` + `VideoCapture`, and `CompositionSettings` places each in its half. **This one is likely to need rework:** CameraX can scale but not crop, so a half-height camera may come out squashed. And rotation is applied after composition, so the halves may land left/right on a portrait phone. The source comment lists the fixes to try. **JS** (`index.ts`): `isAvailable`, `isSupported()`, and `DualCameraView`, whose `startRecording()` / `stopRecording()` are called through a ref, the same pattern as `expo-camera`. |
| Checked | Expo autolinking resolves the module on both platforms, and `expo prebuild` succeeds with it. The CameraX classes used (`ConcurrentCamera.SingleCameraConfig`, `CompositionSettings`, `bindToLifecycle(List<SingleCameraConfig>)`) were read from the androidx source on its main branch, **not the 1.6.0 tag**. |
| **Not checked** | **Never compiled or run.** There was no Xcode or Android SDK in the environment where it was written. Expect compile errors first, then tuning on a device. `CHECK ON DEVICE` in the source marks the likeliest problems. |

## How the app uses it

`app/record.tsx` renders `DualCameraView` only when the module is in the build **and**
`isSupported()` is true. Otherwise the back camera runs in the bottom half with
`expo-camera`, and the top half is a labelled **FRONT CAM** panel. The panel says why
it's empty ("Needs the full app" in Expo Go, "This phone can't run both cameras" on
older phones) and "Not recording" while filming. It never pretends to be a camera.

The dual video then goes through the same trim → stamp → share flow as a normal clip.

## Versions: must match Expo's

- **Android:** CameraX is pinned to **1.6.0**, the version `expo-camera` uses. Check
  `node_modules/expo-camera/android/build.gradle` (`camerax_version`) after every
  Expo SDK upgrade.
- **iOS:** needs iOS 16.4+ (Expo's minimum) and an A12 chip or newer (iPhone XS and
  later).

## What to test on a device, in order

1. **It builds.**
2. **Preview:** front camera on the top half (mirrored), back camera on the bottom half,
   neither stretched.
3. **Record 10 s, then play the file:** one video, front on top and back below, with
   audio. **On Android, check first for squashing and for halves landing left/right.**
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
- **No length limit:** neither recorder sets one. The limit is the phone's free
  storage.
