# Splashy Cam — app

Film an elimination, get a timestamped proof, send it to the host.

Built with Expo (React Native) so it runs on iOS and Android from one codebase and
builds in the cloud — **no Mac required**.

---

## What a code proves right now, and what it doesn't

**There's no backend at the moment.** Every clip gets a random six-character code
that's made on the phone and never leaves it. The time on the stamp comes from the
phone's clock.

- **It does:** tie a clip to its proof card. The same code is on the stamp, on the
  card, and on the share screen, so a host can match a card to a clip.
- **It doesn't prove when the clip was filmed.** A phone's clock can be changed in
  Settings, and nothing independent records the time.
- **It doesn't prove the footage is original** either. A code could be copied onto
  other footage.

So for now it's a **timestamped proof in the plain sense**: a stamp with a time on
it, not a verified record. The server version (kept in `later/`) adds a
registration time the phone can't fake. It still won't prove footage is original.
Describe it this way in anything you publish.

---

## What it does today

- **Record** — full-screen camera with a camcorder stamp on the preview: code, a
  live ticking time, and city. A pulsing red REC light shows while filming. No
  length limit.
- **Dual camera** (full build only) — front camera on the top half, back camera on
  the bottom half, recorded as one video. In Expo Go the back camera runs in the
  bottom half, and the top half is a FRONT CAM panel saying it needs the full app.
- **Trim** — after stopping, pick the part to keep: up to 60 s, defaulting to the
  last 60 s. Drag handles on a timeline, with undo. The cut itself happens in the
  full build; Expo Go keeps the whole recording and says so.
- **Proof card** — after filming, pick a frame and get a PNG with the stamp drawn
  on it. In Expo Go this is how the stamp reaches the host.
- **Send** — the clip goes to the camera roll. Two buttons: **Send clip** and
  **Share proof card**. Both open the normal share sheet (Messages, TikTok, Save…).
- **Privacy** — nothing is uploaded: no video, no code, no location. (Turning the
  rough location into a city name uses the phone's built-in geocoder: Apple's on
  iOS, the device's, usually Google's, on Android. So Apple or Google sees the
  rough coordinates.)

**Read AUDIT.md.** It covers what was checked, what was fixed, and what still
needs a real phone. **Read TESTING.md** before trying it on your phone.

## The stamp in the video file

In Expo Go, the stamp is drawn over the camera preview and onto the proof card,
**not** into the saved video.

A native module that burns the stamp into the video is written in
`modules/stamp-video/`, but it has **never been compiled or run**. It only loads
in a real build (EAS), never in Expo Go. When it isn't there, or it fails, the app
sends the original clip with the proof card and says so. Read
`modules/stamp-video/README.md` before relying on it.

---

## Setup

```bash
npm install
npx expo start                # scan the QR with your iPhone camera; opens in Expo Go

npm run typecheck             # strict TypeScript, app + tests
npm test                      # code-format and trim-selection tests
```

### Server: later

There's no backend right now, and nothing reads `.env`. The Supabase schema,
client, offline queue and "Check a code" screen are kept, unused, in `later/` and
`supabase/schema.sql`. `later/README.md` says how to bring them back.

### Building a real app

See `modules/stamp-video/README.md` for the full sequence, including
`eas init`, the environment variables and device registration. In short:

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview     # builds in Expo's cloud
```

iOS builds need an Apple Developer account ($99/year) to install on your phone.
Android builds install straight from a link, no account needed — so test on
Android first if you want to move before paying Apple.

---

## Structure

```
app/_layout.tsx      navigation
app/index.tsx        home
app/record.tsx       camera, live stamp, REC light, dual camera (or its Expo Go preview)
app/trim.tsx         pick the part to keep (max 60 s), undo
app/clip.tsx         after filming: play, stamp (native builds), save, proof card, send
components/          button, wordmark, stamp, proof card, state notes
lib/theme.ts         colors, type, spacing, touch sizes
lib/code.ts          code format helpers (pure, tested)
lib/stamp.ts         code generation (on the phone)
lib/trim.ts          trim selection logic (pure, tested); useLoopRange.ts loops a player
lib/proof.ts         frame grabs + proof card rendering
lib/env.ts           Expo Go detection
modules/stamp-video  native trim + stamp burn-in (untested; see its README)
modules/dual-camera  front (top half) + back (bottom half) as one video (untested; see its README)
later/               server code kept for later, not used by the app
supabase/schema.sql  later: one table, two functions
eas.json             EAS build profiles (preview = internal install, production = stores)
tests/               node:test unit tests
```

## Not built yet

- A tested burn-in: the code is written but unproven (see above)
- A tested dual camera and trim cut: both written, neither compiled yet
- A server to register and check codes (kept in `later/`)
- Host dashboard for reviewing a game's clips
- Affiliate codes / shop
