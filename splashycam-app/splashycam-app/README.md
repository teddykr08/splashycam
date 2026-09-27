# Splashy Cam — app

Film an elimination, get a timestamped proof, send it to the host.

Built with Expo (React Native) so it runs on iOS and Android from one codebase and
builds in the cloud — **no Mac required**.

---

## What a code proves, and what it doesn't

Every clip gets a random six-character code. The server records when that code was
registered, and in which city.

- **It proves** that a clip carrying this code was registered through Splashy Cam
  at that time. The server sets the time, so the phone can't backdate it.
- **It doesn't prove** that the footage is original or unedited. Someone could copy
  a real code onto different footage. The code is a timestamped proof, not a
  tamper seal.

Hosts should check that the code on the clip or proof card matches, and that the
registration time fits the game. Describe it that way in anything you publish.

---

## What it does today

- **Record** — full-screen camera with a camcorder stamp on the preview: code, a
  live ticking time, and city. A pulsing red REC light shows while filming, and a
  "TIGHTEN THE DIAL" warning appears if the mount rattles.
- **Proof card** — after filming, pick a frame and get a PNG with the stamp drawn
  on it. In Expo Go this is how the stamp reaches the host.
- **Send** — the clip goes to the camera roll. One tap opens the share sheet
  (Messages, TikTok…), one sends the proof card, and one texts the code.
- **Check a code** — type or paste a code for a clear registered / not found
  result, with the server's registration time and the city.
- **Privacy** — the video never leaves the phone. The server stores three things:
  code, timestamp, city. No accounts, no address, no upload costs. (Turning the
  rough location into a city name uses the phone's built-in geocoder: Apple's on
  iOS, the device's, usually Google's, on Android. So Apple or Google sees the
  rough coordinates. Our server never does.)

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
cp .env.example .env          # fill in Supabase values
npx expo start                # scan the QR with your iPhone camera; opens in Expo Go

npm run typecheck             # strict TypeScript, app + tests
npm test                      # code-entry and shake-detection tests
```

### Supabase

Run `supabase/schema.sql` in the SQL editor (safe to re-run). It makes one table,
`proofs`, that the app can't touch directly. The app goes through two functions:
`register_proof`, where the server sets the timestamp so it can't be backdated,
and `verify_proof`, which looks up one code, so nobody can download the whole list.

Put the project URL and anon key in `.env`.

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
app/_layout.tsx     navigation
app/index.tsx       home
app/record.tsx      camera, live stamp, REC light, shake warning
app/clip.tsx        after filming: play, stamp (native builds), save, register, proof card, send
app/verify.tsx      code lookup
components/         button, stamp, proof card, state notes
lib/theme.ts        colors, type, spacing, touch sizes
lib/code.ts         code format/entry helpers (pure, tested)
lib/stamp.ts        code generation
lib/shake.ts        shake detection (pure, tested); useShake.ts wires the sensor
lib/pending.ts      offline queue for codes that couldn't register yet
lib/proof.ts        frame grabs + proof card rendering
lib/env.ts          Expo Go detection
lib/supabase.ts     the tiny bit of server we use
modules/stamp-video native burn-in (untested; see its README)
supabase/schema.sql one table, two functions
eas.json            EAS build profiles (preview = internal install, production = stores)
tests/              node:test unit tests
```

## Not built yet

- A tested burn-in: the code is written but unproven (see above)
- Front + back camera at once — needs a native module, not in Expo's camera
- Host dashboard for reviewing a game's clips
- Affiliate codes / shop
