# Shophouse Row — Session Logging + Reversible Player Actions

> Saved plan, to be revisited later. Not yet implemented.
> **Two parts:** (1) lightweight online+active session logging (admin-read);
> (2) self-service fix-it tools — unsend a message, undo an accidental donate/destroy, retract a trade.
> Part 1 is everything immediately below; **Part 2 is at the end of this file.**

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

---

# Part 2 — Reversible player actions (self-service)

> Added on request. A sibling "fix what happened" feature set (not session logging itself).
> **Decisions:** **in-game self-service** (players fix their *own* mistakes). 2A/2C act on others, so
> they're server handlers with **ownership** checks; **2B is your own bag** — a client-side undo, no
> backend.

Theme: a safe "undo my mistake" affordance. **2A (unsend) and 2C (retract)** affect another player, so
each is a server handler that enforces **ownership** (`from_player === me`, the same pattern as the
existing `saveShop`/`giftItem` `forbidden` checks in `_lib.js`) plus a **state check**, riding the
existing `/api/rpc` dispatch (`api/rpc.js` → `handlers` in `_lib.js`), the `src/data/api.js` seam, with
a `localStore.js` mirror. **2B (undo donate)** touches only your own inventory and needs none of that.

## 2A. Unsend a sent message
- **Handler** `deleteMessage(db, { messageId }, me)`: load the message; require `from_player === me`;
  then `db.from('messages').delete().eq('id', messageId)` (hard delete — the inbox simply stops
  showing it). Works whether or not the recipient already read it ("delete for everyone"). Optional
  time window — default allow anytime. Also lets you remove the auto "🎁 I sent you…" gift notice.
- **Client:** an **"Unsend"** affordance in the `Inbox` thread on messages where `mine === true`
  (`listThreads` already flags `mine`) → `api.deleteMessage(id)` → refresh.
- **localStore:** drop it from `state.messages`.

## 2B. Undo an accidental donate / destroy (your own item)
The Bag's 🎁 button calls `donate(itemId)` (`Bag.jsx:26-31`), which is really a **self-destroy**:
`api.removeInventoryItem(me, itemId, false)` drops one from your bag with **no recipient and no
confirmation**, so a single stray tap on a phone permanently loses an item. (Eating food via `consume`
is the same one-tap removal, but intentional.) Goal: let a player undo an accidental donate.

**Approach — a transient "Undo" toast (Gmail-style); no backend, no schema.** The item *definition*
never goes away — only the inventory count drops — so undo is simply a **re-add of the same id**.
- On donate, show a toast with an **"Undo"** action for ~6 s → `api.addInventoryItem(me, itemId, 1)` →
  reload. Stash the last-destroyed `{itemId}` in `Bag` state so the button still works as the toast
  fades; clear it after the window or on the next action.
- Works for **every** id — plain, shelf goods `prefix:name(::hex)`, and `creation:<id>` (the creation
  still resolves via the registry) — re-adding restores it exactly.
- **No new handler, no new table** — reuses the existing `addInventoryItem` seam (which already has
  localStore parity). The lightest of the three.
- **Also included — two safety extras (prevent the mistake, undo is the backstop):**
  - **Confirm before donate** — a quick "Give away {name}? It'll leave your bag." prompt so a stray tap
    can't destroy an item silently. The Undo toast remains as the safety net if they confirm and still
    regret it.
  - **Relabel the button** — the 🎁 `title="Donate (give it away)"` has **no recipient**; change the
    copy (and the toast) to "Remove from bag" / "Removed {name}" so it stops implying someone receives
    it. (A real give-to-a-friend flow already exists via gifting — this button just discards.)
  - (Eating could reuse the same Undo toast, but it's intentional → left out for now.)

## 2C. Retract a pending trade
Today only the recipient acts (`respondTrade` accept/decline); the proposer can't cancel. Pending
trades hold **no escrowed items** (items move only on accept), so retract is a safe status flip.
- **Handler** `retractTrade(db, { tradeId }, me)`: require trade exists, `from_player === me`,
  `status === 'pending'`; set `status = 'retracted'`. No inventory change. (`retracted` is just a new
  value in the existing free-text `status` — **no schema change**; it falls into `listTrades`
  **history**.)
- **Client:** a **"Retract"** button on each **outgoing pending** trade in the `Trades` screen →
  `api.retractTrade(id)` → refresh.
- **localStore:** same status flip.

## Wiring
- `api/_lib.js`: add `deleteMessage` and `retractTrade` handlers (2B needs **no** handler).
- `src/data/api.js` + `src/data/cloudStore.js`: expose `deleteMessage`, `retractTrade` (cloud = `rpc`
  passthrough; the dispatcher already routes by handler name).
- `src/data/localStore.js`: local implementations of those two (2B reuses `addInventoryItem`, already
  mirrored).
- UI: `src/screens/Inbox.jsx` (unsend), `src/screens/Trades.jsx` (retract), `src/screens/Bag.jsx`
  (undo-donate toast; optional confirm + relabel).
- `supabase/schema.sql`: **no change** — `retracted` is just a new value in the free-text trade
  `status`; 2B adds nothing.

## Build order (step by step, ship only at end — same workflow)
0. Pull the Supabase snapshot → `npm run dev` test bed.
1. **2B — undo donate** (`Bag.jsx` only): confirm-before-donate + relabel button + Undo toast/state.
   Client-only, ships any time — the quickest win.
2. **2C — retract trade** (`retractTrade` handler + seam + Trades button). Simplest server action.
3. **2A — unsend** (`deleteMessage` handler + seam + Inbox unsend).
4. **SHIP:** deploy handlers + UI together. No schema change.

## Verification (no browser)
- Smoke test against the snapshot: propose→retract (status flips, **no** inventory move); send→unsend
  (gone from the recipient's thread); donate→undo (the item returns to your bag, qty restored). Assert
  **no negative inventory ever**.
- `npm run build` per step; `npm run dev` against the snapshot.

## Caveats
- **Unsend is silent** (no "message deleted" tombstone) — fine for this group; add one later if it
  feels confusing.
- **Undo-donate is a transient window** (re-add within the toast) — if the player navigates away the
  toast is gone; that's why **confirm-before-donate** is included, to prevent the mistake up front.
- **2A/2C are self-service for your own actions only** — each handler checks `from_player === me`. A
  force-undo admin override could be a later service-role script if ever needed.
