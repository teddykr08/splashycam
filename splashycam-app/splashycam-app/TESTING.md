# Testing Splashy Cam on an iPhone with Expo Go

About 15 minutes. Do the steps in order; later steps use the clip from earlier ones.
Each step says what to tap and what you should see. **If something's different,
note the step number.**

**This version has no backend.** Codes are made on the phone and stay on the phone.

---

## What's expected to be missing in Expo Go (not bugs)

| | Why |
|---|---|
| **The front camera doesn't record** | Recording both cameras needs native code (`modules/dual-camera`). In Expo Go the top half is a **FRONT CAM** panel, and only the back camera (bottom half) records. |
| **Trimming doesn't cut the file** | Nothing in Expo Go can cut video. You still pick the part to keep, and the preview and proof card use it, but the whole recording is saved and sent. The share screen says so. |
| **The stamp isn't in the saved video** | Same reason: native code. The proof card carries the stamp. |
| **Permission prompts say "Expo Go"** | Expo Go shows its own wording. |
| **iOS Settings: look under Expo Go** | Permissions belong to Expo Go while testing. |
| **A floating Expo Go button or menu** | That's Expo Go's developer menu, not ours. |

---

## 0. Start it (on your computer)

From `splashycam-app/splashycam-app`, run:

```bash
npm install
npx expo start --clear
```

Scan the QR code with the iPhone Camera app. If it won't connect, use
`npx expo start --tunnel --clear` instead.

## 1. Home

**See:** the **Splashy Cam** title with a blue drop, a sample stamp, and one big
**Record an elimination** button.

## 2. Permissions (first run only)

1. Tap **Record an elimination**, then **Allow camera and mic**. Allow both prompts.
2. Then allow location: **Allow While Using App**.

## 3. The camera screen

**See:**
- **Top left:** ✕.
- **Top centre:** the **SPLASHY CAM** pill.
- **Top half:** a dark panel reading **FRONT CAM** and "Needs the full app". That's
  where the front camera goes in the full build.
- **Bottom half:** the live back camera.
- **Bottom left:** the stamp. It has a code, a ticking clock, and `LOCATING…`, which
  becomes your city. The code must not move or change.
- **Bottom:** the shutter, with **no flip button** and **no timer or "60s" anywhere**.

## 4. Record past a minute

1. Tap the shutter.
   **See:**
   - the code stays the same;
   - a red pulsing dot with `REC 00:01` counting up;
   - the FRONT CAM panel says "Not recording".
2. Let it run for **about 1:30**, then tap again. **It must not stop by itself at 60
   seconds.**
3. **See:** the trim screen.

## 5. Trim

**See:**
- the clip playing silently, looping only the selected part;
- "PICK THE PART TO KEEP", with a big time `1:00` and "0:30 – 1:30 of 1:30". **The
  default is the last 60 seconds.**
- a strip of frames with a blue frame around the selected part, with handles at each
  end, and the rest dimmed;
- a note that Expo Go keeps the whole recording;
- **Undo** (greyed out) and **Use this part**.

**Try:**
1. **Drag the left handle right.**
   **See:** the time shrink, and the preview loop only the new part.
2. **Drag the middle of the selection.**
   **See:** the whole selection slides, keeping its length.
3. **Drag the left handle all the way left.**
   **See:**
   - the frame turns **white**;
   - the time shows about 1:30;
   - a line saying how much too long it is;
   - the button reads **Too long** and does nothing.
4. **Tap Undo** until it's back under a minute.
   **See:** each tap steps back one drag, and the button returns to **Use this part**.
5. **Tap Use this part.**

**Also try:** record a clip of **10 seconds** or less.
**See:** the whole clip selected, with the button ready straight away.

## 6. Share screen

**See, top to bottom:**
- a header with ✕ and the wordmark;
- the clip, looping only the part you picked;
- **PROOF CODE**, with **Copy**;
- **Kept: 0:xx – 0:yy**, with a note that this test build saves and sends the whole
  recording;
- **Saved to camera roll**, after a Photos prompt;
- the proof card. Its frames come from the part you picked, and FILMED shows the
  time of the frame shown;
- **two buttons: Send clip** and **Share proof card**.

**Then:**
1. Tap **Send clip**.
   **See:** the share sheet with the video.
2. Tap **Share proof card**.
   **See:** the share sheet with the image, including Save Image.
3. Tap **✕**.
   **See:** home.

## 7. Permission switched off

1. In iOS Settings, go to **Expo Go** and turn **Camera** off.
2. Tap **Record an elimination**.
   **See:** **Camera is switched off**, with **Open Settings**.
3. Turn Camera back on.

---

## Reporting back

For anything that didn't match, send the step number, what you saw (a screenshot if
you can), and any red error box. Red boxes are crashes; those matter most.
