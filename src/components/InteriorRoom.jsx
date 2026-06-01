import { useMemo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { drawSprite, spriteSize } from '../pixel/engine.js';
import { placeableSprite, ITEM_PALETTE } from '../pixel/items.js';

// Shared shop interior. Editable in My Shop (onCell place/remove); read-only when
// visiting a friend. All grid geometry lives here. The room scales to fit its
// container (never overflows the panel) — cells are positioned as % of the room.
export const COLS = 6;
export const ROWS = 4;
const CELL = 18;
const PADX = 6;
const WALL = 14;
export const ROOM_W = PADX * 2 + COLS * CELL;
export const ROOM_H = WALL + ROWS * CELL + 8;
const SCALE = 4; // intrinsic pixel scale; CSS then fits it to the container

const pct = (n, total) => `${(n / total) * 100}%`;

export default function InteriorRoom({ placements = [], creations = [], editable = false, onCell }) {
  const draw = useMemo(() => (ctx, scale) => {
    ctx.fillStyle = '#ead9c2'; ctx.fillRect(0, 0, ROOM_W * scale, WALL * scale);
    for (let x = 0; x < ROOM_W; x += 8) { ctx.fillStyle = '#e0cbac'; ctx.fillRect(x * scale, 0, 2 * scale, WALL * scale); }
    ctx.fillStyle = '#c79a64'; ctx.fillRect(0, WALL * scale, ROOM_W * scale, (ROOM_H - WALL) * scale);
    for (let y = WALL; y < ROOM_H; y += 9) { ctx.fillStyle = '#b98c58'; ctx.fillRect(0, y * scale, ROOM_W * scale, 1 * scale); }
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      ctx.fillStyle = 'rgba(74,58,46,0.10)';
      const gx = (PADX + c * CELL) * scale, gy = (WALL + r * CELL) * scale;
      ctx.fillRect(gx, gy + CELL * scale - scale, CELL * scale, scale);
      ctx.fillRect(gx + CELL * scale - scale, gy, scale, CELL * scale);
    }
    placements.forEach(({ itemId, c, r }) => {
      const sprite = placeableSprite(itemId, creations);
      if (!sprite) return;
      const { w, h } = spriteSize(sprite);
      const ox = (PADX + c * CELL + Math.floor((CELL - w) / 2)) * scale;
      const oy = (WALL + r * CELL + (CELL - h)) * scale;
      drawSprite(ctx, sprite, ITEM_PALETTE, { scale, ox, oy });
    });
  }, [placements, creations]);

  return (
    <div
      className="relative mx-auto w-full"
      style={{ maxWidth: ROOM_W * SCALE, aspectRatio: `${ROOM_W} / ${ROOM_H}` }}
    >
      <PixelCanvas
        width={ROOM_W} height={ROOM_H} scale={SCALE} draw={draw}
        style={{ width: '100%', height: '100%', display: 'block', borderRadius: 12 }}
      />
      {editable && Array.from({ length: COLS * ROWS }).map((_, k) => {
        const c = k % COLS, r = Math.floor(k / COLS);
        return (
          <button key={k} onClick={() => onCell?.(c, r)} aria-label={`cell ${c},${r}`}
            className="absolute hover:bg-white/20 rounded"
            style={{
              left: pct(PADX + c * CELL, ROOM_W),
              top: pct(WALL + r * CELL, ROOM_H),
              width: pct(CELL, ROOM_W),
              height: pct(CELL, ROOM_H),
            }} />
        );
      })}
    </div>
  );
}
