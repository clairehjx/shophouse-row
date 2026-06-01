// Tiny pixel-art engine.
//
// A "sprite" is an array of equal-length strings. Each character is a key into a
// "palette" object that maps the character to a CSS colour. The space ' ' and dot
// '.' characters are always transparent. This is the classic pixel-art encoding —
// readable in source, trivial to draw.
//
//   const PALETTE = { r: '#e74c3c', w: '#ffffff' }
//   const HEART = ['.r.r.', 'rrrrr', '.rrr.', '..r..']
//   drawSprite(ctx, HEART, PALETTE, { scale: 8 })

const TRANSPARENT = new Set([' ', '.']);

export function drawSprite(ctx, sprite, palette, opts = {}) {
  const { scale = 1, ox = 0, oy = 0 } = opts;
  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (TRANSPARENT.has(ch)) continue;
      const color = palette[ch];
      if (!color) continue; // unknown char -> transparent
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

// Logical (unscaled) width/height of a sprite grid.
export function spriteSize(sprite) {
  const h = sprite.length;
  const w = sprite.reduce((m, row) => Math.max(m, row.length), 0);
  return { w, h };
}

// Filled rounded-ish rect helper for procedural scenes (drawn in logical px).
export function px(ctx, x, y, w, h, color, scale = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}
