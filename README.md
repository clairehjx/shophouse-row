# 🏪 Shophouse Row

A cozy pixel-art game where each friend owns a shophouse on a shared street — decorate
your shop, visit friends, trade items, and leave notes. Built local-first (runs 100% in
the browser, no accounts needed) so it's playable while we build it.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173). See `DEV-NOTES.md` for the local
login codes and the **Play as…** dev tool.

## What works now (Phases 0–3)

- 🎒 **Bag** — every character has a personal inventory of items they own.
- 💌 **Sticky notes** — leave a short note (≤100 chars) in a friend's shop; read & reply
  from your Notes inbox. Unread count shows on the header badge.
- 🔄 **Trading** — from a friend's shop, offer an item from your bag for one of theirs.
  They accept/decline under Trades; on accept the items swap automatically. Logbook keeps
  the history. Pending-offer count shows on the header badge.

### Earlier phases

- 🚶 **Walk the street** — move your avatar with ← → (or the on-screen ◀ ▶ buttons);
  the camera follows. Press ▲ / Space / Enter to go into the shop you're standing in
  front of. Unclaimed houses show a cosy "Opening soon" shutter; a few neighbours are
  already open so the street feels alive.
- 🔐 **Login** — name + secret code, session persists across reloads.
- 🧑‍🎨 **Avatar Creator** — pick a **unique** shop type, skin, hair (style + colour),
  outfit + **outfit colour**, accessory (Bow / Hat / None) + **accessory colour**, with a
  live preview.
- 🏠 **My Shop** — walk into your own shop to edit the **facade** (sign text, awning colour,
  window display item) and decorate the **interior** (tap-to-place items on a grid). Changes
  show on the street.

- 📲 **Installable (PWA)** — "Add to Home Screen", offline app shell, app icon. Works
  from a production build: `npm run build && npm run preview` (or once deployed to Vercel).
  Regenerate icons with `node scripts/gen-icons.mjs`.

## Coming next

- Phase 5: Supabase + realtime multiplayer (swaps `src/data/localStore.js` for cloud)

## How it's built

| Thing | Where |
|---|---|
| Pixel engine (`drawSprite`) | `src/pixel/engine.js` |
| Avatars (procedural) | `src/pixel/avatar.js` |
| Shophouses + shop types | `src/pixel/shophouse.js`, `src/pixel/icons.js` |
| **Data layer (swap point)** | `src/data/api.js` → `src/data/localStore.js` |
| Screens | `src/screens/` |

The whole UI talks only to `src/data/api.js`. Phase 5 reimplements that one seam against
Supabase + serverless functions without touching any screen.
