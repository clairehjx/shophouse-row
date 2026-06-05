import { useEffect, useMemo, useRef, useState } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import Avatar from './Avatar.jsx';
import ShelfGrid from './ShelfGrid.jsx';
import { px, drawSprite, spriteSize } from '../pixel/engine.js';
import { drawAvatar, AVATAR_SIZE, DEFAULT_AVATAR } from '../pixel/avatar.js';
import { placeableSprite, placeableName, resolveItem, ITEM_PALETTE, shelfDefForShop, shelfItemsFromInventory, normalizePlacement, rotateSprite, isFloorTile, isSolid } from '../pixel/items.js';
import { resolveTheme } from '../pixel/themes.js';
import { drawRoomBase } from '../pixel/roomEngine.js';
import { TILE, COLS, ROWS, ROOM_W, ROOM_H } from '../pixel/roomGeom.js';

// Old-school top-down shop interior you can walk around (à la Pokémon Gold).
// Walk with arrows / WASD / the on-screen pad; press Space/Enter/▲ to interact
// with whatever you're facing: the bookshelf, the goods shelf, or the counter.
// Esc or walking out the bottom door leaves the shop.

// Room geometry (TILE/COLS/ROWS/ROOM_W/ROOM_H) is shared via roomGeom.js so the renderer
// and the placement migration can't drift.
const SCALE = 5; // on-screen upscale (larger modern screen); logical room stays 192×144
const SPEED = 1.0; // logical px per frame

// Ground floor — # wall · . floor · C counter · O owner · B/G shelves · D door · S stairs up
const SHOP_MAP = [
  '############',
  '#S...OO....#',
  '#S.CCCCC...#',
  '#..........#',
  '#B........G#',
  '#B........G#',
  '#..........#',
  '#..........#',
  '#####DD#####',
];
// Second floor (private) — X stairs down. The whole floor is open so the owner can
// place their own movable furniture anywhere (the old fixed bed/table/chair are gone).
const UP_MAP = [
  '############',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#....XX....#',
  '############',
];
const MAPS = { shop: SHOP_MAP, upstairs: UP_MAP };
const SOLID = new Set(['#', 'C', 'B', 'G', 'O', 'S', 'X']);
const tileIn = (map, c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? '#' : map[r][c]);

// Spawn points (logical px) when arriving on a floor.
const SPAWN = { shop: { x: 1.5 * TILE, y: 3.5 * TILE }, upstairs: { x: 5.5 * TILE, y: 6.5 * TILE } };

export default function ShopRoom({
  owner, walker, shop, ownerInv = [], creations = [], isOwn = false,
  myInv = [], onSendNote, onProposeTrade, onGift, toast, onLeave,
  editable = false, selected = null, onPlace, onMove, onPickup, onRotate, editFloor = 1,
}) {
  const floor1 = shop?.interior || [];
  const floor2 = shop?.interior2 || [];
  const shelfDef = shelfDefForShop(owner?.shopType);
  const shelfItems = shelfItemsFromInventory(ownerInv, shelfDef?.prefix);
  const shelfLabel = shelfDef?.label || 'Shelf';
  // The "regular" shelf shows things collected from other shops (traded in).
  const collectedItems = ownerInv.filter((i) => !shelfDef || !String(i.itemId).startsWith(`${shelfDef.prefix}:`));

  const wrapRef = useRef(null);
  const playerRef = useRef(null);
  const posRef = useRef({ x: 5.5 * TILE, y: 7.5 * TILE });
  const dirRef = useRef({ x: 0, y: 0 });
  const faceRef = useRef({ x: 0, y: 1 }); // facing down
  const stepRef = useRef(0);
  const leftRef = useRef(false);

  const [hint, setHint] = useState(null);
  const [panel, setPanel] = useState(null);
  const [floorState, setFloor] = useState('shop'); // walk-mode floor (stairs toggle it)
  // In the editor, the floor is controlled by MyShop's Floor 1/2 toggle (no walking).
  const floor = editable ? (editFloor === 2 ? 'upstairs' : 'shop') : floorState;
  const [flash, setFlash] = useState('');
  const mapRef = useRef(SHOP_MAP);
  const flashTimer = useRef(0);
  const shelfSprite = shelfDef?.sprite;

  const tileAt = (c, r) => tileIn(mapRef.current, c, r);

  // Resolve a placement's sprite already rotated by its `rot` (0–3 quarter-turns).
  const spriteFor = (itemId, rot) => { const s = placeableSprite(itemId, creations); return s ? rotateSprite(s, rot) : null; };

  // Solid furniture footprints on the current floor — you walk AROUND furniture (Pokémon-Gold).
  // Only category:'furniture' is solid; existing decor & creations stay walk-through.
  const solids = useMemo(() => (
    (floor === 'shop' ? floor1 : floor2)
      .map((p) => normalizePlacement(p, creations))
      .filter((p) => isSolid(p.itemId))
      .map((p) => { const s = spriteFor(p.itemId, p.rot); const { w, h } = s ? spriteSize(s) : { w: TILE, h: TILE }; return { x: p.x, y: p.y, w, h }; })
  ), [floor1, floor2, floor, creations]);
  const solidsRef = useRef(solids);
  solidsRef.current = solids;

  const solidAtPx = (x, y) => (
    SOLID.has(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)))
    || solidsRef.current.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)
  );

  function showFlash(msg) {
    setFlash(msg);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(''), 1500);
  }
  function goFloor(f) {
    mapRef.current = MAPS[f];
    posRef.current = { ...SPAWN[f] };
    dirRef.current = { x: 0, y: 0 };
    faceRef.current = { x: 0, y: 1 };
    setPanel(null);
    setFloor(f);
  }

  // --- furniture drag editor (editable mode) ---
  const boxRef = useRef(null);
  const ghostRef = useRef(null);
  const dragRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [selIdx, setSelIdx] = useState(null); // selected PLACED item (for rotate / to-bag)
  // Selection is an index into the current floor's array; reset it when the floor changes.
  useEffect(() => { setSelIdx(null); }, [editFloor]);

  const snap = (v, step) => Math.round(v / step) * step;
  const clampX = (x, w) => Math.max(TILE, Math.min(x, ROOM_W - TILE - w));
  const clampY = (y, h) => Math.max(TILE, Math.min(y, ROOM_H - TILE - h));
  // Anti-trap guard (kids on phones): a SOLID piece must not cover the spawn point or a
  // door tile, or the avatar could be boxed in when walk-mode resumes. Decor/floor tiles are
  // walk-through so they can never trap. The door row is mostly clamp-protected; spawn isn't.
  const wouldTrap = (itemId, x, y, w, h) => {
    if (!isSolid(itemId)) return false;
    const sp = SPAWN[floor];
    if (sp && sp.x >= x && sp.x < x + w && sp.y >= y && sp.y < y + h) return true;
    const map = MAPS[floor];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (map[r][c] !== 'D') continue;
      const dx = c * TILE, dy = r * TILE;
      if (x < dx + TILE && x + w > dx && y < dy + TILE && y + h > dy) return true;
    }
    return false;
  };
  const toLogical = (e) => {
    const rect = boxRef.current.getBoundingClientRect();
    return { lx: ((e.clientX - rect.left) / rect.width) * ROOM_W, ly: ((e.clientY - rect.top) / rect.height) * ROOM_H };
  };
  // Current placements with index + (rotated) size, for hit-testing.
  const placedNow = () => (floor === 'shop' ? floor1 : floor2)
    .map((p, i) => ({ i, ...normalizePlacement(p, creations) }))
    .map((o) => { const s = spriteFor(o.itemId, o.rot); return s ? { ...o, w: spriteSize(s).w, h: spriteSize(s).h } : null; })
    .filter(Boolean);
  const hitTest = (lx, ly) => {
    const all = placedNow();
    const objects = all.filter((o) => !isFloorTile(o.itemId)).sort((a, b) => (b.y + b.h) - (a.y + a.h)); // top-most first
    const tiles = all.filter((o) => isFloorTile(o.itemId));
    for (const o of [...objects, ...tiles]) if (lx >= o.x && lx < o.x + o.w && ly >= o.y && ly < o.y + o.h) return o;
    return null;
  };
  const drawGhost = (itemId, x, y, w, h, rot) => {
    const g = ghostRef.current; if (!g) return;
    g.width = w * SCALE; g.height = h * SCALE;
    const wrap = g.parentElement;
    wrap.style.left = `${(x / ROOM_W) * 100}%`;
    wrap.style.top = `${(y / ROOM_H) * 100}%`;
    wrap.style.width = `${(w / ROOM_W) * 100}%`;
    wrap.style.display = 'block';
    const ctx = g.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, g.width, g.height);
    const sprite = spriteFor(itemId, rot);
    if (sprite) drawSprite(ctx, sprite, ITEM_PALETTE, { scale: SCALE });
  };
  const hideGhost = () => { if (ghostRef.current) ghostRef.current.parentElement.style.display = 'none'; };

  const onEditPointerDown = (e) => {
    if (!editable) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const { lx, ly } = toLogical(e);
    const hit = hitTest(lx, ly);
    if (hit) {
      dragRef.current = { mode: 'move', i: hit.i, itemId: hit.itemId, w: hit.w, h: hit.h, rot: hit.rot, dx: lx - hit.x, dy: ly - hit.y, x: hit.x, y: hit.y, cx: e.clientX, cy: e.clientY, moved: false };
      drawGhost(hit.itemId, hit.x, hit.y, hit.w, hit.h, hit.rot);
      setDraggingIndex(hit.i);
    } else if (selected) {
      dragRef.current = { mode: 'place', cx: e.clientX, cy: e.clientY, moved: false };
    } else {
      dragRef.current = { mode: 'empty', cx: e.clientX, cy: e.clientY, moved: false }; // tap empty floor → deselect
    }
  };
  const onEditPointerMove = (e) => {
    const d = dragRef.current; if (!d) return;
    if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 4) d.moved = true;
    if (d.mode === 'move') {
      const { lx, ly } = toLogical(e);
      const step = isFloorTile(d.itemId) ? TILE : 8;
      d.x = clampX(snap(lx - d.dx, step), d.w);
      d.y = clampY(snap(ly - d.dy, step), d.h);
      drawGhost(d.itemId, d.x, d.y, d.w, d.h, d.rot);
    }
  };
  const onEditPointerUp = (e) => {
    const d = dragRef.current; dragRef.current = null;
    hideGhost(); setDraggingIndex(null);
    if (!d) return;
    if (d.mode === 'move') {
      if (!d.moved) { setSelIdx(d.i); return; } // tapped a piece → select it (rotate / to-bag below)
      if (wouldTrap(d.itemId, d.x, d.y, d.w, d.h)) { toast?.('Keep the doorway clear! 🚪'); return; } // reject → stays put
      onMove?.(d.i, d.x, d.y); setSelIdx(d.i); // dragged → reposition, keep it selected
    } else if (d.mode === 'place' && selected) {
      const s = placeableSprite(selected, creations); if (!s) return;
      const { w, h } = spriteSize(s);
      const { lx, ly } = toLogical(e);
      const step = isFloorTile(selected) ? TILE : 8;
      const x = clampX(snap(lx - Math.floor(w / 2), step), w), y = clampY(snap(ly - Math.floor(h / 2), step), h);
      if (wouldTrap(selected, x, y, w, h)) { toast?.('Keep the doorway clear! 🚪'); return; } // reject placement
      onPlace?.(selected, x, y); setSelIdx(null);
    } else if (d.mode === 'empty' && !d.moved) {
      setSelIdx(null); // tap blank floor → clear selection
    }
  };

  // --- static room art (redraws on floor / placements / shop change) ---
  const drawRoom = useMemo(() => (ctx, scale) => {
    const map = MAPS[floor];
    // Cozy tiled room base (wallpaper + plank floor + baseboard), themed per shop. Visual only.
    drawRoomBase(ctx, scale, resolveTheme(shop, owner, floor), { TILE, COLS, ROWS, ROOM_W, ROOM_H });

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = map[r][c];
        const x = c * TILE, y = r * TILE;
        if (t === 'C') {
          px(ctx, x, y, TILE, TILE, '#a9764f', scale);
          px(ctx, x, y, TILE, 3, '#c79468', scale);
          px(ctx, x, y + TILE - 3, TILE, 3, '#7d5538', scale);
        } else if (t === 'B') { // unique shelf — shows THIS shop's own sprite
          px(ctx, x, y, TILE, TILE, '#7d5538', scale);
          px(ctx, x + 1, y + TILE - 2, TILE - 2, 2, '#5a3a28', scale);
          if (shelfSprite) {
            const { w, h } = spriteSize(shelfSprite);
            drawSprite(ctx, shelfSprite, ITEM_PALETTE, { scale, ox: (x + Math.floor((TILE - w) / 2)) * scale, oy: (y + Math.floor((TILE - h) / 2)) * scale });
          }
        } else if (t === 'G') { // collected / regular shelf
          px(ctx, x, y, TILE, TILE, '#7d5538', scale);
          px(ctx, x + 2, y + 4, TILE - 4, 2, '#caa06e', scale);
          px(ctx, x + 2, y + 10, TILE - 4, 2, '#caa06e', scale);
        } else if (t === 'D') {
          px(ctx, x, y, TILE, TILE, '#b7d9c4', scale);
          px(ctx, x + 2, y + 5, TILE - 4, TILE - 8, '#9ec9b0', scale);
        } else if (t === 'S' || t === 'X') { // stone stairs that fade to black toward the top
          px(ctx, x, y, TILE, TILE, '#2a2018', scale); // deep stairwell
          const treads = ['#9aa0ab', '#7c828d', '#5d6470', '#444a54', '#2f343c']; // light → dark rising
          for (let i = 0; i < 5; i++) {
            const sy = y + TILE - 3 - i * 3; // bottom step first
            px(ctx, x + 2, sy, TILE - 4, 2, treads[i], scale); // lit tread (darkens upward)
            px(ctx, x + 2, sy + 2, TILE - 4, 1, '#1c160f', scale); // riser shadow
          }
        }
      }
    }

    // Placed items: normalize legacy {c,r} → {x,y} on load (preservation; never drops an entry).
    // Skip the item currently being dragged — the ghost overlay draws it instead.
    const placed = (floor === 'shop' ? floor1 : floor2)
      .map((p, i) => ({ i, ...normalizePlacement(p, creations) }))
      .filter((p) => p.i !== draggingIndex);
    // Layer 0 — floor tiles (custom creations): drawn flat, under everything, walkable.
    placed.forEach((p) => {
      if (!isFloorTile(p.itemId)) return;
      const sprite = spriteFor(p.itemId, p.rot);
      if (sprite) drawSprite(ctx, sprite, ITEM_PALETTE, { scale, ox: p.x * scale, oy: p.y * scale });
    });
    // Layer 1 — objects (decor + furniture): z-sorted by bottom edge so lower items draw in front.
    placed
      .filter((p) => !isFloorTile(p.itemId))
      .map((p) => ({ p, sprite: spriteFor(p.itemId, p.rot) }))
      .filter((o) => o.sprite)
      .sort((a, b) => (a.p.y + spriteSize(a.sprite).h) - (b.p.y + spriteSize(b.sprite).h))
      .forEach(({ p, sprite }) => drawSprite(ctx, sprite, ITEM_PALETTE, { scale, ox: p.x * scale, oy: p.y * scale }));

    // Selection highlight (editor): dashed outline around the chosen placed item.
    if (editable && selIdx != null) {
      const arr = floor === 'shop' ? floor1 : floor2;
      const sel = arr[selIdx] && normalizePlacement(arr[selIdx], creations);
      const s = sel && spriteFor(sel.itemId, sel.rot);
      if (s) {
        const { w, h } = spriteSize(s);
        ctx.save();
        ctx.strokeStyle = '#ef5da8'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.strokeRect(sel.x * scale + 1, sel.y * scale + 1, w * scale - 2, h * scale - 2);
        ctx.restore();
      }
    }
  }, [floor1, floor2, floor, shelfSprite, creations, owner?.shopType, shop?.interiorTheme, draggingIndex, editable, selIdx]);

  // --- walking loop (disabled while editing furniture) ---
  useEffect(() => {
    if (editable) return; // drag editor takes over; no walking
    let raf;
    const tick = () => {
      const d = dirRef.current;
      const moving = d.x !== 0 || d.y !== 0;
      const p = posRef.current;
      if (moving) {
        const nx = p.x + d.x * SPEED;
        if (!solidAtPx(nx, p.y)) p.x = nx;
        const ny = p.y + d.y * SPEED;
        if (!solidAtPx(p.x, ny)) p.y = ny;
        faceRef.current = Math.abs(d.x) >= Math.abs(d.y) ? { x: Math.sign(d.x), y: 0 } : { x: 0, y: Math.sign(d.y) };
        // walked onto the door → leave
        if (tileAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === 'D' && !leftRef.current) {
          leftRef.current = true;
          onLeave?.();
          return;
        }
      }
      stepRef.current = moving ? stepRef.current + 1 : 0;
      const phase = Math.floor(stepRef.current / 7) % 2;
      const step = moving ? (phase === 0 ? 1 : 2) : 0;

      const cv = playerRef.current;
      if (cv) {
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        drawAvatar(ctx, 3, walker || DEFAULT_AVATAR, 0, 0, { step });
        cv.parentElement.style.left = `${(p.x / ROOM_W) * 100}%`;
        cv.parentElement.style.top = `${(p.y / ROOM_H) * 100}%`;
        cv.parentElement.style.transform = `translate(-50%,-100%) scaleX(${faceRef.current.x < 0 ? -1 : 1})`;
      }

      // what are we facing?
      const fc = Math.floor((p.x + faceRef.current.x * TILE) / TILE);
      const fr = Math.floor((p.y + faceRef.current.y * TILE) / TILE);
      const t = tileAt(fc, fr);
      const near = t === 'B' ? 'shelf' : t === 'G' ? 'collected' : (t === 'C' || t === 'O') ? 'counter'
        : t === 'S' ? 'stairs' : t === 'X' ? 'stairsdown'
        : t === 'D' ? 'door' : null;
      setHint((prev) => (prev === near ? prev : near));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  function act() {
    if (hint === 'door') { onLeave?.(); return; }
    if (hint === 'stairs') { if (isOwn) goFloor('upstairs'); else showFlash("That's a private area 🚪"); return; }
    if (hint === 'stairsdown') { goFloor('shop'); return; }
    if (hint) setPanel(hint);
  }

  // keyboard (disabled while editing furniture)
  useEffect(() => {
    if (editable) return;
    const setAxis = (e, down) => {
      const k = e.key.toLowerCase();
      const d = dirRef.current;
      if (k === 'arrowleft' || k === 'a') d.x = down ? -1 : (d.x === -1 ? 0 : d.x);
      else if (k === 'arrowright' || k === 'd') d.x = down ? 1 : (d.x === 1 ? 0 : d.x);
      else if (k === 'arrowup' || k === 'w') d.y = down ? -1 : (d.y === -1 ? 0 : d.y);
      else if (k === 'arrowdown' || k === 's') d.y = down ? 1 : (d.y === 1 ? 0 : d.y);
      else return;
      e.preventDefault();
    };
    // Ignore game keys while typing (note box, trade selects, etc.) — otherwise
    // Space would close the panel and arrows would walk the avatar behind it.
    const typing = (e) => {
      const t = (e.target.tagName || '').toLowerCase();
      return t === 'input' || t === 'textarea' || t === 'select' || e.target.isContentEditable;
    };
    const onDown = (e) => {
      if (typing(e)) return;
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { setAxis(e, true); return; }
      if (k === ' ' || k === 'enter') { e.preventDefault(); if (panel) setPanel(null); else act(); }
      else if (k === 'escape') { e.preventDefault(); if (panel) setPanel(null); else if (floor === 'upstairs') goFloor('shop'); else onLeave?.(); }
    };
    const onUp = (e) => { if (!typing(e)) setAxis(e, false); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  });

  const hold = (x, y) => ({
    onPointerDown: () => { dirRef.current = { x, y }; },
    onPointerUp: () => { dirRef.current = { x: 0, y: 0 }; },
    onPointerLeave: () => { dirRef.current = { x: 0, y: 0 }; },
  });

  const HINT_LABEL = {
    shelf: shelfLabel, collected: 'Collected', counter: isOwn ? 'Counter' : `Talk to ${owner?.name}`,
    door: 'Leave', stairs: isOwn ? 'Go upstairs' : 'Private 🔒', stairsdown: 'Go downstairs',
  };

  // Editor: the currently-selected placed item (for the rotate / put-back toolbar).
  const selItem = (editable && selIdx != null) ? (floor === 'shop' ? floor1 : floor2)[selIdx] : null;

  return (
    <div ref={wrapRef} className="relative mx-auto w-full" style={{ maxWidth: ROOM_W * SCALE }}>
      <div ref={boxRef} className="relative" style={{ aspectRatio: `${ROOM_W} / ${ROOM_H}`, touchAction: editable ? 'none' : undefined }}
        {...(editable ? { onPointerDown: onEditPointerDown, onPointerMove: onEditPointerMove, onPointerUp: onEditPointerUp } : {})}>
        <PixelCanvas width={ROOM_W} height={ROOM_H} scale={SCALE} draw={drawRoom}
          style={{ width: '100%', height: '100%', display: 'block', borderRadius: 12, border: '3px solid #7d5538' }} />

        {/* drag ghost (editable mode): the item currently being dragged */}
        <div className="absolute" style={{ display: 'none', pointerEvents: 'none', transformOrigin: 'top left' }}>
          <canvas ref={ghostRef} style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', display: 'block', opacity: 0.9 }} />
        </div>

        {/* Owner standing behind the counter (only when visiting someone else, on the shop floor) */}
        {floor === 'shop' && !isOwn && owner?.avatar && (
          <div className="absolute" style={{ left: `${(5 * TILE / ROOM_W) * 100}%`, top: `${(2 * TILE / ROOM_H) * 100}%`, width: `${(1.7 * TILE / ROOM_W) * 100}%`, transform: 'translate(-50%,-100%)' }}>
            <Avatar data={owner.avatar} scale={3} style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }} className="bob" />
          </div>
        )}

        {/* The walker (you) — hidden while editing furniture */}
        {!editable && (
          <div className="absolute" style={{ width: `${(1.7 * TILE / ROOM_W) * 100}%`, transformOrigin: 'center bottom' }}>
            <canvas ref={playerRef} width={AVATAR_SIZE * 3} height={AVATAR_SIZE * 3}
              style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', display: 'block' }} />
          </div>
        )}

        {/* interaction hint */}
        {!editable && hint && !panel && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 pixel-text text-[10px] bg-peach text-paper rounded-full px-3 py-1 shadow-cozy bob">
            ▲ {HINT_LABEL[hint]}
          </div>
        )}

        {/* fleeting message (furniture / private area) */}
        {flash && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 panel px-3 py-1 text-xs text-ink shadow-panel">{flash}</div>
        )}

        {floor === 'upstairs' && (
          <div className="absolute top-1 right-2 pixel-text text-[10px] bg-lilac/90 text-ink rounded-full px-2 py-1">🛏️ 2nd floor</div>
        )}
      </div>

      {/* controls (walk mode) / instructions (edit mode) */}
      {!editable ? (
        <>
          <div className="flex items-end justify-between mt-3 select-none">
            <div className="grid grid-cols-3 gap-1 w-32">
              <span />
              <button {...hold(0, -1)} className="cozy-btn-primary !px-0 !py-2 touch-none">▲</button>
              <span />
              <button {...hold(-1, 0)} className="cozy-btn-primary !px-0 !py-2 touch-none">◀</button>
              <button {...hold(0, 1)} className="cozy-btn-primary !px-0 !py-2 touch-none">▼</button>
              <button {...hold(1, 0)} className="cozy-btn-primary !px-0 !py-2 touch-none">▶</button>
            </div>
            <button onClick={act} disabled={!hint} className={`cozy-btn-primary ${!hint ? 'opacity-40' : ''}`}>
              {hint === 'door' ? 'Leave' : 'Look ▲'}
            </button>
          </div>
          <p className="text-center text-xs text-inksoft mt-2">Arrows/WASD to walk · Space to look · Esc to leave</p>
        </>
      ) : (
        <>
          {selItem ? (
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <span className="pixel-text text-[10px] text-inksoft">{placeableName(selItem.itemId, creations)}</span>
              <button onClick={() => onRotate?.(selIdx)} className="cozy-btn-primary text-xs">↻ Rotate</button>
              <button onClick={() => { onPickup?.(selIdx); setSelIdx(null); }} className="cozy-btn-ghost text-xs">🎒 To bag</button>
            </div>
          ) : (
            <p className="text-center text-xs text-inksoft mt-3">
              {selected ? 'Tap the floor to place it · ' : ''}Drag to move · tap a piece to select it, then rotate or put it back
            </p>
          )}
        </>
      )}

      {panel && (
        <RoomPanel
          kind={panel} onClose={() => setPanel(null)}
          owner={owner} shop={shop} isOwn={isOwn} shelfItems={shelfItems} shelfLabel={shelfLabel} collectedItems={collectedItems}
          myInv={myInv} onSendNote={onSendNote} onProposeTrade={onProposeTrade} onGift={onGift} toast={toast}
        />
      )}
    </div>
  );
}

function RoomPanel({ kind, onClose, owner, shop, isOwn, shelfItems, shelfLabel, collectedItems, myInv, onSendNote, onProposeTrade, onGift, toast }) {
  const [note, setNote] = useState('');
  const [give, setGive] = useState(myInv[0]?.itemId || null);
  const [get, setGet] = useState(shelfItems[0]?.itemId || null);
  const [gift, setGift] = useState(myInv[0]?.itemId || null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 p-3" onClick={onClose}>
      <div className="panel p-5 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="pixel-text text-sm text-ink">
            {kind === 'shelf' ? `🗄️ ${shelfLabel}` : kind === 'collected' ? '🧺 Collected from friends' : isOwn ? '🪧 Your counter' : `💬 ${owner?.name}`}
          </h2>
          <button onClick={onClose} className="cozy-btn-ghost !px-3 !py-1 text-xs">Close ✕</button>
        </div>

        {kind === 'shelf' && (
          <ShelfGrid items={shelfItems} empty="Nothing on the shelf yet." />
        )}

        {kind === 'collected' && (
          <ShelfGrid items={collectedItems} empty={isOwn ? "You haven't collected anything from friends yet." : 'Nothing here yet.'} />
        )}

        {kind === 'counter' && (
          <div>
            <p className="text-ink mb-3">“{shop?.greeting || 'Welcome!'}”</p>
            {isOwn ? (
              <p className="text-inksoft text-sm">This is your counter. Use <strong>Setup</strong> to arrange your shop and edit your greeting.</p>
            ) : (
              <>
                <div className="mb-4">
                  <span className="pixel-text text-[10px] text-inksoft">Leave a note 💌</span>
                  <div className="flex gap-2 mt-1">
                    <input value={note} maxLength={100} onChange={(e) => setNote(e.target.value)}
                      placeholder="A short, friendly note…"
                      className="flex-1 rounded-xl border-[3px] border-parch bg-cream px-3 py-2 text-sm outline-none focus:border-peach" />
                    <button onClick={() => { if (note.trim()) { onSendNote?.(note.trim()); setNote(''); } }} className="cozy-btn-primary text-xs">Send</button>
                  </div>
                </div>
                {myInv.length > 0 && shelfItems.length > 0 && (
                  <div>
                    <span className="pixel-text text-[10px] text-inksoft">Propose a trade 🔄</span>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-1">
                      <select value={give || ''} onChange={(e) => setGive(e.target.value)}
                        className="rounded-xl border-[3px] border-parch bg-cream px-2 py-2 text-sm outline-none focus:border-peach">
                        {myInv.map(({ itemId, qty }) => <option key={itemId} value={itemId}>{resolveItem(itemId)?.name || itemId} (×{qty})</option>)}
                      </select>
                      <span className="text-inksoft">⇄</span>
                      <select value={get || ''} onChange={(e) => setGet(e.target.value)}
                        className="rounded-xl border-[3px] border-parch bg-cream px-2 py-2 text-sm outline-none focus:border-peach">
                        {shelfItems.map(({ itemId, qty }) => <option key={itemId} value={itemId}>{resolveItem(itemId)?.name || itemId} (×{qty})</option>)}
                      </select>
                    </div>
                    <div className="text-center mt-3">
                      <button onClick={() => onProposeTrade?.(give, get)} className="cozy-btn-primary text-xs">Send trade offer</button>
                    </div>
                  </div>
                )}
                {myInv.length > 0 && (
                  <div className="mt-4">
                    <span className="pixel-text text-[10px] text-inksoft">Give a gift 🎁</span>
                    <div className="flex gap-2 mt-1">
                      <select value={gift || ''} onChange={(e) => setGift(e.target.value)}
                        className="flex-1 rounded-xl border-[3px] border-parch bg-cream px-2 py-2 text-sm outline-none focus:border-peach">
                        {myInv.map(({ itemId, qty }) => <option key={itemId} value={itemId}>{resolveItem(itemId)?.name || itemId} (×{qty})</option>)}
                      </select>
                      <button onClick={() => onGift?.(gift)} className="cozy-btn-primary text-xs">Give</button>
                    </div>
                    <p className="text-[10px] text-inksoft mt-1">Gifts go straight to {owner?.name}'s bag — no swap needed.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
