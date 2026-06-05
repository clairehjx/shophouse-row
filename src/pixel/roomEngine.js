// Small, lightweight tile renderer for the shop interior (see InteriorPlan.MD, Part D).
// VISUAL ONLY — it never touches collision (SOLID / tileAt / the SHOP_MAP & UP_MAP arrays).
// Draws the cozy back-wall band + a tiled wood-plank floor, themed per shop. Fixtures and
// placed items are drawn on top by ShopRoom.
import { px } from './engine.js';

// Draw the room "base": wallpaper border + baseboard + plank floor over the interior.
// geom = { TILE, COLS, ROWS, ROOM_W, ROOM_H }. theme from themes.js.
export function drawRoomBase(ctx, scale, theme, geom) {
  const { TILE, COLS, ROWS, ROOM_W, ROOM_H } = geom;

  // 1) Whole room = wallpaper (the 1-tile border stays visible as the back/side walls).
  px(ctx, 0, 0, ROOM_W, ROOM_H, theme.wall, scale);
  // subtle wallpaper shading along the top for depth
  px(ctx, 0, 0, ROOM_W, 2, shade(theme.wall, -0.06), scale);

  // 2) Plank floor over the interior (cols 1..COLS-2, rows 1..ROWS-2). Horizontal planks:
  //    shade alternates per row; a thin seam tops each tile; staggered short vertical seams
  //    suggest plank ends — reads as a wood floor, not a checkerboard.
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      const x = c * TILE, y = r * TILE;
      px(ctx, x, y, TILE, TILE, r % 2 === 0 ? theme.floorA : theme.floorB, scale);
      px(ctx, x, y, TILE, 1, theme.seam, scale);                 // plank seam (row top)
      if ((r + c) % 3 === 0) px(ctx, x, y, 1, TILE, theme.seam, scale); // staggered end seam
    }
  }

  // 3) Baseboard trim where the back wall meets the floor.
  px(ctx, TILE, TILE, ROOM_W - 2 * TILE, 2, theme.base, scale);
}

// Lighten/darken a #rrggbb hex by a fraction (-1..1). Tiny helper, no deps.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 1 + amt : 1 - amt, add = amt < 0 ? 0 : 255 * amt;
  r = cl(r * f + add); g = cl(g * f + add); b = cl(b * f + add);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
