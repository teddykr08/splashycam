# later/: code that isn't in the app right now

**The app currently has no backend.** Codes are generated on the phone and stay
there. Nothing is registered, and nothing can be checked, so there's no "Check a
code" screen.

This folder keeps the server side, so it doesn't have to be rewritten when it
comes back:

| File | Was | What it does |
|---|---|---|
| `server/supabase.ts` | `lib/supabase.ts` | Supabase client: `saveProof` / `lookupProof`, with typed results and a 10 s timeout |
| `server/pending.ts` | `lib/pending.ts` | Offline queue: codes filmed with no signal are retried later |
| `server/verify-screen.tsx` | `app/verify.tsx` | The "Check a code" screen: six-box entry, paste, registered / not-found / error states |
| `../supabase/schema.sql` | (same place) | Table + `register_proof` / `verify_proof` functions. Tested against Postgres 16. |

TypeScript still checks these files (`npm run typecheck`), so they won't quietly
break. The app never imports them, so they aren't in the app bundle.
`@supabase/supabase-js` and `react-native-url-polyfill` stay in `package.json`
for the same reason.

## Bringing the server back

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Move `server/supabase.ts` and `server/pending.ts` back to `lib/`, and
   `server/verify-screen.tsx` to `app/verify.tsx`. Fix the import paths.
3. Re-add registration to the share screen (`app/clip.tsx`). Git history has the
   version that did it: commit `fb782b8`.
4. Put the values in `.env` (copy `.env.example`).

**What the server adds:** a registration time the phone can't fake. **What it
still won't prove:** that the footage is original.
