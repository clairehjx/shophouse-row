# Phase 5 — Cloud multiplayer (setup guide)

Goal: the girls play together on their own devices. Today everything is local-first
(one browser, `localStorage`). Phase 5 swaps the data layer behind `src/data/api.js`
for a real backend — **no screen code changes**.

## Recommended architecture (simplest, fewest accounts)

| Concern | Choice | Why |
|---|---|---|
| Database | **Supabase Postgres** | Generous free tier; schema in `supabase/schema.sql` |
| Auth | Name + **bcrypt** code → **JWT** (Vercel serverless `/api/login`) | No email; matches the kid-friendly design |
| Reads/writes | **Vercel serverless functions** (`/api/*`) using the Supabase **service key** | Keeps secrets server-side; validates the JWT |
| Realtime presence | **Supabase Realtime** (presence channel) | **Avoids needing Pusher/Ably** — one less account |
| Hosting | Vercel (static app + functions) | Same as the other sites |

> This drops the original "Pusher/Ably" open question — Supabase Realtime covers
> presence (who's online) and live updates, so we only need **one** new service.

## What I still need from you (the blockers)

1. **Create a Supabase project** (free) at supabase.com → grab:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (client)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — keep secret)
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Decide a **JWT secret** (any long random string) → `JWT_SECRET`.
4. Add these as **Vercel environment variables** (and `.env.local` for local dev —
   never commit it). The app reads them from the environment only (per project rules).

## Already built (dormant until keys exist)

- `api/login.js` — verifies name + **bcrypt** code, returns a signed **JWT**.
- `api/rpc.js` + `api/_lib.js` — one authenticated dispatcher implementing every data
  op (shops, inventory, trades, messages, creations, gifts, counts, presence ping).
- `src/data/cloudStore.js` — same interface as `localStore.js`, calling `/api/*`.
- `src/data/api.js` — **auto-switches** to the cloud store when `VITE_SUPABASE_URL`
  is set at build time; otherwise stays local-first.
- `scripts/seed-supabase.mjs` — seeds the 13 players, shops, starting inventory, and
  default (changeable) bcrypt codes.

## Flip it on (when you're ready)

1. Create the Supabase project; run `supabase/schema.sql`.
2. `cp .env.example .env.local` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `JWT_SECRET`, and `VITE_SUPABASE_URL` (same as the URL). Add the same vars in Vercel.
3. Seed: `node scripts/seed-supabase.mjs` (default code per player = their id).
4. `npm run build` → now the app talks to Supabase. Deploy to Vercel.
5. Claire changes each girl's secret code in the Supabase dashboard.

> Not yet wired (easy follow-ups): live Realtime push (instant note/trade popups &
> true presence) via Supabase Realtime channels — currently "online" uses a 60s
> heartbeat. Trade swaps aren't transactional (fine for 13 friends).

## Safety
- Secret codes are **bcrypt-hashed** server-side, never sent/stored in plaintext.
- Service-role key lives **only** in serverless env vars, never in the client bundle.
- RLS is on with no public policies, so the anon key can't touch data directly.
