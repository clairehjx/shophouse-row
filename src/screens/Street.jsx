import { useCallback, useEffect, useRef, useState } from 'react';
import PixelCanvas from '../components/PixelCanvas.jsx';
import { drawShophouse, SHOP_W, SHOP_H, SHOP_TYPE_MAP } from '../pixel/shophouse.js';
import { drawAvatar, AVATAR_SIZE } from '../pixel/avatar.js';
import { px } from '../pixel/engine.js';
import { resolveItem, SHOP_SIGNATURE_SPRITE } from '../pixel/items.js';
import api from '../data/api.js';

const STEP = SHOP_W + 8; // spacing between shophouses (logical px)
const PAD = 6;
const H = 104; // logical canvas height
const SCALE = 4;
const SPEED = 1.1; // logical px per frame
const AV_TOP = SHOP_H - 26; // avatar vertical placement (logical)
const ENTER_RANGE = SHOP_W * 0.6; // how close to a door counts as "in front"

// Shophouse Row — WALK your avatar along the street; the camera follows.
// ← → (or on-screen ◀ ▶) to walk, ▲ / Space / Enter to enter the shop you're at.
export default function Street({ session, onSelectShop, startAtId }) {
  const [players, setPlayers] = useState([]);
  const [shops, setShops] = useState({});
  const [hint, setHint] = useState(-1); // index of shop you can enter (or -1)
  const [jumpOpen, setJumpOpen] = useState(false);

  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const avatarRef = useRef(null); // the walking avatar <canvas>
  const xRef = useRef(PAD + SHOP_W / 2); // avatar centre (logical x)
  const dirRef = useRef(0); // -1 / 0 / 1
  const stepRef = useRef(0); // walk-cycle frame counter
  const playersRef = useRef([]);

  const totalW = PAD * 2 + Math.max(players.length, 1) * STEP;

  useEffect(() => {
    let alive = true;
    (async () => {
      const [ps, ss] = await Promise.all([api.listPlayers(), api.listShops()]);
      if (!alive) return;
      setPlayers(ps);
      playersRef.current = ps;
      setShops(Object.fromEntries(ss.map((s) => [s.ownerId, s])));
    })();
    return () => { alive = false; };
  }, [session]);

  // Place the avatar in front of the right shop once players are loaded: the shop
  // you just left (startAtId), else your own shop.
  useEffect(() => {
    if (!players.length) return;
    const target = startAtId || session.id;
    const idx = players.findIndex((p) => p.id === target);
    if (idx >= 0) xRef.current = PAD + idx * STEP + SHOP_W / 2;
  }, [players, startAtId, session.id]);

  // Static scene (shophouses + neighbours). Stable so it doesn't redraw per frame.
  const draw = useCallback(
    (ctx, scale) => {
      px(ctx, 0, SHOP_H, totalW, H - SHOP_H, '#e7d6b0', scale);
      px(ctx, 0, SHOP_H, totalW, 2, '#d8c49a', scale);
      for (let x = 4; x < totalW; x += 16) px(ctx, x, SHOP_H + 8, 8, 1, '#d8c49a', scale);

      players.forEach((p, i) => {
        const bx = PAD + i * STEP;
        const shop = shops[p.id];
        const type = SHOP_TYPE_MAP[p.shopType] || {};
        const claimed = !!p.shopType;
        drawShophouse(ctx, bx, 0, scale, {
          vacant: !claimed,
          wallType: p.shopType,
          awning: shop?.awningColor || type.awning,
          wall: shop?.wallColor || type.wall,
          roof: shop?.roofColor || type.roof,
          displaySprite: claimed ? (resolveItem(shop?.facadeItem)?.sprite || SHOP_SIGNATURE_SPRITE[p.shopType]) : null,
        });
        // Neighbours stand outside only when they're online (not the player — they walk).
        if (p.id !== session.id && p.online && p.avatar && p.setupComplete) {
          drawAvatar(ctx, scale, p.avatar, bx + SHOP_W / 2 - 16, AV_TOP);
        }
      });
    },
    [players, shops, totalW, session.id],
  );

  // Camera + animated avatar loop.
  useEffect(() => {
    let raf;
    const tick = () => {
      const wrap = wrapRef.current;
      const vw = wrap ? wrap.clientWidth / SCALE : 0;
      const maxX = totalW - PAD - SHOP_W / 2;
      const dir = dirRef.current;
      let x = Math.max(PAD + SHOP_W / 2, Math.min(maxX, xRef.current + dir * SPEED));
      xRef.current = x;

      // Walk cycle: advance frames only while moving; reset to idle when stopped.
      const moving = dir !== 0;
      stepRef.current = moving ? stepRef.current + 1 : 0;
      const phase = Math.floor(stepRef.current / 7) % 2; // 0 / 1
      const stepFrame = moving ? (phase === 0 ? 1 : 2) : 0;
      const facing = dir === -1 ? -1 : 1; // turn to travel; front when stopped/right
      const bob = moving && phase === 0 ? -2 : 0;

      const cv = avatarRef.current;
      if (cv) {
        const actx = cv.getContext('2d');
        actx.imageSmoothingEnabled = false;
        actx.clearRect(0, 0, cv.width, cv.height);
        drawAvatar(actx, SCALE, session.avatar, 0, 0, { step: stepFrame });
        cv.style.left = `${(x - 16) * SCALE}px`;
        cv.style.transform = `translateY(${bob}px) scaleX(${facing})`;
      }

      if (innerRef.current && vw > 0) {
        const cam = Math.max(0, Math.min(totalW - vw, x - vw / 2));
        innerRef.current.style.transform = `translateX(${-cam * SCALE}px)`;
      }

      const idx = Math.round((x - PAD - SHOP_W / 2) / STEP);
      const center = PAD + idx * STEP + SHOP_W / 2;
      const near = idx >= 0 && idx < playersRef.current.length && Math.abs(x - center) <= ENTER_RANGE ? idx : -1;
      setHint((prev) => (prev === near ? prev : near));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalW, session.avatar]);

  const enterShop = useCallback(() => {
    if (hint < 0) return;
    const p = playersRef.current[hint];
    if (p) onSelectShop(p, p.id === session.id);
  }, [hint, onSelectShop, session.id]);

  // Keyboard controls
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft') dirRef.current = -1;
      else if (e.key === 'ArrowRight') dirRef.current = 1;
      else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); enterShop(); }
    };
    const up = (e) => {
      if ((e.key === 'ArrowLeft' && dirRef.current === -1) || (e.key === 'ArrowRight' && dirRef.current === 1)) {
        dirRef.current = 0;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [enterShop]);

  const hold = (d) => ({
    onPointerDown: () => { dirRef.current = d; },
    onPointerUp: () => { dirRef.current = 0; },
    onPointerLeave: () => { if (dirRef.current === d) dirRef.current = 0; },
  });

  return (
    <div ref={wrapRef} className="relative h-full overflow-hidden select-none">
      {/* Moving world (camera translates this) */}
      <div ref={innerRef} className="absolute top-0 left-0 will-change-transform" style={{ height: H * SCALE }}>
        <PixelCanvas
          width={totalW}
          height={H}
          scale={SCALE}
          draw={draw}
          style={{ width: totalW * SCALE, height: H * SCALE }}
        />
        {players.map((p, i) => {
          const bx = PAD + i * STEP;
          const shop = shops[p.id];
          const type = SHOP_TYPE_MAP[p.shopType] || {};
          return (
            <div key={p.id}>
              <div
                className="absolute pixel-text flex items-center justify-center text-center text-cream leading-tight pointer-events-none"
                style={{
                  left: (bx + 5) * SCALE, top: 8 * SCALE, width: 46 * SCALE, height: 12 * SCALE,
                  fontSize: Math.max(9, Math.floor(2.4 * SCALE)), textShadow: '0 1px 0 rgba(0,0,0,0.35)',
                }}
              >
                {shop?.signText || type.name || 'Opening soon'}
              </div>
              <div className="absolute -translate-x-1/2 pointer-events-none"
                   style={{ left: (bx + SHOP_W / 2) * SCALE, top: (SHOP_H + 4) * SCALE }}>
                <span className="pixel-text bg-paper/90 border-2 border-parch rounded-full px-2 py-0.5 text-[10px] text-inksoft whitespace-nowrap">
                  {p.name}{p.isAdmin ? ' ★' : ''}
                </span>
              </div>
            </div>
          );
        })}

        {/* Player avatar (walks, animates, faces travel direction) */}
        <canvas
          ref={avatarRef}
          width={AVATAR_SIZE * SCALE}
          height={AVATAR_SIZE * SCALE}
          className="absolute"
          style={{ left: 0, top: AV_TOP * SCALE, imageRendering: 'pixelated', transformOrigin: 'center bottom' }}
        />
      </div>

      {/* On-screen controls (fixed to the viewport) */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-20">
        <button {...hold(-1)} aria-label="Walk left" className="cozy-btn-primary !px-5 !py-4 text-lg touch-none">◀</button>
        <button {...hold(1)} aria-label="Walk right" className="cozy-btn-primary !px-5 !py-4 text-lg touch-none">▶</button>
      </div>
      <div className="absolute bottom-4 right-4 z-20">
        <button onClick={enterShop} disabled={hint < 0}
                className={`cozy-btn-primary !px-5 !py-4 text-lg ${hint < 0 ? 'opacity-40' : ''}`}>
          ▲ Enter
        </button>
      </div>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pixel-text text-[10px] text-inksoft bg-paper/70 rounded-full px-3 py-1">
        ← → walk · ▲ enter
      </div>

      {/* Jump to — hop straight into any shop */}
      <div className="absolute top-2 right-3 z-30">
        <button onClick={() => setJumpOpen((v) => !v)} className="cozy-btn-primary !px-4 !py-2 text-xs">📍 Jump to</button>
        {jumpOpen && (
          <div className="panel p-2 mt-2 w-56 max-h-[60vh] overflow-y-auto">
            {players.map((p) => {
              const t = SHOP_TYPE_MAP[p.shopType] || {};
              const mine = session && p.id === session.id;
              const open = !!p.shopType;
              return (
                <button
                  key={p.id}
                  disabled={!open}
                  onClick={() => { setJumpOpen(false); onSelectShop(p, mine); }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    open ? 'hover:bg-cream text-ink' : 'opacity-40 cursor-not-allowed text-inksoft'
                  }`}
                >
                  <span className="text-lg">{t.emoji || '🚧'}</span>
                  <span className="flex-1 min-w-0 truncate">
                    {mine ? 'Your shop' : p.name}
                    <span className="block text-[10px] text-inksoft truncate">{open ? (shops[p.id]?.signText || t.name) : 'Opening soon'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
