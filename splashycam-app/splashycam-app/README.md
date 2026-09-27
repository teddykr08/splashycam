# Splashy Cam — app

Film an elimination, stamp it with a code nobody can fake, send it to the host.

Built with Expo (React Native) so it runs on iOS and Android from one codebase and
builds in the cloud — **no Mac required**.

---

## What it does today

- **Record** — camera screen with the stamp shown on the preview: code, time, city.
  Hardware video stabilization is on, which absorbs most of the mount wobble.
- **Save + share** — clip goes to the camera roll, then straight to Messages/TikTok.
- **Verify** — anyone types a code and sees whether that clip is real, when it was
  filmed, and roughly where.
- **Privacy** — the video never leaves the phone. The server stores three things:
  code, timestamp, city. No accounts, no address, no upload costs. (Turning the
  rough location into a city name uses the phone's built-in geocoder: Apple's on
  iOS, the device's, usually Google's, on Android. So Apple or Google sees the
  rough coordinates. Our server never does.)

## Known gap, read this before building

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
app/record.tsx      camera, stamp, save, share
app/verify.tsx      code lookup
components/         the stamp overlay
lib/stamp.ts        code generation + what the stamp says
lib/supabase.ts     the tiny bit of server we use
supabase/schema.sql one table
```

## Not built yet

- Burning the stamp into the exported file (see above)
- Front + back camera at once — needs a native module, not in Expo's camera
- Host dashboard for reviewing a game's clips
- Affiliate codes / shop
