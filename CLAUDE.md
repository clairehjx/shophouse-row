# CLAUDE.md — Shophouse Row

Cozy **pixel-art multiplayer** game: each friend runs a shophouse on a shared street —
walk around (top-down), decorate (2 floors + pixel editor), and visit friends to leave
notes, **trade**, and **gift**. Built for a group of ~14 girls (Claire H. = admin).

## Stack
- **React 18 + Vite + Tailwind**. Hand-rolled **Canvas pixel engine** — *no game engine*.
- **PWA** (`vite-plugin-pwa`, installable/offline). Icons via `scripts/gen-icons.mjs`.
- **Cloud backend:** Supabase (Postgres) + Vercel serverless functions in `api/`.

## The data-layer seam (most important pattern)
The whole UI imports only **`src/data/api.js`**, which picks a backend:
- `src/data/localStore.js` — local-first (localStorage), used by `npm run dev`.
- `src/data/cloudStore.js` — calls relative `/api/*`, used in **production builds**.
- Switch = `import.meta.env.PROD` (NOT an env var — a past bug; the empty
  `VITE_SUPABASE_URL` silently forced local mode). Both stores expose the *same*
  function names; never call a store directly from a screen.

## Layout
```
src/pixel/    engine.js (drawSprite), avatar.js (procedural avatar), shophouse.js
              (SHOP_TYPES, STREET_ORDER, AWNING_COLORS), icons.js, items.js
src/data/     api.js (seam) · localStore.js · cloudStore.js · hash.js
src/components ShopRoom (walkable room), InteriorRoom, PixelEditor, Placeable,
              ShelfGrid, ItemSprite, Avatar, TopBar, DevSwitcher, InstallPrompt …
src/screens/  Login, AvatarCreator, Street, MyShop, VisitShop, Inbox, Trades, Bag
api/          _lib.js (handlers + supabase + jwt) · login.js · rpc.js  (Vercel funcs)
supabase/schema.sql · scripts/ (seed, set-code, give-treats, gen-icons, make-invite.py)
```

## Items model (`src/pixel/items.js`)
- Sprites = arrays of strings, each char → `ICON_PALETTE`/`ITEM_PALETTE` colour.
- Inventory entries: `{itemId, qty}`. Item ids:
  - plain catalogue id (`gift`, `candle`, …) — see `DECOR_ITEMS` (placeable decor).
  - **shelf goods** `"<prefix>:<name>"` (e.g. `book:Matilda`, `tea:Taro`) — one shared
    sprite per shop kind via `SHELF`; optional colour `"<prefix>:<name>::<rrggbb>"`.
  - **creations** `"creation:<id>"` — custom pixel art; sprites in a **global registry**
    (`setCreationsRegistry`) so traded/gifted creations render for anyone.
- `resolveItem(id)` → `{id,name,sprite,palette}` for all of the above. `edibleVerb(id)`
  → 'Ate'/'Sipped' for bread/candy/can/tea (eat animation in Bag).
- Placing a decoration **consumes** it from the bag; pick-up / Clear returns it.

## World
14 players, 14 shop types (incl. Toy & Car). `STREET_ORDER` is fixed (Claire H. & Chloe
**centered**); the Street sorts by it so positions are static in local *and* cloud.
Each shop has a unique creatable shelf (books/vinyls/candies/cars/…). Tea house = bubble tea.

## Deploy & data
- GitHub **clairehjx/shophouse-row** (public) → Vercel project **shophouse-row**
  (auto-deploys on push). Live: **https://shophouse-row.vercel.app**.
- Cloud env (Vercel + `.env.local`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`.
  (`vercel env pull` masks values — don't trust it; the bundle is the truth.)
- Supabase setup: run `supabase/schema.sql` (grants service_role), then
  `node --env-file=.env.local scripts/seed-supabase.mjs` (idempotent: only adds new players).
- Codes: **bcrypt**, default = player id. Change: `scripts/set-code.mjs <id> <code>`.
- Admin tasks via service-role scripts (no in-game admin UI).
- Realtime = 60s `last_seen_at` heartbeat for presence (true Supabase Realtime = TODO).
- **Test changes against real data BEFORE deploying** (avoids PWA-cache surprises):
  `node --env-file=.env.local scripts/pull-snapshot.mjs` writes
  `src/data/snapshot.local.json` (git-ignored, real data in localStore shapes); then
  `npm run dev` seeds from it instead of the demo. Storage key is `snap-<pulledAt>`, so a
  re-pull auto-reseeds. Delete the file to return to the synthetic demo seed. Prod is
  unaffected (uses cloudStore; the file is absent there).

## Safety / never commit
- `.env.local` (secrets) and `invites/` (per-friend codes) are git-ignored. Repo is public.
- DevSwitcher is dev-only (`import.meta.env.DEV`) — tree-shaken from production.
- After deploy, hard-refresh (PWA caches the shell).

## Misc
- Invite cards: `scripts/make-invite.py "<Name>" "puppy" "<shopcode>"` → Gemini image
  model **Nano Banana 2** (`gemini-3-pro-image-preview`, falls back), `GEMINI_API_KEY` from env.
  `puppy` = the **website gate** code (website/gate.js, base64). Shop code = the player's id.
- Build/verify here: `npm run build`; headless smoke = a tiny Node script that polyfills
  `localStorage` and imports `src/data/api.js` (PROD off → localStore).
