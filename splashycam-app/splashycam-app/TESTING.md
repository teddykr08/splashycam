# Testing Splashy Cam on an iPhone with Expo Go

About 20 minutes. Do the steps in order; later steps use the clip from earlier ones.
Each step says what to tap and what you should see. **If you see something
different, note the step number.** That's the bug report.

Nothing here has been run on a phone yet. This checklist is how we find out.

---

## What won't work in Expo Go (expected, not bugs)

| | Why |
|---|---|
| **The stamp isn't in the saved video** | The burn-in module is native code, and Expo Go can't load it. The proof card carries the stamp instead. You won't see a "Stamping the video…" row. |
| **Permission prompts say "Expo Go", not "Splashy Cam"** | Expo Go shows its own wording. The Splashy Cam wording only appears in a real build. |
| **iOS Settings: look under Expo Go** | Camera, mic, location and photos permissions belong to Expo Go while testing. |
| **Location prompt shows "Precise: On"** | The "approximate by default" setting only applies in a real build. The app still only keeps the city. |
| **No vibration while filming** | iOS turns the Taptic Engine off while the camera is running. The shake warning is on-screen only. This is the same in a real build. |

---

## 0. Before you start (on your computer)

1. In the Supabase SQL editor, run `supabase/schema.sql`. It's safe to re-run.
2. Copy `.env.example` to `.env` and fill in the Supabase URL and anon key.
3. Run `npm install`, then `npx expo start`.
4. On the iPhone, install or update **Expo Go** from the App Store.
5. Put the iPhone on the same Wi-Fi as the computer.
6. Point the iPhone's **Camera app** at the QR code in the terminal and tap the
   banner. It opens in Expo Go.

- **"Project is incompatible with this version of Expo Go"** → update Expo Go.
- **It can't connect** → stop the server and run `npx expo start --tunnel`.
- **You edited `.env`** → restart with `npx expo start --clear`.

## 1. Home screen

**See:**
- the blue "SENIOR ASSASSIN · TIMESTAMPED PROOF" line;
- the big "Splashy Cam" title;
- a sample stamp showing `HX7-42K`;
- a big blue **Record an elimination** button and a **Check a code** button.

**If you see a banner starting "Not connected to a server"**, the `.env` values
aren't loaded. Filming still works, but registration and checking won't. Fix
`.env`, restart with `--clear`, and reopen.

## 2. Permissions (first run only)

1. Tap **Record an elimination**.
   **See:** "Camera and mic" with an **Allow camera and mic** button.
2. Tap **Allow camera and mic**.
   **See:** the iOS camera prompt, then the microphone prompt. Allow both.
3. **See:** the camera preview, then the iOS location prompt. Choose **Allow While
   Using App**. The location prompt should appear only *after* the camera one.
4. **See:**
   - a dark stamp plate, bottom-left, reading `SPLASHY CAM`, a code, a clock that
     ticks every second, and `LOCATING…`;
   - after a few seconds, `LOCATING…` becomes your city in capitals.

**If you denied location:** the stamp has no city line, and above the shutter it
says "No city on the stamp: location is off." That's correct.

## 3. Film a clip

1. Point at something, then tap the big round shutter.
2. **See:**
   - a small **red dot pulsing** next to `REC 00:01`, counting up, at the top;
   - the shutter ring turns blue with a white square in the middle;
   - the close ✕ disappears;
   - "Tap to stop" under the shutter.
3. After 5–10 seconds, tap the shutter again to stop.
4. **See:** the share screen, with the clip playing silently on a loop.

## 4. Shake warning

1. Tap **Done** to go home, then tap **Record an elimination** again.
2. Start recording. Hold the phone still for 3 seconds.
   **See:** no warning.
3. Shake the phone hard, or rap on the mount, for 2 seconds.
   **See:** a blue banner, **TIGHTEN THE DIAL**, "The mount is rattling. This shot
   will be shaky.", within about half a second.
4. Hold still again.
   **See:** the banner disappears within 1–2 seconds.
5. Stop recording.
   **See:** on the share screen, a note: "The mount was rattling during this
   clip. Tighten the dial before the next one."

**Tell me:**
- whether ordinary handheld wobble sets the warning off (too sensitive);
- whether a genuinely loose mount doesn't set it off (not sensitive enough).

The thresholds are guesses until this test.

## 5. Share screen (use the clip from step 4)

Check from top to bottom:

1. **Code:** a large code like `HX7-42K`. Tap **Copy**.
   **See:** it changes to "Copied".
2. **Camera roll:** "Saving to camera roll…", then an iOS prompt to add to
   Photos. Allow it.
   **See:** "Saved to camera roll". Open the Photos app later to confirm the clip
   is there, **without** a stamp. That's expected in Expo Go.
3. **Registration:** "Registering code…", then **Code registered**, "Server time
   … Your host can look it up now."
4. **Proof card:** a card with a frame from your clip, the stamp drawn on it,
   `TIMESTAMPED PROOF`, the code in large type, and FILMED / REGISTERED / NEAR
   rows.
5. **Frames:** tap each of the four small frames.
   **See:** the card's picture change, with the selected frame outlined in blue.

## 6. Sending

1. Tap **Send clip**.
   **See:** the iOS share sheet with the video: Messages, AirDrop, TikTok if it's
   installed, Save Video. Send it to yourself in Messages.
2. Tap **Proof card**.
   **See:** the share sheet with a PNG image. Save it, or send it to yourself.
   **Check:** the image is sharp and the code is readable.
3. Tap **Text host**.
   **See:** Messages opens a new message: "Splashy Cam proof: HX7-42K. Check it in
   Splashy Cam → Check a code." It has **no video attached**. That's expected; the
   video goes through Send clip.
4. Tap **Done**.
   **See:** the home screen.

## 7. Checking a code

1. Tap **Check a code**.
   **See:** six empty boxes with a dash in the middle, and the keyboard up.
2. Type the code from step 5. You can type it in lower case and leave out the dash.
   **See:** "Checking…" as soon as the sixth character goes in, then a solid blue
   panel:
   - **REGISTERED**, with the code;
   - the registration time and "x min ago";
   - your city;
   - the note that this shows when the clip was registered, not that the footage
     is original.
3. Tap **Clear**, then type `ABC123`.
   **See:** an outlined **NOT FOUND** panel.
4. Tap **Clear**. Copy the Text host message from step 6.3, then tap **Paste**.
   **See:** an iOS "Allow Paste" prompt. Allow it, and the code fills in from the
   whole message.
   - If you tap **Don't Allow**: "No code on the clipboard, or pasting wasn't
     allowed."

## 8. No signal

1. Turn on **Airplane Mode**.
2. Go to **Check a code** and enter your code.
   **See:** **Couldn't check**, "No connection to the server. This says nothing
   about the clip.", and a **Try again** button. It must **not** say NOT FOUND.
3. Go home and record a short clip, still in Airplane Mode.
   **See:** on the share screen, **Waiting for signal**, "The code is saved on your
   phone…", and a **Retry** button. The camera roll save should still work.
4. Tap **Done**.
   **See:** the home banner "1 code is waiting for signal."
5. Turn Airplane Mode off. Tap **Check a code**, then go back home.
   **See:** the banner disappears. Checking that clip's code now shows REGISTERED.
   The time is when it registered, not when it was filmed; that's by design.

## 9. Permission turned off

1. Open iOS Settings, go to **Expo Go**, and turn **Camera** off.
2. Back in Expo Go, tap **Record an elimination**.
   **See:** **Camera is switched off**, "iOS won't ask again. In Settings, open Expo
   Go and turn on Camera and Microphone.", and an **Open Settings** button.
3. Tap **Open Settings**.
   **See:** Expo Go's page in Settings. Turn Camera back on.

---

## Reporting back

For anything that didn't match, send:

- the step number;
- what you saw, with a screenshot if you can;
- any red or yellow error box Expo Go showed.

Red error boxes are crashes. Those matter most.
