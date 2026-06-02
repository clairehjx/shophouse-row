// Shop types + a procedural shophouse facade renderer.
import { px, drawSprite, spriteSize } from './engine.js';
import { SHOP_ICONS, ICON_PALETTE } from './icons.js';

// The 12 shop types from the game plan. Each has a cozy default colour scheme.
// `awning` / `wall` / `roof` are facade defaults a player can later recolour.
export const SHOP_TYPES = [
  { key: 'bakery',    name: 'Bakery',        emoji: '🍰', sells: 'Food & recipes',          awning: '#f1a7b8', wall: '#fbe6d4', roof: '#c97b63' },
  { key: 'florist',   name: 'Florist',       emoji: '🌸', sells: 'Plants & bouquets',       awning: '#e89aa5', wall: '#fdeef2', roof: '#b5677a' },
  { key: 'bookshop',  name: 'Bookshop',      emoji: '📚', sells: 'Books & letters',         awning: '#7fb8e0', wall: '#e4eef7', roof: '#4a6d99' },
  { key: 'craft',     name: 'Craft Shop',    emoji: '🧶', sells: 'Yarn & accessories',      awning: '#d9a6d4', wall: '#f3e6f4', roof: '#9a6b96' },
  { key: 'teahouse',  name: 'Bubble Tea Shop',emoji: '🧋', sells: 'Bubble tea & cosy seats', awning: '#8fc7a0', wall: '#e6f3ea', roof: '#5b9b6f' },
  { key: 'art',       name: 'Art Studio',    emoji: '🎨', sells: 'Decor, frames & paint',   awning: '#f4a96b', wall: '#fdeede', roof: '#c97b3f' },
  { key: 'grocer',    name: 'Grocer',        emoji: '🛒', sells: 'Produce & pantry goods',  awning: '#9ed66b', wall: '#eef7df', roof: '#6f9b3f' },
  { key: 'petshop',   name: 'Pet Shop',      emoji: '🐾', sells: 'Pets, toys & treats',     awning: '#f6c875', wall: '#fdf3da', roof: '#c79a3f' },
  { key: 'sweet',     name: 'Sweet Shop',    emoji: '🧁', sells: 'Candy & colourful decor', awning: '#f4a9c7', wall: '#fde6ef', roof: '#cf6f9b' },
  { key: 'garden',    name: 'Garden Shop',   emoji: '🪴', sells: 'Outdoor items & gnomes',  awning: '#7fc6a0', wall: '#e6f4ec', roof: '#4f9b6f' },
  { key: 'music',     name: 'Music Shop',    emoji: '🎵', sells: 'Instruments & records',   awning: '#c7b6e8', wall: '#efeafa', roof: '#7a66b6' },
  { key: 'snowglobe', name: 'Snowglobe Shop',emoji: '🔮', sells: 'Snowglobes & collectibles',awning: '#9fd6e8', wall: '#e6f4fa', roof: '#4f93b0' },
  { key: 'toy',       name: 'Toy Shop',      emoji: '🧸', sells: 'Toys & games',            awning: '#f6a8b0', wall: '#fdeef0', roof: '#cf6f7f' },
  { key: 'car',       name: 'Car Shop',      emoji: '🚗', sells: 'Toy cars & racers',       awning: '#e2604f', wall: '#fdeae6', roof: '#b0503f' },
  { key: 'soda',      name: 'Soda Shop',     emoji: '🥤', sells: 'Fizzy sodas & flavours',  awning: '#f4a96b', wall: '#fdeede', roof: '#c97b3f' },
];

export const SHOP_TYPE_MAP = Object.fromEntries(SHOP_TYPES.map((s) => [s.key, s]));

// Fixed left→right street order (Claire H. & Chloe centred among the 13). The Street
// sorts players by this so positions are static in both local and cloud backends.
export const STREET_ORDER = [
  'cayden', 'jean', 'yiran', 'yifei', 'iris', 'grace', 'jeanette',
  'claireh', 'chloe',
  'clairey', 'vera', 'keira', 'laura', 'sharmaine', 'caleb',
];
export const streetIndex = (id) => {
  const i = STREET_ORDER.indexOf(id);
  return i < 0 ? STREET_ORDER.length : i; // unknown ids go to the end
};

// Awning recolour options offered in the facade editor.
export const AWNING_COLORS = [
  '#f1a7b8', '#e89aa5', '#e2604f', '#f4a96b', '#f6c875', '#9ed66b',
  '#8fc7a0', '#7fb8e0', '#4a90d9', '#9fd6e8', '#c7b6e8', '#d9a6d4',
];

// Logical footprint of one shophouse (unscaled pixels).
export const SHOP_W = 56;
export const SHOP_H = 80;

// Mix a hex colour toward black (amt<0) or white (amt>0), amt in [-1, 1].
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  r = Math.round(r + (t - r) * k);
  g = Math.round(g + (t - g) * k);
  b = Math.round(b + (t - b) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Draw one shophouse facade with top-left at logical (bx, by).
// opts: { wallType (shop key for the window icon), awning, wall, roof, displayIcon }
export function drawShophouse(ctx, bx, by, scale, opts) {
  const awning = opts.awning;
  const wall = opts.wall;
  const wallDark = shade(wall, -0.12);
  const roof = opts.roof;
  const trim = shade(roof, -0.18);
  const wood = '#a9764f';
  const woodDark = '#7d5538';
  const glass = '#bfe3f0';
  const cream = '#fff8ea';
  const X = (x) => bx + x;
  const Y = (y) => by + y;

  // Roof trim
  px(ctx, X(0), Y(0), SHOP_W, 6, roof, scale);
  px(ctx, X(0), Y(5), SHOP_W, 2, trim, scale);

  // Sign board (text overlaid in HTML by the Street)
  px(ctx, X(5), Y(8), 46, 12, wood, scale);
  px(ctx, X(5), Y(8), 46, 2, shade(wood, 0.18), scale);
  px(ctx, X(5), Y(18), 46, 2, woodDark, scale);

  // Upper wall + window
  px(ctx, X(2), Y(20), 52, 17, wall, scale);
  px(ctx, X(21), Y(23), 14, 12, woodDark, scale);
  px(ctx, X(23), Y(25), 10, 8, glass, scale);
  px(ctx, X(27), Y(25), 2, 8, cream, scale); // window divider
  px(ctx, X(23), Y(28), 10, 1, shade(glass, 0.25), scale);

  // Awning — alternating stripes
  for (let i = 0; i < SHOP_W; i += 8) {
    px(ctx, X(i), Y(37), 4, 9, awning, scale);
    px(ctx, X(i + 4), Y(37), 4, 9, cream, scale);
  }
  // Scalloped bottom edge
  for (let i = 0; i < SHOP_W; i += 8) {
    const c = (i / 8) % 2 === 0 ? awning : cream;
    px(ctx, X(i + 1), Y(46), 6, 2, c, scale);
    px(ctx, X(i + 2), Y(48), 4, 1, c, scale);
  }

  // Ground floor wall
  px(ctx, X(2), Y(49), 52, 29, wallDark, scale);

  if (opts.vacant) {
    // Shuttered door — rolled-down slats
    px(ctx, X(8), Y(55), 15, 23, woodDark, scale);
    for (let sy = 57; sy < 78; sy += 3) px(ctx, X(9), Y(sy), 13, 2, '#b9a98a', scale);
    // Boarded display window
    px(ctx, X(28), Y(53), 23, 23, woodDark, scale);
    px(ctx, X(30), Y(55), 19, 19, '#cdbf9f', scale);
    px(ctx, X(30), Y(60), 19, 2, woodDark, scale); // plank
    px(ctx, X(30), Y(67), 19, 2, woodDark, scale);
    px(ctx, X(2), Y(76), 52, 4, woodDark, scale); // step
    return;
  }

  // Door
  px(ctx, X(8), Y(55), 15, 23, woodDark, scale);
  px(ctx, X(10), Y(57), 11, 21, wood, scale);
  px(ctx, X(13), Y(58), 5, 7, glass, scale); // door window
  px(ctx, X(18), Y(67), 2, 2, '#f6c875', scale); // knob

  // Shop display window
  px(ctx, X(28), Y(53), 23, 23, woodDark, scale);
  px(ctx, X(30), Y(55), 19, 19, glass, scale);
  px(ctx, X(30), Y(55), 19, 2, shade(glass, 0.3), scale); // glare
  // Product on display — centred inside the window and clipped so it can't spill.
  const display = opts.displaySprite || SHOP_ICONS[opts.wallType];
  if (display) {
    const winX = 30, winY = 55, winW = 19, winH = 19;
    const { w, h } = spriteSize(display);
    const dx = winX + Math.floor((winW - w) / 2);
    const dy = winY + Math.floor((winH - h) / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(winX) * scale, Y(winY) * scale, winW * scale, winH * scale);
    ctx.clip();
    drawSprite(ctx, display, ICON_PALETTE, { scale, ox: X(dx) * scale, oy: Y(dy) * scale });
    ctx.restore();
  }

  // Step + little potted plant by the door
  px(ctx, X(2), Y(76), 52, 4, woodDark, scale);
  px(ctx, X(45), Y(70), 6, 6, '#b07a4f', scale); // pot
  px(ctx, X(44), Y(64), 8, 7, '#8fc7a0', scale); // leaves
  px(ctx, X(46), Y(62), 4, 4, '#a8d6b4', scale);
}
