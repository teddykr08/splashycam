# stamp-video: burn the stamp into the video

A local Expo module that writes the camcorder stamp into the video pixels on the
phone. The stamp includes the code, a clock that counts up each second, and the
city. The input clip is left alone, and a new `.mp4` is written to the app's cache.
Nothing is uploaded.

## Status: prepared, not proven

| | |
|---|---|
| Written | iOS (`ios/StampVideoModule.swift`, AVFoundation + Core Image). Android (`android/.../StampVideoModule.kt`, Media3 Transformer + `OverlayEffect`). JS interface (`index.ts`). |
| Checked | Expo autolinking finds the module on both platforms (`npx expo-modules-autolinking resolve`). `expo prebuild` generates both native projects with it. Every Media3 class and method used was compared against the **1.9.0** source; that's the version expo-video pins in SDK 57. The Expo module API usage matches patterns in Expo's own packages. |
| **Not checked** | **Neither file has ever been compiled.** There was no Xcode, Swift toolchain or Android SDK in the environment where this was written, and Google's Maven repository was unreachable. Expect compile errors on the first build, then behavior bugs on the first device run. |

The app never depends on this module. It calls `isAvailable` first, and if the
module is missing (always, in Expo Go), or `burnStamp` throws, it sends the
original clip with the proof card and says so on screen.

## First build (when you have an Apple Developer account)

```bash
npm install -g eas-cli
eas login
eas init                                    # links the project, adds extra.eas.projectId to app.json
eas device:create                           # register your iPhone for internal distribution
eas build --platform ios --profile preview
```

Android needs no paid account: `eas build --platform android --profile preview`
produces an APK you can install from a link.

The app has no backend right now, so no environment variables are needed. If the
server comes back (`later/README.md`), set the Supabase values with
`eas env:create --environment preview …`: `.env` is git-ignored, so EAS doesn't
upload it.

## What to test on the device, in order

1. **It builds.** Fix any compile errors first. The most likely spots are marked
   `CHECK ON DEVICE` in the source.
2. **Portrait clip.** The stamp should sit in the bottom-left of the upright
   picture. If it's sideways, or on the wrong edge, the orientation handling is
   wrong: on iOS, the Core Image handler's source orientation; on Android, where
   Media3 applies effects relative to rotation.
3. **The clock ticks.** It should count up once per second from the time filming
   started, in the same format as the on-screen stamp.
4. **Audio is still there.**
5. **Time taken for a 60-second clip.** If it's slow, the share screen shows
   "Stamping the video…" the whole time. Decide whether that's acceptable.
6. **Failure path.** Temporarily make `burnStamp` throw. The app should say
   "Couldn't stamp the video" and still send the original clip with the proof card.

## Known risks

- **Media3 version must match expo-video's.** Recheck
  `node_modules/expo-video/android/build.gradle` (`androidxMedia3Version`) after
  every Expo SDK upgrade, and update `android/build.gradle` to match.
- **iOS 18 deprecation.** `AVAssetExportSession.export()` is deprecated in favour
  of `export(to:as:)`. It still works, but expect warnings.
- **Sizing.** The stamp is sized as `video width / 390`, to match how it looks on
  screen. It may need tuning after seeing real output.
