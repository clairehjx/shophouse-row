import { useEffect, useMemo, useRef, useState } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import Avatar from './Avatar.jsx';
import ShelfGrid from './ShelfGrid.jsx';
import { px, drawSprite, spriteSize } from '../pixel/engine.js';
import { drawAvatar, AVATAR_SIZE, DEFAULT_AVATAR } from '../pixel/avatar.js';
import { placeableSprite, resolveItem, ITEM_PALETTE, shelfDefForShop, shelfItemsFromInventory } from '../pixel/items.js';

// Old-school top-down shop interior you can walk around (à la Pokémon Gold).
// Walk with arrows / WASD / the on-screen pad; press Space/Enter/▲ to interact
// with whatever you're facing: the bookshelf, the goods shelf, or the counter.
// Esc or walking out the bottom door leaves the shop.

const TILE = 16;
const COLS = 12;
const ROWS = 9;
const ROOM_W = COLS * TILE;
const ROOM_H = ROWS * TILE;
const SCALE = 4;
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
// Second floor (private) — E bed · T table · H chair · X stairs down. The centre
// (cols 3–8, rows 3–6) is kept clear so the owner can place items there too.
const UP_MAP = [
  '############',
  '#EE......TT#',
  '#EE......HH#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#....XX....#',
  '############',
];
const MAPS = { shop: SHOP_MAP, upstairs: UP_MAP };
const SOLID = new Set(['#', 'C', 'B', 'G', 'O', 'S', 'E', 'T', 'H', 'X']);
const tileIn = (map, c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? '#' : map[r][c]);

// Spawn points (logical px) when arriving on a floor.
const SPAWN = { shop: { x: 1.5 * TILE, y: 3.5 * TILE }, upstairs: { x: 5.5 * TILE, y: 6.5 * TILE } };

// Display region for the owner's placed decorations (matches the 6×4 setup grid).
const DISP_C0 = 3;
const DISP_R0 = 3;
const FURNITURE_MSG = { E: 'A comfy bed 🛏️', T: 'A little table', H: 'A cosy chair' };

export default function ShopRoom({
  owner, walker, shop, ownerInv = [], creations = [], isOwn = false,
  myInv = [], onSendNote, onProposeTrade, onGift, toast, onLeave,
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
  const [floor, setFloor] = useState('shop'); // 'shop' | 'upstairs'
  const [flash, setFlash] = useState('');
  const mapRef = useRef(SHOP_MAP);
  const faceTileRef = useRef('.');
  const flashTimer = useRef(0);
  const shelfSprite = shelfDef?.sprite;

  const tileAt = (c, r) => tileIn(mapRef.current, c, r);
  const solidAtPx = (x, y) => SOLID.has(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));

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

  // --- static room art (redraws on floor / placements / shop change) ---
  const drawRoom = useMemo(() => (ctx, scale) => {
    const map = MAPS[floor];
    const wallCol = floor === 'upstairs' ? '#6a5a7a' : '#6f4a30';
    px(ctx, 0, 0, ROOM_W, ROOM_H, wallCol, scale);
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        const warm = floor === 'upstairs'
          ? ((r + c) % 2 === 0 ? '#e7d6c0' : '#ddc9ad')
          : ((r + c) % 2 === 0 ? '#d8b98c' : '#cfae7e');
        px(ctx, c * TILE, r * TILE, TILE, TILE, warm, scale);
      }
    }
    px(ctx, TILE, TILE, ROOM_W - 2 * TILE, 3, floor === 'upstairs' ? '#574766' : '#8a5d3c', scale);

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
        } else if (t === 'S' || t === 'X') { // stairs — ascending steps (narrower as they rise)
          px(ctx, x, y, TILE, TILE, '#5a3e28', scale); // dark stairwell
          for (let i = 0; i < 4; i++) {
            const sy = y + TILE - 4 - i * 3;
            const sw = TILE - 3 - i * 2;
            px(ctx, x + 2, sy, sw, 2, '#efe0c2', scale); // light tread
            px(ctx, x + 2, sy + 2, sw, 1, '#2f2114', scale); // riser shadow
          }
        } else if (t === 'E') { // bed
          px(ctx, x, y, TILE, TILE, '#caa0b4', scale);
          px(ctx, x, y, TILE, 5, '#fff8ea', scale);
        } else if (t === 'T') { // table
          px(ctx, x + 1, y + 3, TILE - 2, TILE - 6, '#a9764f', scale);
          px(ctx, x + 1, y + 3, TILE - 2, 2, '#c79468', scale);
        } else if (t === 'H') { // chair
          px(ctx, x + 3, y + 2, TILE - 6, 3, '#b9895f', scale);
          px(ctx, x + 3, y + 5, TILE - 6, TILE - 8, '#caa06e', scale);
        }
      }
    }

    const placed = floor === 'shop' ? floor1 : floor2;
    placed.forEach(({ itemId, c, r }) => {
      const sprite = placeableSprite(itemId, creations);
      if (!sprite) return;
      const { w, h } = spriteSize(sprite);
      const ox = (DISP_C0 + c) * TILE + Math.floor((TILE - w) / 2);
      const oy = (DISP_R0 + r) * TILE + (TILE - h) - 1;
      drawSprite(ctx, sprite, ITEM_PALETTE, { scale, ox: ox * scale, oy: oy * scale });
    });
  }, [floor1, floor2, floor, shelfSprite, creations]);

  // --- walking loop ---
  useEffect(() => {
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
      faceTileRef.current = t;
      const near = t === 'B' ? 'shelf' : t === 'G' ? 'collected' : (t === 'C' || t === 'O') ? 'counter'
        : t === 'S' ? 'stairs' : t === 'X' ? 'stairsdown' : (t === 'E' || t === 'T' || t === 'H') ? 'furniture'
        : t === 'D' ? 'door' : null;
      setHint((prev) => (prev === near ? prev : near));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function act() {
    if (hint === 'door') { onLeave?.(); return; }
    if (hint === 'stairs') { if (isOwn) goFloor('upstairs'); else showFlash("That's a private area 🚪"); return; }
    if (hint === 'stairsdown') { goFloor('shop'); return; }
    if (hint === 'furniture') { showFlash(FURNITURE_MSG[faceTileRef.current] || 'Cosy.'); return; }
    if (hint) setPanel(hint);
  }

  // keyboard
  useEffect(() => {
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
    const onDown = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { setAxis(e, true); return; }
      if (k === ' ' || k === 'enter') { e.preventDefault(); if (panel) setPanel(null); else act(); }
      else if (k === 'escape') { e.preventDefault(); if (panel) setPanel(null); else if (floor === 'upstairs') goFloor('shop'); else onLeave?.(); }
    };
    const onUp = (e) => setAxis(e, false);
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
    door: 'Leave', stairs: isOwn ? 'Go upstairs' : 'Private 🔒', stairsdown: 'Go downstairs', furniture: 'Look',
  };

  return (
    <div ref={wrapRef} className="relative mx-auto w-full" style={{ maxWidth: ROOM_W * SCALE }}>
      <div className="relative" style={{ aspectRatio: `${ROOM_W} / ${ROOM_H}` }}>
        <PixelCanvas width={ROOM_W} height={ROOM_H} scale={SCALE} draw={drawRoom}
          style={{ width: '100%', height: '100%', display: 'block', borderRadius: 12, border: '3px solid #7d5538' }} />

        {/* Owner standing behind the counter (only when visiting someone else, on the shop floor) */}
        {floor === 'shop' && !isOwn && owner?.avatar && (
          <div className="absolute" style={{ left: `${(5 * TILE / ROOM_W) * 100}%`, top: `${(2 * TILE / ROOM_H) * 100}%`, width: `${(1.7 * TILE / ROOM_W) * 100}%`, transform: 'translate(-50%,-100%)' }}>
            <Avatar data={owner.avatar} scale={3} style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }} className="bob" />
          </div>
        )}

        {/* The walker (you) */}
        <div className="absolute" style={{ width: `${(1.7 * TILE / ROOM_W) * 100}%`, transformOrigin: 'center bottom' }}>
          <canvas ref={playerRef} width={AVATAR_SIZE * 3} height={AVATAR_SIZE * 3}
            style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', display: 'block' }} />
        </div>

        {/* interaction hint */}
        {hint && !panel && (
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

      {/* controls */}
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
