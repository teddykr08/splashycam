# Splashy Cam — Audit

This audits the code **as uploaded** (commit `954e2a0`). Two setup commits already
landed before this audit was written:

- `4f3321f`: got SDK 52 installing and bundling.
- `c9ae1f7`: upgraded to Expo SDK 57 so Expo Go can open the project.

Each finding says whether it's already fixed, fixed in Phase 2, or left for Phase 3.

**How things were checked.** I didn't run anything on a phone; there's no device or
simulator in this environment. Each claim below comes from one of these sources:

- **Types:** the TypeScript definitions shipped inside each package. For SDK 52 I
  downloaded `expo-camera@16.0.18`, `expo-location@18.0.10`,
  `expo-media-library@17.0.6` and `expo-crypto@14.0.2`. For SDK 57 I used the
  installed `node_modules`.
- **Docs:** Expo's own documentation source for SDK 57, read from
  `github.com/expo/expo/docs/pages/versions/v57.0.0/sdk/*.mdx`. `docs.expo.dev` is
  blocked by this environment's network proxy. The GitHub copy is the same content.
- **Native code:** the native Swift/Kotlin sources in `node_modules`, where the
  types don't say how something behaves.
- **Versions:** `expo/bundledNativeModules.json`, the version table `npx expo install`
  uses. `expo install --check` could only run in offline mode, because Expo's
  version API is blocked by the proxy too.

---

## Verdict

The screens are a reasonable sketch, and most API calls were close to right. But it
had four kinds of problem:

- **It didn't run.** It wouldn't bundle, because of a missing dependency.
- **It would have broken on the current SDK.** The camera-roll save throws at
  runtime on SDK 57.
- **The trust model is broken.** Anyone with the app can forge a proof, because the
  server trusts whatever timestamp the phone sends.
- **Two failure paths make honest players look like cheaters.** A failed save still
  says "Saved", and a network error shows up as "no clip with that code".

---

## 1. Dependencies

| Finding | Status |
|---|---|
| `react-native` pinned to `0.76.5`; SDK 52 expects `0.76.9`. | Fixed `4f3321f` |
| `lib/stamp.ts` calls `require("expo-crypto")`, but `expo-crypto` wasn't in `package.json`. Metro resolves `require()` when it builds the bundle, so this fails the whole build. It isn't a runtime fallback. I added the package before the first bundle attempt, so I didn't watch this particular error happen; the "Metro resolves `require()` at build time" part is how Metro works. | Fixed `4f3321f` |
| `expo-asset` missing. `expo start` refused to launch: `The required package expo-asset cannot be found`. (Observed.) | Fixed `4f3321f` |
| On SDK 52, `expo-router@4.0.22` imports `query-string` without declaring it. npm resolved `@react-navigation/core` to 7.22, which no longer depends on it, so bundling failed: `Unable to resolve module query-string`. (Observed.) | Fixed `4f3321f`; went away with SDK 57 |
| SDK 52 was five major versions behind the current SDK 57. The store version of Expo Go only runs the latest SDK, so the QR-scan flow in the README couldn't work. | Fixed `c9ae1f7` |
| On SDK 57, the three packages `react-dom`, `react-native-worklets` and `react-native-reanimated` must be listed directly. Otherwise npm picks versions outside SDK 57's supported range (`react-dom@19.3.0` against `react@19.2.3`: ERESOLVE). | Fixed `c9ae1f7` |
| `.env.example` referenced by the README didn't exist. There was no `.gitignore` either, so `node_modules` and `.env` would get committed. | Fixed `4f3321f` |

**Now:** `expo install --check` (offline) reports all dependencies match SDK 57, and
`npm ci` is clean.

## 2. The APIs you asked about

### `CameraView` video recording (`mode="video"`, `recordAsync({ maxDuration })`, `stopRecording()`)
**Correct**, on both SDK 52 and SDK 57:

- `mode` is a `CameraView` prop.
- `recordAsync(options?: CameraRecordingOptions)` resolves to `{ uri } | undefined`.
  It resolves when `stopRecording()` is called, when `maxDuration` is hit, or when
  the preview stops.
- `maxDuration` is in seconds.
- Calling `stopRecording()` and letting the pending `recordAsync` resolve is the
  documented pattern.

**Problems around it:**

- **Children inside `CameraView`.** In SDK 57, `CameraView` logs *"The `<CameraView>`
  component does not support children. This may lead to inconsistent behaviour or
  crashes. If you want to render content on top of the Camera, consider using
  absolute positioning."* (`expo-camera/build/CameraView.js`). The stamp overlay and
  the shutter bar were both children. → **Phase 2**
- **Recording before the camera is ready.** The shutter works before `onCameraReady`
  has fired, and recording at that point can reject. The shutter should stay
  disabled until the camera is ready. → **Phase 2**
- **Permanently denied camera/mic.** The "Allow" button just calls `request*()`
  again. Once the OS stops showing the prompt (`canAskAgain === false`), the button
  does nothing, and the user is stuck with no path to Settings. → **Phase 2**
- **Loading shown as "denied".** While permissions are still loading
  (`camPerm === null`), the "needs the camera" screen flashes up. → **Phase 2**

### `videoStabilizationMode="standard"`
- **Valid** value (`'off' | 'standard' | 'cinematic' | 'auto'`).
- **On SDK 52 it was iOS-only** (`@platform ios` in `expo-camera@16.0.18`), so
  Android users got no stabilization. On SDK 57 it's supported on both. Per the
  types, "On Android, `standard`, `cinematic`, and `auto` all enable video
  stabilization… The specific stabilization method is determined by the device."
  The prop is wired up natively on both platforms (`CameraViewModule.kt`,
  `CameraViewModule.swift`).
- **The README oversells it.** Stabilization smooths hand shake and slow drift. It
  won't rescue a loose mount rattling on a gun that's being pumped. That's what the
  Phase 3 shake warning is for.

### `Location.reverseGeocodeAsync(pos.coords)`
- **Correct.** It takes `Pick<LocationGeocodedLocation, 'latitude' | 'longitude'>`,
  and `pos.coords` has both fields.
- **The result fields you read exist:** `city: string | null` and
  `region: string | null`, on SDK 52 and 57.
- **Privacy caveat, for the README's claim.** Only the city/region string goes to
  *your* server; that part is true. But reverse geocoding is done by the OS
  geocoder: Apple on iOS, the device's Geocoder service (usually Google's) on
  Android. So the rough coordinates do go to Apple or Google for the lookup. The
  README should say this plainly. `Accuracy.Low` keeps the fix coarse, which helps.

### `MediaLibrary.saveToLibraryAsync(uri)`
- **SDK 52: correct.** It existed. On iOS 11+ it worked without full photo
  permission as long as `NSPhotoLibraryAddUsageDescription` was set, which
  `app.json` does.
- **SDK 57: throws at runtime.** `expo-media-library/build/legacyWarnings.d.ts`:
  *"@deprecated Use `Asset.create()` … This method will throw in runtime."* It still
  compiles, so TypeScript never warns you.
- **Fixed in `c9ae1f7`:** now `MediaLibrary.requestPermissionsAsync(true)`
  (write-only) and then `MediaLibrary.Asset.create(uri)`. Write-only is enough on
  iOS: the native `create` checks `checkIfWritePermissionGranted()`
  (`ios/next/MediaLibraryNextModule.swift`).

### `(globalThis.crypto ?? require("expo-crypto")).getRandomValues(bytes)`
- **Randomness quality is fine.** `expo-crypto`'s `getRandomValues` exists on both
  SDKs and uses the OS secure RNG. `b % 32` over a byte has no modulo bias, because
  256 is an exact multiple of 32.
- **But it's written defensively for the wrong reason.** Expo's runtime polyfills
  don't install a `crypto` global (checked `expo/src/winter`), and whether Hermes
  provides one depends on the version. So in practice this always falls through to
  `require`, which returns `any` and switches off type checking on that line. →
  **Phase 2:** import `getRandomValues` from `expo-crypto` directly.
- **Code space:** 6 characters × 5 bits = 30 bits, about 1.07 billion codes. That's
  fine against guessing, *as long as* the table can't be listed. See §4.

## 3. TypeScript (strict)

- **`tsc --noEmit` passes** in strict mode, on the original code (SDK 52, after the
  dependency fixes) and on SDK 57.
- **Passing overstates how safe the code is:**
  - The `require("expo-crypto")` call is untyped (`any`).
  - `verify.tsx` has `useState<any>(null)` for the looked-up row. That's why
    `row.created_at` compiles even though nothing guarantees it exists.
  - The `saveToLibraryAsync` call compiled fine on SDK 57 and would still have
    crashed.

  → **Phase 2:** type the Supabase row and remove the `any` casts.

## 4. Things that crash, or quietly do the wrong thing

In rough order of how much they'd hurt in a real game:

1. **Anyone can forge a proof** (`supabase/schema.sql`). The insert policy is
   `with check (true)`, and `created_at` comes from the phone. The anon key ships
   inside the app, so anyone can pull it out and insert any code with any time and
   city. Filming a clip tomorrow and registering it as "yesterday, 4:12 pm" is one
   HTTP request. → **Phase 2:** the server sets `created_at = now()` and ignores
   what the client sends.
2. **Anyone can download every proof.** The select policy is `using (true)`, so
   `select *` returns every code, time and city. That's a location history of every
   elimination, and a list of valid codes to paint onto fake footage. → **Phase 2:**
   remove direct table reads. Verification goes through a `verify_proof(code)`
   function that returns at most one row.
3. **"Saved" when the proof wasn't registered.** `saveProof` returns `false` when
   Supabase isn't configured, when there's no signal (common outdoors), or on a
   duplicate code. `record.tsx` ignores the return value and tells the player
   "Saved HX7-42K" anyway. The host then checks the code, gets "no clip", and an
   honest player looks like a cheater. → **Phase 2:** report the failure. The Phase
   3 share flow then adds a retry.
4. **A network error reads as "not a real clip".** `lookupProof` returns `null` for
   "not found", "network error" and "Supabase not configured" alike. `verify.tsx`
   shows *"No clip with that code… wasn't filmed with Splashy Cam"* for all three.
   If the request throws, the screen stays on "Checking…" forever. → **Phase 2:**
   separate not-found from error; Phase 3 redesigns the screen.
5. **Camera-roll save throws on SDK 57.** Fixed `c9ae1f7`; see §2.
6. **Children inside `CameraView`**, the recorder before `onCameraReady`, and the
   permission dead-end. See §2. → **Phase 2**
7. **Recording failure paths.** Any failure (recording, camera-roll save) shows the
   raw `String(e)` in an alert titled "Recording failed", even when the recording
   itself succeeded and only the save failed. The clip is then lost from the user's
   point of view, even though it's still in the cache. → **Phase 2**
8. **The time on the stamp isn't the time the server records.** The stamp shows the
   phone clock when recording started. The server row (after fix 1) is when the
   upload happened. A player with a wrong phone clock shows a different time on
   screen than in verification. The server time is the one to trust; verification
   should show only that. → **Phase 2:** `saveProof` returns the server's
   timestamp.
9. **`verifyUrl()` is unused and points at `splashycam.app`.** I can't confirm you
   own that domain. Leave it out of anything shareable until you do. → removed in
   Phase 2.
10. **`app.json` iOS location permission.** It configures
    `locationAlwaysAndWhenInUsePermission`, which asks for *background* location
    wording. The app only needs when-in-use. → **Phase 2:** use
    `locationWhenInUsePermission`.

## 5. The core product gap (stamp not in the video)

The stamp is only drawn over the preview, so the saved clip has no code in it. The
README already says this. What it doesn't say: **even once the stamp is burned in,
the code proves only that *a* clip was registered at a time, not that *this* clip is
that clip.** Someone could copy a real code onto different footage. Closing that
gap would mean sending something derived from the video (such as a hash) to the
server. That conflicts with your rule that only code, time and city leave the phone,
so this audit doesn't propose it. That's a product decision for you.

Options and the recommendation for burning the stamp in are in §7, written during
Phase 3.

## 6. Design

It currently looks like a wireframe:

- Several unrelated blues and greys.
- A system-font stamp with no backing plate, which gets lost over bright footage.
- An empty shutter button.
- Default alerts for results.
- No designed states for loading, no signal, or no Supabase config.

Addressed in Phase 3.

---

## Phase 2: what was fixed

**Checked after the fixes:**

- `npx tsc --noEmit` is clean in strict mode.
- `expo install --check` reports all dependencies match SDK 57.
- `expo start` serves both the Android bundle (1,543 modules) and the iOS bundle
  (1,380 modules).
- The schema was run against a local PostgreSQL 16, not a live Supabase project. It
  passed on three runs: upgrading from the old schema, a fresh database, and running
  the file twice. I tested each behavior as the `anon` role:
  - Register a code and verify it: works.
  - Unknown code: returns 0 rows.
  - Direct `select` and direct `insert` with a backdated time: both refused with
    permission denied.
  - Duplicate code, bad code characters, and an 81-character place: all rejected.
- **Not checked on a device.**

| # | Finding | Fix |
|---|---|---|
| §4.1 | Proofs forgeable | `register_proof(code, place)` is the only write path, and it runs with elevated rights. The server sets `created_at`; the client can't send one. Codes must match the 6-character alphabet, and `place` is capped at 80 characters. |
| §4.2 | Table listable | Anon has no table privileges. `verify_proof(code)` returns at most one row. |
| §4.3 | "Saved" when not registered | `saveProof` returns a typed result: `unconfigured`, `offline`, `duplicate` or `error`, each with its own message. It has a 10-second timeout. |
| §4.4 | Network error shown as "not real" | `lookupProof` returns `found`, `not_found`, `unconfigured` or `error`, and the verify screen says which. It has the same timeout, so it can't hang on "Checking…". |
| §4.6 | `CameraView` children | Stamp and controls are now siblings, absolutely positioned. |
| §4.6 | Recording before ready | Shutter disabled until `onCameraReady`. `onMountError` is handled. |
| §4.6 | Permission dead-end | When `canAskAgain` is false, the button reads "Open Settings" and calls `Linking.openSettings()`. A spinner shows while permissions load. |
| §4.7 | Failure paths | A failed recording, a failed camera-roll save and a failed registration are reported separately. A failed save still lets you share the clip. |
| §4.8 | Stamp time vs server time | The verify screen shows the **server's** registration time, labelled "Registered". |
| §4.9 | `verifyUrl()` | Removed. |
| §4.10 | Location permission | iOS: when-in-use only. The "Always" strings are set to `false`, and `NSLocationDefaultAccuracyReduced` is set so iOS gives approximate location by default. Android: `ACCESS_FINE_LOCATION` is blocked, leaving coarse only. |
| §2 crypto | `require("expo-crypto")` returning `any` | Typed import: `import { getRandomValues } from "expo-crypto"`. |
| §3 | `any` in verify | Typed union state; no `any` left in app code. |
| — | Media permissions | `expo-media-library` plugin: `photosPermission: false` (the app never reads the library) and `granularPermissions: []`, so no `READ_MEDIA_*` in the Android manifest. Saving uses write-only access, which on Android 13+ asks for no media permissions. That's also why it works in Expo Go: `SystemPermissionsDelegate.kt` only refuses photo and video *read* access there. |
| — | Code entry | `normalizeCode()` accepts lower case, spaces and dashes. It also maps the look-alikes O→0 and I/L→1, since those letters aren't in the alphabet. |

**Action for you: re-run `supabase/schema.sql` in the Supabase SQL editor.** It's
safe on an existing `proofs` table. It drops the old open policies and adds the two
functions. Until you do, the app's calls to `register_proof` and `verify_proof` will
fail, and the app will report "error".
