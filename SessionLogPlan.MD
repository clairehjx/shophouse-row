# Shophouse Row — Lightweight Session Logging (Online + Active)

> Saved plan, to be revisited later. Not yet implemented.

## Context

The game stores no playtime today. `last_seen_at` is **overwritten on every heartbeat/login**
(`api/login.js`, `api/_lib.js` `ping`), so it only tells us each player's *most recent* activity —
not how long or how often they played. We want a **lightweight** way to answer "who played today,
how long, how many sessions" without heavy instrumentation.

Claire wants **two signals**:
- **Online** — the app is open and heartbeating (presence). Already free from the existing heartbeat.
- **Active** — the player actually interacted (moved/decorated/traded) recently — the honest
  "really playing" measure, since an idle open tab is online but not active.

Surface = **admin service-role script only** (matches the project's "admin via scripts, no in-game
UI" convention). Session boundary = **10-minute online gap** → new session.

## What we build on (verified in code)
- **Heartbeat already exists:** after login (token set), `cloudStore.js:24-26` calls `ping` once,
  then `setInterval(ping, 60000)` — every **60 s**. `ping` → `handlers.ping` (`_lib.js:57`) stamps
  `last_seen_at`; `login.js` stamps it on login.
- So session tracking comes **off the existing heartbeat** — no new timers, minimal client change.
- `interior`/etc. data layer unaffected. New `sessions` table is fully additive (no change to
  existing tables).

---

## Design

### 1. Client — report `active` on each heartbeat (`src/data/cloudStore.js`)
The 60 s heartbeat already runs; have it report whether the player interacted since the last beat.
```js
let lastActivityAt = 0;
const mark = () => { lastActivityAt = Date.now(); };
['pointerdown','keydown','touchstart'].forEach(e =>
  window.addEventListener(e, mark, { passive: true }));     // cheap, global, no React
const ping = () => {
  if (!token) return;
  const active = Date.now() - lastActivityAt < 60000;        // interacted within the last beat
  rpc('ping', { active }).catch(() => {});
};
```
Every beat = **online**; beats with real input also = **active**.

### 2. Schema — one new table (`supabase/schema.sql`, additive, idempotent)
```sql
create table if not exists sessions (
  id             text primary key,
  player_id      text not null references players(id) on delete cascade,
  started_at     timestamptz not null default now(),   -- first beat of the session
  last_ping_at   timestamptz not null default now(),   -- last beat  → ONLINE duration
  last_active_at timestamptz,                           -- last active beat
  active_seconds integer not null default 0             -- accrued ACTIVE time
);
create index if not exists idx_sessions_player on sessions(player_id, last_ping_at desc);

alter table sessions enable row level security;          -- no public policies (service-role only)
-- service_role grants are covered by the existing grant-all + alter-default-privileges block.
```
- **Online time** = `last_ping_at − started_at`.
- **Active time** = `active_seconds` (sum of intervals where the player was interacting).

### 3. Server — one helper, called by `ping` and `login` (`api/_lib.js`)
```js
const SESSION_GAP = 10 * 60 * 1000;  // 10-min online gap → new session (> 5-min ONLINE_WINDOW, > 60s beat)

export async function touchSession(db, playerId, prevSeen, active) {
  const now = new Date();
  const gap = prevSeen ? now - new Date(prevSeen) : Infinity;
  if (gap <= SESSION_GAP) {                                  // same session — extend
    const { data: s } = await db.from('sessions').select('id,last_ping_at,active_seconds')
      .eq('player_id', playerId).order('last_ping_at', { ascending: false }).limit(1).maybeSingle();
    if (s) {
      const patch = { last_ping_at: now.toISOString() };
      if (active) {
        const elapsed = Math.min((now - new Date(s.last_ping_at)) / 1000, SESSION_GAP / 1000);
        patch.active_seconds = s.active_seconds + Math.round(elapsed);   // accumulate
        patch.last_active_at = now.toISOString();
      }
      return db.from('sessions').update(patch).eq('id', s.id);
    }
  }
  return db.from('sessions').insert({                        // new session
    id: nid('s'), player_id: playerId,
    started_at: now.toISOString(), last_ping_at: now.toISOString(),
    last_active_at: active ? now.toISOString() : null, active_seconds: 0 });
}
```
Wire-up:
- `handlers.ping(db, { active } = {}, me)`: read prior `last_seen_at` first →
  `await touchSession(db, me, prev, !!active)` → then update `last_seen_at` as today.
- `api/login.js`: import + call `touchSession(db, p.id, p.last_seen_at, true)` (login is an action)
  before stamping `last_seen_at`.

**Cost:** ~2–3 tiny queries per beat per online player. Trivial at ~15 players.

### 4. Reading it — `scripts/play-stats.mjs` (new, service-role; admin-only)
Modeled on the ad-hoc `whoplayed` query. Reports in **Singapore time (UTC+8)** by default:
- Who's **online today** / **active today**.
- Per player: **session count**, **online time**, **active time**, last session.
- A `--since today|7d|all` window. (Optional `--tz` override.)
No client/API surface — run on demand.

### 5. Local parity (optional, cheap) — `src/data/localStore.js`
Mirror a `state.sessions` array + the same gap/active logic so `npm run dev` against a real-data
snapshot exercises it and the smoke test runs offline. Keeps the data-layer seam honest. Not required
for the cloud feature to work.

---

## Files to change
- `src/data/cloudStore.js` — activity tracker + `active` flag on the existing heartbeat.
- `api/_lib.js` — `SESSION_GAP`, `touchSession()` (exported), `ping` reads prev-seen + accounts.
- `api/login.js` — call `touchSession(..., true)` on login.
- `supabase/schema.sql` — new `sessions` table (+ RLS).
- **New:** `scripts/play-stats.mjs` — admin stats reader.
- `src/data/localStore.js` — optional local parity.
- **No change:** existing tables, `cloudStore`/`localStore` shop/inventory paths, screens.

## Build order — step by step, ship only at the end
0. Pull the Supabase snapshot (`scripts/pull-snapshot.mjs`) → `npm run dev` test bed.
1. `sessions` table in `schema.sql` + (optional) localStore parity. Smoke test the gap/active logic.
2. `touchSession` + `ping`/`login` wiring (`_lib.js`, `login.js`). Build.
3. Client `active` flag (`cloudStore.js`). Build.
4. `scripts/play-stats.mjs`. Verify output shape against the snapshot.
5. **SHIP:** run the `create table` on live Supabase (schema.sql is idempotent), deploy the
   `_lib.js`/`login.js`/`cloudStore.js` changes together, then confirm a real login creates and
   extends a session row.

## Verification (no browser in this env)
- **Smoke test (Node, localStore parity):** simulate beats — two beats 1 min apart with the second
  `active:true` → **one** session, `active_seconds ≈ 60`, online ≈ 60 s; a beat 20 min later → a
  **second** session. Assert counts + durations.
- `npm run build` each step; `npm run dev` against the snapshot.
- Post-deploy: log in, watch a `sessions` row appear and its `last_ping_at`/`active_seconds` grow
  over a couple of minutes; run `play-stats.mjs`.

## Caveats (by design)
- **Online vs active** split exists precisely because an idle open tab is online but not engaged —
  **active time** is the honest "really playing" number.
- **No backfill:** we never stored more than the latest `last_seen_at`, so playtime accrues only
  from deploy day forward.
- **Active resolution = heartbeat interval (~60 s):** active time is granular to the minute, which is
  plenty for this use.
- Session table grows ~1 row per player per session — tiny; no pruning needed for a long time.
