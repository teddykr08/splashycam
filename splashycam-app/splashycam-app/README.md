# Splashy Cam — app

Film an elimination, stamp it with a code nobody can fake, send it to the host.

Built with Expo (React Native) so it runs on iOS and Android from one codebase and
builds in the cloud — **no Mac required**.

---

## What it does today

- **Record** — full-screen camera with a camcorder stamp on the preview: code, a
  live ticking time, and city. A "TIGHTEN THE DIAL" warning appears if the mount
  rattles while filming.
- **Proof card** — after filming, pick a frame and get a PNG with the stamp drawn
  on it. This is how the stamp reaches the host until it can be burned into the
  video (see AUDIT.md §7).
- **Send** — the clip goes to the camera roll. One tap opens the share sheet
  (Messages, TikTok…), one sends the proof card, and one texts the code.
- **Verify** — type or paste a code for a clear yes or no, with the server's
  registration time and the city.
- **Privacy** — the video never leaves the phone. The server stores three things:
  code, timestamp, city. No accounts, no address, no upload costs. (Turning the
  rough location into a city name uses the phone's built-in geocoder: Apple's on
  iOS, the device's, usually Google's, on Android. So Apple or Google sees the
  rough coordinates. Our server never does.)

## Known gap, read this before building

**Read AUDIT.md.** It covers what was checked, what was fixed, and what still
needs a real phone.


The stamp is drawn **over the camera preview**, not burned into the saved video
file. So the code is visible while filming but is **not** permanently in the
exported clip yet.

Three ways to close it, cheapest first:

1. **Proof card** — after recording, generate a shareable image (thumbnail + code +
   time) that goes out alongside the clip. Easy, no video processing.
2. **On-device re-encode** — overlay the text into the video with a native video
   processing library. This is the real fix. Note FFmpegKit was retired in 2025, so
   check what's current before picking a package.
3. **Server-side render** — reliable, but you're paying for uploads and compute, and
   we deliberately don't store video.

Ship 1 first. It's an afternoon. Do 2 when the product is proven.

---

## Setup

```bash
npm install
cp .env.example .env          # fill in Supabase values
npx expo start                # scan the QR with Expo Go to try it

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
app/record.tsx      camera, live stamp, shake warning
app/clip.tsx        after filming: play, save, register, proof card, send
app/verify.tsx      code lookup
components/         button, stamp, proof card, state notes
lib/theme.ts        colors, type, spacing, touch sizes
lib/code.ts         code format/entry helpers (pure, tested)
lib/stamp.ts        code generation
lib/shake.ts        shake detection (pure, tested); useShake.ts wires the sensor
lib/pending.ts      offline queue for codes that couldn't register yet
lib/proof.ts        frame grabs + proof card rendering
lib/supabase.ts     the tiny bit of server we use
supabase/schema.sql one table, two functions
tests/              node:test unit tests
```

## Not built yet

- Burning the stamp into the exported file. Recommended approach and why it isn't
  in this build: AUDIT.md §7
- Front + back camera at once — needs a native module, not in Expo's camera
- Host dashboard for reviewing a game's clips
- Affiliate codes / shop
