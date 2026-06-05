// Cozy interior themes for the shop room (see InteriorPlan.MD, Part F).
// A theme tints the back wall + baseboard + the two plank-floor shades. By default a
// shop's interior is themed from its own facade colours (SHOP_TYPES wall/roof), so each
// shop feels personal; an owner can later override via shop.interiorTheme (picker = Phase 5).
import { SHOP_TYPES } from './shophouse.js';

const BY_KEY = Object.fromEntries(SHOP_TYPES.map((s) => [s.key, s]));

// Warm wood plank floor (ground) and a cooler cream one (upstairs).
const WOOD_WARM = { floorA: '#d8b98c', floorB: '#cfae7e', seam: '#b9925f' };
const WOOD_COOL = { floorA: '#e7d6c0', floorB: '#ddc9ad', seam: '#c9b48f' };

// Named presets for the theme picker. Each carries its OWN floor (floorA/floorB/seam) so the
// whole room — not just the thin wall border — visibly changes when you pick a theme.
// `null`/'default' = derive from the shop (the cozy wood floor).
export const THEMES = {
  rose:  { wall: '#fde6ef', base: '#cf6f9b', floorA: '#f6d9e2', floorB: '#efc9d6', seam: '#d98aa8' },
  mint:  { wall: '#e6f3ea', base: '#5b9b6f', floorA: '#d8ecdd', floorB: '#c7e1ce', seam: '#8fc7a0' },
  sky:   { wall: '#e4eef7', base: '#4a6d99', floorA: '#dcEAF6', floorB: '#cfe0f0', seam: '#7fb8e0' },
  lilac: { wall: '#efeafa', base: '#7a66b6', floorA: '#e7e0f6', floorB: '#d9cef0', seam: '#c7b6e8' },
  sand:  { wall: '#fdeede', base: '#c97b3f', floorA: '#f3e2c6', floorB: '#e9d2ab', seam: '#c9a06e' },
};

// Derive a theme from the shop type (coordinated with the facade) — cozy wood floor.
export function defaultThemeFor(shopType, floor = 'shop') {
  const t = BY_KEY[shopType];
  const wood = floor === 'upstairs' ? WOOD_COOL : WOOD_WARM;
  return { wall: t?.wall || '#f1e3d3', base: t?.roof || '#8a5d3c', ...wood };
}

// Resolve the theme to draw: an explicit picker choice if set (incl. its floor), else the
// per-shop wood default.
export function resolveTheme(shop, owner, floor = 'shop') {
  const preset = shop?.interiorTheme && THEMES[shop.interiorTheme];
  if (preset) return preset;
  return defaultThemeFor(owner?.shopType, floor);
}
