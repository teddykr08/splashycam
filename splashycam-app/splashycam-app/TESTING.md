# Testing Splashy Cam on an iPhone with Expo Go

About 15 minutes. Do the steps in order; later steps use the clip from earlier ones.
Each step says what to tap and what you should see. **If something's different,
note the step number.**

**This version has no backend.** Codes are made on the phone and stay on the
phone. There's nothing to register and no "Check a code" screen.

---

## What's expected to be missing in Expo Go (not bugs)

| | Why |
|---|---|
| **The stamp isn't in the saved video** | The burn-in module is native code, and Expo Go can't load it. The proof card carries the stamp. |
| **Front + back at the same time** | Also a native-build feature (`modules/dual-camera`). In Expo Go you can flip between front and back, but not record both. |
| **Permission prompts say "Expo Go"** | Expo Go shows its own wording. The Splashy Cam wording appears in a real build. |
| **iOS Settings: look under Expo Go** | Permissions belong to Expo Go while testing. |
| **A floating Expo Go button or menu** | That's Expo Go's developer menu, not ours. It isn't in a real build. |
| **No vibration while filming** | iOS turns the Taptic Engine off while the camera runs. The shake warning is on-screen. |

---

## 0. Start it (on your computer)

1. From `splashycam-app/splashycam-app`, run `npm install`, then `npx expo start`.
   No `.env` is needed.
2. Put the iPhone on the same Wi-Fi as the computer.
3. Scan the QR code with the iPhone Camera app. It opens in Expo Go.

If it won't connect, run `npx expo start --tunnel` instead. If it says "Project is
incompatible", update Expo Go.

## 1. Home

**See:**
- the small blue "SENIOR ASSASSIN · TIMESTAMPED PROOF" line;
- the **Splashy Cam** title with a blue water drop in front;
- a sample stamp;
- one big **Record an elimination** button;
- at the bottom: "Clips and codes stay on your phone. Nothing is uploaded."

## 2. Permissions (first run only)

1. Tap **Record an elimination**, then **Allow camera and mic**. Allow both iOS
   prompts.
2. The camera opens. Then the location prompt appears. Choose **Allow While Using
   App**.

## 3. The camera screen, before filming

**See:**
- **Top left:** ✕ (close).
- **Top centre:** a dark pill with a blue drop and **SPLASHY CAM**.
- **Top right: nothing.** No "60s" any more. If there's a control there, it's
  Expo Go's; tell me what it looks like.
- **Bottom left:** the stamp. It shows `SPLASHY CAM`, a code like `HX7-42K`, a
  clock ticking every second, and `LOCATING…`, which turns into your city.
- **Bottom:** the big shutter in the middle and a **flip** button on the right.

**Check that the code is locked:**
- Watch the code for 10 seconds. It must not move or change.
- It must also stay put while `LOCATING…` becomes your city.

If you denied location, the stamp says `NO CITY` and the line under the shutter
mentions it. The stamp still shouldn't move.

## 4. Flip

1. Tap the flip button.
   **See:** the front camera. The stamp and code stay exactly where they were.
2. Tap it again.
   **See:** back to the rear camera.

## 5. Film a clip

1. Note the code on the stamp, then tap the shutter.
2. **See:**
   - **the code does not change;**
   - a red dot pulsing next to `REC 00:01`, where the SPLASHY CAM pill was;
   - the ✕ and the flip button disappear;
   - the shutter turns blue with a white square.
3. **Countdown:** let it run past 50 seconds.
   **See:** `10s`, `9s`, … appear top-right. At 60 seconds recording stops by
   itself. (For a quicker test, just stop at any time with the shutter.)
4. **See:** the share screen, with the clip playing silently on a loop.

## 6. Shake warning

1. Tap ✕ to go home, then start another recording.
2. Hold still: no warning.
3. Shake the phone hard, or rap on the mount.
   **See:** **TIGHTEN THE DIAL** within about half a second.
4. Hold still again.
   **See:** the banner clears within 1–2 seconds.
5. Stop recording.
   **See:** the share screen notes the mount was rattling.

**Tell me** if normal handheld wobble sets it off, or if a loose mount doesn't.

## 7. Share screen

**See, top to bottom:**
- a header with ✕ on the left and the **SPLASHY CAM** wordmark in the middle;
- the clip playing;
- **PROOF CODE**, the same code as on the stamp, with **Copy**;
- "Saving to camera roll…", then a Photos prompt (allow it), then **Saved to
  camera roll**;
- the proof card: the frame, the stamp, "SPLASHY CAM · TIMESTAMPED PROOF", the big
  code, FILMED and NEAR, and "Filmed with Splashy Cam";
- four frames to choose from;
- at the bottom, **exactly two buttons: Send clip** and **Share proof card**.

**Then:**
1. Tap **Send clip**.
   **See:** the share sheet with the video (Messages, TikTok, Save Video, …).
2. Tap **Share proof card**.
   **See:** the share sheet with the image. **Save Image** and every sending option
   are in there.
3. Tap **✕**.
   **See:** home.

## 8. Permission switched off

1. In iOS Settings, go to **Expo Go** and turn **Camera** off.
2. Back in the app, tap **Record an elimination**.
   **See:** **Camera is switched off**, with an **Open Settings** button that goes
   to Expo Go's page.
3. Turn Camera back on.

---

## Reporting back

For anything that didn't match, send:

- the step number;
- what you saw, with a screenshot if you can;
- any red error box. Red boxes are crashes; those matter most.
