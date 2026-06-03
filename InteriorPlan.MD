# Shophouse Row — Interior Engine Upgrade (Pokémon-Gold Rooms + Movable Furniture)

> Saved plan, to be revisited later. Not yet implemented.
> **Supersedes the earlier `Furnitureplan.MD`** (now removed) — its AI-furniture + drag-to-move
> design is folded into this plan, which is the single source of truth.

## Context

Shophouse Row's interiors are currently flat-colored procedural rooms: a solid wall fill, a
2-color checkerboard floor, and hand-drawn fixture rectangles (`ShopRoom.jsx`). Decorations are
placed by **tapping a coarse 6×4 grid** (`InteriorRoom.jsx` → `MyShop.onCell`) as `{itemId,c,r}`
entries, and they're **walk-through**. Players have already decorated real shops (live on Supabase),
and some have **drawn custom pixel art** (`creation:<id>`) and placed it.

Claire wants the interior to feel like a **building in Pokémon Gold** — tiled wood/carpet floors,
a real back wall, furniture you **walk around** — but cozier, on a **larger screen**, kept
**lightweight** but it **doesn't have to be entirely procedural**: it's fine to build a **small,
lightweight tile engine** (tilesets + layers, bundled by Vite, hosted static on Vercel) instead of
ad-hoc `px()` rectangles. Two hard requirements: **(1) keep the cozy feel**, **(2) never lose a
decoration anyone has already placed.** Plus **furniture must be movable** (drag).

This plan **subsumes the earlier furniture plan** — AI-authored 24×24 furniture, an offline Gemini
text-model generator, +8 additive palette shades, the `normalizePlacement` lazy migration, and
turning ShopRoom into a drag-editor — and extends it with the decisions confirmed below.

### Confirmed decisions (from the user)
1. **Room size:** keep the world at **192×144 logical px**, just render **bigger** on screen
   (raise `SCALE` / max-width). → legacy items are **pixel-exact**, zero re-anchoring.
2. **Drag snap:** **free drag with a soft 8px snap** for furniture (tidy but not fiddly on phones).
3. **Furniture is SOLID** (walk around it) — and a **two-layer model**:
   - The existing **pixel-draw-and-place feature is retooled into a "Floor Tile Designer."**
     Custom `creation:<id>` art becomes **walkable floor tiles** (drawn flat, under everything) so no
     one's pixel work is wasted. **Furniture can be placed on top of designed tiles.**
   - New **furniture** (24×24 catalogue pieces) is **solid** with collision + anti-trap guards.
4. **Theming:** interiors are **themed per shop** (tinted from the shop's colors) **and the owner
   can change the theme** — needs a small additive `interior_theme` column.
5. **Engine / workflow:** a **small lightweight tile engine** is acceptable (need not be fully
   procedural). **Build step by step; after every step test locally against a real-data Supabase
   snapshot** (`scripts/pull-snapshot.mjs` → `src/data/snapshot.local.json`, seeded into `npm run
   dev`). **Ship only at the final step** — no git push, no Vercel deploy, no live-Supabase schema
   change until everything is done and verified.
6. **Shelves stay fixed** (not made movable) — see below.

---

## Layer & solidity model (the core new concept)

Placement entries stay a flat array in `interior`/`interior2`; **layer and solidity are derived
from the itemId, not stored** (so the data shape is just `{itemId, x, y}` — no new fields):

| What | itemId test | Layer (draw order) | Walkable? | Snap |
|------|-------------|--------------------|-----------|------|
| **Floor tiles** | `id.startsWith('creation:')` | 0 — flat on floor, under all | ✅ yes | 16px tile grid |
| **Decor / shelf goods** | catalogue id, not furniture | 1 — object, z-sorted by y | ✅ yes (unchanged) | 8px |
| **Furniture** | `resolveItem(id).category === 'furniture'` | 1 — object, z-sorted by y | ❌ **solid** | 8px |
| **Avatar** | — | 2 — top, z-sorted with objects | — | — |

- **Floor tiles** render flat (top-left at `x,y`, no bottom-align), under furniture/avatar — this is
  why "place furniture on a designed tile" just works. A PixelEditor creation is 16×16 → exactly one
  16px floor tile; new tiles snap to the tile grid so they tessellate.
- **Existing placed creations** are preserved in position and **re-roled as floor tiles** (they'll
  now lie flat instead of standing). This is the explicit ask — keeps their work, repurposes it.
- **Only furniture is solid.** Small decor stays walk-through (preserves the cozy, forgiving feel
  and avoids trapping on tiny items).

### Shelves are untouched (orthogonal system)
The two built-in shelves — `B` (shop's unique shelf) and `G` (collected shelf) — are **fixed
fixtures**, not placements. The goods "on" them are **inventory items** rendered in a walk-up browse
panel (`ShelfGrid` via `shelfItemsFromInventory`, `ShopRoom.jsx:65-69,128-135`), filtered by shelf
prefix — **completely separate from `interior`/`interior2`.** This upgrade does not touch the
SHELF/inventory/trading system. Per the user's choice, shelves **stay fixed** (not made movable):
same positions, still solid (already in `SOLID`), still open the same browse panels — only
**restyled** to match the new tiled look. Goods, browsing, trading, and gifting all continue working
unchanged.

---

## Plan by area

### A. Palette — +8 furniture shades (`src/pixel/icons.js`)
Additive only; free single-letter keys confirmed (`a d e f h i j l q v x z`). Append to
`ICON_PALETTE` (inherited everywhere as `ITEM_PALETTE`; `PixelEditor`'s swatch row gains them for
free). Keep `k` as the canonical outline; never remove existing keys (existing 12-wide sprites must
keep working). Hexes are tunable during curation:

| key | hex | use |
|----|----|----|
| `N` | `#6f4a30` | dark wood (legs / shadow side) |
| `W` | `#c79468` | light wood / highlight |
| `d` | `#3a2c22` | deep shadow (darker than `k`); also AO + stair top-fade |
| `f` | `#d98aa8` | rose fabric midtone |
| `F` | `#b56b86` | rose fabric shadow |
| `l` | `#fbe6c0` | warm cream highlight (linens, lamp glow, stair lip) |
| `e` | `#8a9b7a` | sage (plants, upholstery) |
| `E` | `#5e6f4f` | sage shadow |

Plus a **cool stone pair** for stairs/Octopath stone (use any remaining free keys, e.g. `S`
`#9aa0ab` lit tread, `x` `#5d6470` shadow riser — verify they're free at implementation time).

### B. Furniture catalogue (`src/pixel/items.js`)
- Add **placeholder 24×24** sprites first (armchair, sofa, bed, round table, bookshelf, dresser,
  lamp, rug, plant pot, clock, stairs) so the engine ships before art is final.
- `ITEMS` entries `{ id, name, category:'furniture', sprite }` — plain ids → `resolveItem` unchanged.
- `FURNITURE_IDS` array (mirror `DECOR_ITEMS:292`) so they list in the bag/editor palette.

### C. Offline furniture generator (`scripts/gen-furniture.py`, new — non-blocking)
Modeled on `scripts/make-invite.py`; see the `Furniture-design-brief.md` for the prompt/style spec.
Python + `google-genai`, `GEMINI_API_KEY` from env (repo is public). **Text** models: call
**`gemini-3.5-flash`, fall back to `gemini-3-flash`**. Force JSON (`response_mime_type=
"application/json"`, `temperature≈0.4`). The prompt carries: the exact spec (`{"name":…,
"sprite":[24 strings × 24 chars]}`), the full palette legend (char → plain colour), style rules
(single outer `k` outline, no internal black lines, warm light / cool shadow, bottom-aligned base,
readable silhouette, `.`=transparent), and a few-shot example. Furniture name from `argv`. Validate
each result (list of strings; exactly 24 rows; each row exactly 24 chars; chars ∈ allowed ∪ `{'.',' '}`;
not all-transparent) with inner retries per model. Emit a paste-ready JS snippet (`const armchair =
[ … ]` + its catalogue line); optional `--preview` ANSI render. **Never auto-edit `items.js`** —
curation is manual: run each piece 2–3×, pick the best, hand-fix outline/shading. Target pieces:
`armchair, sofa, bed, round table, bookshelf, dresser, lamp, rug, plant pot, clock` (+ `stairs`).

### D. Small lightweight tile engine + Pokémon-Gold rendering (new `src/pixel/roomEngine.js`, `src/pixel/tiles.js`; `src/components/ShopRoom.jsx`)
Decision #5 lets us replace the ad-hoc procedural `drawRoom` (`ShopRoom.jsx:106-172`) with a tiny
**data-driven tile engine** — still lightweight, bundled by Vite, fully static on Vercel.
- **`roomEngine.js`** — a minimal layered tilemap renderer:
  - A **tileset** = named 16×16 tiles. Keep them as **char-array sprites** (drawn via `drawSprite`)
    so they stay editable-in-source and tiny; a small bundled PNG/data-URI atlas is allowed if a
    tile needs more than the palette, but char-arrays are the default.
  - A **room** = explicit **layers**: `floorBase` (tiled), `floorTiles` (player creations, layer 0),
    `walls`/back-wall band, `fixtures` (counter/shelves/stairs/door/bed), `objects` (decor +
    furniture, z-sorted by y), `avatar`. `drawRoom(ctx, room, {scale})` walks layers back-to-front.
  - This subsumes the per-tile `switch` in ShopRoom into engine data, so ShopRoom just supplies the
    room model + placements and the engine draws. Keeps ShopRoom focused on input/walk/drag.
- **`tiles.js`** — the tileset: `WOOD_PLANK`/`CARPET` floor tiles, `WALL`/`BASEBOARD`/wallpaper-motif
  tiles, fixture tiles. Warm watercolor hues so it stays cozy (req #1).
- **Back-wall band** (top ~2 tiles): wallpaper tint from the theme (F) + baseboard stripe.
- **Floor**: tile the interior region, **replacing** the `(r+c)%2` checkerboard (`:110-117`).
- **Stairs treatment (back wall):** render the stairs **set into the back wall** (not on the floor),
  with the steps **fading into black as they approach the top of the wall** — a vertical gradient
  from the lit stone/wood tread at the bottom step to near-`k`/`d` black at the topmost step. This
  reads as a stairwell receding upward into darkness (the "walking up the stairs" illusion). Drive it
  procedurally in the engine (per-row shade lerp toward `d`) so it tints with the theme; the door
  keeps its current bottom-wall position. (Aligns with the Octopath light-rhythm notes in
  `Furniture-design-brief.md`, but anchored to the back wall and darkened at the top.)

**Collision must not change from the floor/wall work.** The tile engine is a rendering concern; the
walk loop keeps reading `SOLID`/`tileAt`/`SHOP_MAP`/`UP_MAP` (solid-furniture collision is added
separately in G). Larger screen = bump `SCALE` 4→5/6 and wrapper `maxWidth` (`:19,277`); avatar
overlay is `%`-positioned so it auto-scales; logical px unchanged → **placements pixel-exact.**

### E. Placement migration (`normalizePlacement`, in `src/pixel/items.js` + new `src/pixel/roomGeom.js`)
Move the room geometry constants (`TILE, DISP_C0, DISP_R0, ROOM_W, ROOM_H`) into a shared
`roomGeom.js` so the renderer and the migration can't drift. Add:
```
normalizePlacement(p, creations) →
  if finite p.x,p.y → {itemId, x, y}                       // already new shape
  else legacy {itemId,c,r}: w,h = spriteSize(placeableSprite(itemId, creations))
       x = (DISP_C0 + c)*TILE + floor((TILE - w)/2)        // ShopRoom's EXACT current offsets
       y = (DISP_R0 + r)*TILE + (TILE - h) - 1
  clamp x,y into [TILE, ROOM_W-TILE-w] × [TILE, ROOM_H-TILE-h]   // never drop; clamp outliers
```
- **Lazy, lossless, no DB migration**: old `{c,r}` and new `{x,y}` coexist forever; an entry upgrades
  only when its owner next saves. Both renderers normalize on load (read-only visitors render fine).
- **Never drop an entry whose sprite resolves** (clamp instead). Applies to `creation:<id>` too.
- Because the room stays 192×144 with identical offsets, legacy items land on the **exact same
  pixel** — preservation is exact.

### F. Theme system (`src/pixel/themes.js` new; storage = 1 additive column)
- `THEMES` map: each theme = `{ wall, baseboard, floorA, floorB, wallpaper? }`. A
  `defaultThemeFor(shopType)` derives a starting theme from `SHOP_TYPES[shopType].wall` (data already
  in `shophouse.js`, reachable via `owner.shopType`).
- `ShopRoom` reads `shop.interiorTheme || defaultThemeFor(owner.shopType)` and feeds D.
- **Owner can change it:** a small theme-swatch picker in MyShop setup mode → `api.saveShop(id,
  { interiorTheme })`.
- **Storage (the one DB touch, additive — defer to ship step):**
  - `supabase/schema.sql`: `alter table shops add column if not exists interior_theme text;`
  - `api/_lib.js`: add `interiorTheme: 'interior_theme'` to the `COL` whitelist (`:53`) and
    `interiorTheme: s.interior_theme` to `mapShop` (`:35-39`). (Whitelist confirmed at `:68` — without
    this the field is silently dropped.)
  - `localStore.js`: opaque `Object.assign` already handles it; `getShop` returns the whole object,
    so local/snapshot testing of themes works with no column.

### G. Solid furniture + anti-trap guards (`src/components/ShopRoom.jsx`)
- Extend `solidAtPx` (`:89`): in addition to the grid `SOLID` test, test the avatar's next position
  against each **furniture** placement's bbox (`{x,y,w,h}` from normalize; only items whose
  `category==='furniture'`). Floor tiles and decor are skipped (walkable). ~dozens of items → cheap.
- **Anti-trap guards** (kids on phones):
  - On place/move commit, if a furniture bbox covers the **door tile** or the **spawn tile**, reject
    with a toast ("Keep the doorway clear!") and snap it out.
  - **Ultimate safety net:** setup/edit mode disables walking, so a player who boxes themselves in can
    always re-enter edit mode and move the piece — no permanent soft-lock. Document this.

### H. Drag editor — ShopRoom becomes the editor (`src/components/ShopRoom.jsx`)
Reuse the Pointer-Event idiom from `PixelEditor.jsx:53-55`. New props: `editable, selected,
onPlace(itemId,x,y), onMove(i,x,y), onPickup(i)`.
- In `editable`: **disable the walk loop + keyboard** (guard the rAF `:175-224` and key effect on
  `!editable`); set `touch-action:none` on the wrapper (`:277`) so drags don't scroll the page (#1
  phone risk).
- `pointerdown` → `setPointerCapture`; convert client→logical px via `getBoundingClientRect()`.
- **Hit-test** placed items **top-most first** (reverse z-order), bbox + small inset.
- **Live drag** in a ref + rAF redraw; **commit to state + `saveShop` once on `pointerup`** (never
  per-move); **clamp** to floor bounds; apply snap (**floor tiles → 16px**, **furniture/decor → 8px**).
- **Z-order:** sort a shallow copy by `y` before drawing (lower = in front) for cozy depth; reverse
  for hit-test.
- **Tap vs drag:** move <4px = tap. Tap a placed item → `onPickup`; tap empty floor with `selected`
  → `onPlace` at tap point (or room center) then draggable.

### I. Floor-Tile Designer retool (`src/components/PixelEditor.jsx`, `src/screens/MyShop.jsx`)
- Reframe the existing 16×16 PixelEditor UI as the **"Floor Tile Designer"** (label/copy; same
  `addCreation` flow producing `creation:<id>`). No data change — these ids now render in **layer 0**
  as walkable floor tiles per the model above.
- Existing creations are preserved and auto-re-roled (no per-user migration).

### J. Wire-up + demotions + width fix
- **MyShop** (`src/screens/MyShop.jsx`): replace `onCell(c,r)` (`:123-136`) with `onPlace/onMove/
  onPickup` that edit the active `placements` array and call the existing `saveInterior` (`:117-120`,
  unchanged seam); keep bag consume/return (`api.removeInventoryItem(...,false)` / `addInventoryItem`),
  `clearRoom` (`:137`), and the floor toggle. **Render the walkable `ShopRoom` as the editor** in setup
  mode (was `InteriorRoom`). Add the theme picker.
- **InteriorRoom** (`src/components/InteriorRoom.jsx`): demote to a **read-only mini-preview** (drop
  the `<button>` overlay grid + `onCell`; still run `normalizePlacement` so legacy previews correctly).
- **Placeable.jsx:12 / ItemSprite.jsx:12:** `width={12}` → `width={Math.max(spriteSize(sprite).w, 12)}`
  so 24-wide furniture isn't clipped (`spriteSize` already imported).
- **No change:** `cloudStore.js`, `localStore.js`, `api.js` (theme rides the existing `saveShop` seam).

---

## Files to change
- **New:** `src/pixel/roomEngine.js` (small layered tile engine), `src/pixel/roomGeom.js` (shared
  constants), `src/pixel/tiles.js` (floor/wall/fixture tileset), `src/pixel/themes.js` (THEMES +
  `defaultThemeFor`), `scripts/gen-furniture.py` (non-blocking), `scripts/give-furniture.mjs`
  (optional test seeding). (`scripts/pull-snapshot.mjs` already exists per CLAUDE.md.)
- `src/pixel/icons.js` — +8 palette shades.
- `src/pixel/items.js` — furniture sprites + `ITEMS` + `FURNITURE_IDS` + `normalizePlacement` +
  layer/solidity helpers.
- `src/components/ShopRoom.jsx` — tiled render + theme + larger scale + drag editor + solid collision
  (**biggest change**).
- `src/screens/MyShop.jsx` — place/move/pickup wiring + theme picker + ShopRoom-as-editor.
- `src/components/PixelEditor.jsx` — reframed as Floor Tile Designer.
- `src/components/InteriorRoom.jsx` — read-only preview.
- `src/components/Placeable.jsx`, `src/components/ItemSprite.jsx` — width from `spriteSize`.
- `supabase/schema.sql` + `api/_lib.js` — additive `interior_theme` column (theme storage only; ship step).

---

## Build order — step by step, **ship only at the end**

**Step 0 — local real-data setup.** `node --env-file=.env.local scripts/pull-snapshot.mjs` →
`src/data/snapshot.local.json` (git-ignored). `npm run dev` now seeds from real shop data in
localStore shapes. **This is the per-step test bed for every phase below.** No deploy in any phase
1–5; **Phase 6 is the only ship.**

1. **Palette + placeholder furniture + width fix** (`icons.js`, `items.js`, `Placeable/ItemSprite`).
   Furniture appears as static, tap-placeable items; thumbnails unclipped.
2. **Tile engine + tiled room + larger scale + theme** (`roomEngine.js`, `tiles.js`, `themes.js`,
   `ShopRoom`, `SCALE`, theme picker stub; theme stored locally via opaque saveShop — **defer the
   live `schema.sql` + `_lib.js` column to Phase 6**). Don't touch `SOLID`/`tileAt`/maps.
3. **`normalizePlacement` + layered rendering** (`roomGeom.js`, `items.js`, both renderers read
   `{x,y}`, floor-tile layer vs object layer). **Preservation gate — run the smoke test.**
4. **Drag editor + solid furniture** (`ShopRoom` pointer mode, hit-test, snap, z-sort, clamp,
   furniture collision + anti-trap guards).
5. **MyShop wiring + Floor-Tile-Designer retool + InteriorRoom demotion + theme picker UI.**
6. **SHIP:** apply the additive `interior_theme` column to live Supabase (`schema.sql` +
   `_lib.js`), final `npm run build`, hard-refresh check, then git push (Vercel auto-deploys).
- **(Parallel, non-blocking)** `gen-furniture.py` + curate real 24×24 sprites into `items.js`.

---

## Verification (no browser in this environment)

- **Per phase (the loop, ship nothing):** `npm run build` (catches import/JSX/syntax) **+ `npm run
  dev` against the real-data snapshot** from Step 0 — load a real decorated shop and confirm it
  renders/behaves correctly after that phase's change. Re-pull the snapshot anytime to refresh.
- **Headless localStore smoke test** (Node script; polyfill `globalThis.localStorage` **before**
  importing `src/data/api.js` so PROD-off selects localStore; `import.meta.glob` is try/caught → safe):
  1. Register a fake creation via `setCreationsRegistry({cr1:{...}})`.
  2. `api.saveShop(seededId, { interior: [ {itemId:'mug',c:1,r:1}, {itemId:'creation:cr1',c:4,r:2},
     {itemId:'armchair',x:80,y:60} ] })`.
  3. `getShop` → map through `normalizePlacement(p, creations)`.
  4. **Assert:** count-in === count-out (3→3, none dropped); every result has finite `x,y` inside
     `[TILE, ROOM_W-TILE-w] × [TILE, ROOM_H-TILE-h]`; `placeableSprite` resolves all three (legacy
     decor, legacy **creation→floor tile**, new furniture `{x,y}`). Proves exact preservation +
     lossless migration + creation handling (req #2).
  5. Theme round-trip: `saveShop(id,{interiorTheme:'rose'})` → `getShop` returns it.
- **Sprite validity** enforced inside `gen-furniture.py` (24×24, legal chars, non-empty).
- **Untestable here — flag for on-device:** live drag feel, `setPointerCapture`, `touch-action:none`
  on phones; **solid-furniture trapping** (verify door/spawn guards + that edit mode frees a boxed-in
  avatar); confirm a real live Supabase shop renders unchanged before/after first re-save.

## Risks
- **Touch drag** (Pointer Events + `setPointerCapture` + `touch-action:none`) — #1 phone risk.
- **Solid-furniture trapping** — mitigated by door/spawn guards + edit-mode escape hatch.
- **Re-roling creations to flat floor tiles** changes how existing custom art looks (flat vs
  standing) — intended per user, but worth eyeballing a couple of real shops.
- **LLM pixel consistency** — mitigated by few-shot prompt, 2–3 runs/piece, manual curation.
- **Theme column** is the one additive DB change — keep it nullable with a code-side default so old
  shops and local mode need nothing.
