// Procedural 32×32 chibi avatar. Layered parts are drawn as pixel rectangles so
// we get loads of combinations from a little code. avatarData shape:
//   { skin:int, hairStyle:int, hairColor:int, outfit:int, accessory:int }
import { px } from './engine.js';
import { shade } from './shophouse.js';

export const AVATAR_SIZE = 32;

export const SKIN_TONES = [
  '#ffe0bd', '#f6c79b', '#e3a774', '#c68642', '#8d5524',
];

export const HAIR_COLORS = [
  '#2b2118', '#5a3a22', '#8a5a2b', '#c98f3f', '#eccb6a',
  '#d94f4f', '#f4a9c7', '#c7b6e8', '#7fb8e0', '#ededed',
];

export const HAIR_STYLES = [
  'short', 'bob', 'long', 'ponytail', 'twintails', 'bun', 'curly', 'buzz',
];

export const OUTFITS = [
  { key: 'tee',      name: 'Tee',       color: '#7fb8e0' },
  { key: 'dress',    name: 'Dress',     color: '#f4a9c7' },
  { key: 'hoodie',   name: 'Hoodie',    color: '#8fc7a0' },
  { key: 'overalls', name: 'Overalls',  color: '#6f86c6' },
  { key: 'stripes',  name: 'Stripes',   color: '#f4a96b' },
  { key: 'sweater',  name: 'Sweater',   color: '#c7b6e8' },
  { key: 'tank',     name: 'Tank top',  color: '#f6c875' },
  { key: 'jacket',   name: 'Jacket',    color: '#e89aa5' },
];

export const ACCESSORIES = ['none', 'bow', 'hat'];

// Shared clothing/accessory swatches — outfit and accessory colours are chosen
// from the same friendly palette.
export const OUTFIT_COLORS = [
  '#7fb8e0', '#4a90d9', '#8fc7a0', '#5b9b6f', '#f4a9c7',
  '#e2604f', '#f4a96b', '#f6c875', '#c7b6e8', '#fff8ea',
];
export const ACCESSORY_COLORS = OUTFIT_COLORS;

export function randomAvatar(seed = 0) {
  const r = (n, mod) => (Math.floor(Math.abs(Math.sin(seed * 9301 + n * 49297) * 233280)) % mod);
  return {
    skin: r(1, SKIN_TONES.length),
    hairStyle: r(2, HAIR_STYLES.length),
    hairColor: r(3, HAIR_COLORS.length),
    outfit: r(4, OUTFITS.length),
    outfitColor: r(6, OUTFIT_COLORS.length),
    accessory: r(5, ACCESSORIES.length),
    accessoryColor: r(7, ACCESSORY_COLORS.length),
  };
}

export const DEFAULT_AVATAR = {
  skin: 1, hairStyle: 1, hairColor: 0,
  outfit: 0, outfitColor: 0, accessory: 0, accessoryColor: 4,
};

// Draw a full avatar at logical offset (ox, oy) on a pixel canvas.
// opts.step: 0 = idle (front), 1/2 = walk frames (legs stride).
export function drawAvatar(ctx, scale, a = DEFAULT_AVATAR, ox = 0, oy = 0, opts = {}) {
  const P = (x, y, w, h, color) => px(ctx, ox + x, oy + y, w, h, color, scale);

  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[1];
  const skinD = shade(skin, -0.16);
  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0];
  const hairD = shade(hair, -0.28);
  const outfit = OUTFITS[a.outfit] ?? OUTFITS[0];
  const cloth = OUTFIT_COLORS[a.outfitColor] ?? outfit.color;
  const clothD = shade(cloth, -0.18);
  const clothHi = shade(cloth, 0.16);
  const shoe = '#5a3a22';
  const eye = '#3a2a20';
  const blush = '#f4a9c7';

  // ---- Legs + shoes (animated when walking) ----
  const step = opts.step || 0;
  if (step === 0) {
    P(12, 24, 3, 5, skin);
    P(17, 24, 3, 5, skin);
    P(11, 29, 4, 2, shoe);
    P(17, 29, 4, 2, shoe);
  } else if (step === 1) {
    // left leg strides forward (lower), right leg lifts back (raised)
    P(12, 24, 3, 6, skin);
    P(11, 30, 4, 2, shoe);
    P(17, 24, 3, 4, skin);
    P(17, 28, 4, 2, shoe);
  } else {
    // mirror stride
    P(12, 24, 3, 4, skin);
    P(12, 28, 4, 2, shoe);
    P(17, 24, 3, 6, skin);
    P(18, 30, 4, 2, shoe);
  }

  // ---- Arms (skin) ----
  P(8, 16, 3, 7, skin);
  P(21, 16, 3, 7, skin);
  P(8, 22, 3, 1, skinD);
  P(21, 22, 3, 1, skinD);

  // ---- Torso / outfit ----
  P(11, 15, 10, 10, cloth);
  P(11, 23, 10, 2, clothD);
  P(9, 15, 2, 3, cloth); // shoulders / short sleeves
  P(21, 15, 2, 3, cloth);
  drawOutfitDetail(P, outfit.key, { cloth, clothD, clothHi });

  // ---- Head ----
  P(12, 3, 8, 2, skin);
  P(11, 5, 10, 9, skin);
  P(11, 13, 10, 1, skinD); // chin shadow
  // ears
  P(10, 9, 1, 2, skin);
  P(21, 9, 1, 2, skin);

  // ---- Face ----
  P(13, 9, 1, 2, eye);
  P(18, 9, 1, 2, eye);
  P(12, 11, 1, 1, blush);
  P(19, 11, 1, 1, blush);
  P(15, 12, 2, 1, skinD); // mouth

  // ---- Hair (over head) ----
  drawHair(P, a.hairStyle, { hair, hairD });

  // ---- Accessory (top-most) ----
  const accCol = ACCESSORY_COLORS[a.accessoryColor] ?? ACCESSORY_COLORS[0];
  drawAccessory(P, ACCESSORIES[a.accessory] || 'none', accCol);
}

function drawOutfitDetail(P, key, c) {
  switch (key) {
    case 'overalls':
      P(13, 15, 1, 9, c.clothD);
      P(18, 15, 1, 9, c.clothD);
      P(14, 18, 4, 4, c.clothHi);
      break;
    case 'stripes':
      P(11, 17, 10, 1, c.clothHi);
      P(11, 20, 10, 1, c.clothHi);
      break;
    case 'hoodie':
      P(11, 14, 10, 2, c.clothD); // hood collar
      P(14, 19, 4, 4, c.clothD); // pocket
      break;
    case 'dress':
      P(10, 22, 12, 3, c.cloth); // flared hem
      P(10, 24, 12, 1, c.clothD);
      break;
    case 'jacket':
      P(15, 15, 2, 9, c.clothHi); // zipper line
      break;
    case 'tank':
      P(12, 14, 2, 2, c.clothD); // thin straps gap
      P(18, 14, 2, 2, c.clothD);
      break;
    case 'sweater':
      P(11, 23, 10, 1, c.clothHi); // ribbed hem
      break;
    default:
      break; // plain tee
  }
}

function drawHair(P, styleIdx, { hair, hairD }) {
  const style = HAIR_STYLES[styleIdx] || 'short';
  // common fringe / cap
  const cap = () => {
    P(11, 2, 10, 4, hair);
    P(10, 4, 2, 4, hair);
    P(20, 4, 2, 4, hair);
    P(12, 5, 2, 1, hairD);
    P(17, 5, 2, 1, hairD);
  };
  switch (style) {
    case 'buzz':
      P(11, 3, 10, 2, hair);
      P(11, 4, 10, 1, hairD);
      break;
    case 'short':
      cap();
      break;
    case 'bob':
      cap();
      P(9, 7, 2, 6, hair);
      P(21, 7, 2, 6, hair);
      break;
    case 'long':
      cap();
      P(9, 7, 2, 13, hair);
      P(21, 7, 2, 13, hair);
      P(9, 19, 2, 1, hairD);
      P(21, 19, 2, 1, hairD);
      break;
    case 'ponytail':
      cap();
      P(21, 6, 3, 2, hair);
      P(23, 7, 2, 9, hair);
      P(23, 15, 2, 1, hairD);
      break;
    case 'twintails':
      cap();
      P(8, 6, 3, 2, hair);
      P(8, 7, 2, 8, hair);
      P(21, 6, 3, 2, hair);
      P(22, 7, 2, 8, hair);
      break;
    case 'bun':
      cap();
      P(14, 0, 4, 3, hair);
      P(15, 0, 2, 1, hairD);
      break;
    case 'curly':
      P(11, 2, 10, 4, hair);
      P(10, 3, 1, 2, hair);
      P(21, 3, 1, 2, hair);
      P(9, 5, 2, 4, hair);
      P(21, 5, 2, 4, hair);
      P(12, 2, 2, 1, hairD);
      P(17, 2, 2, 1, hairD);
      break;
    default:
      cap();
  }
}

function drawAccessory(P, kind, col) {
  const hi = shade(col, 0.35);
  const dk = shade(col, -0.2);
  switch (kind) {
    case 'bow':
      // centred bow on top of the head
      P(13, 1, 3, 4, col);
      P(17, 1, 3, 4, col);
      P(16, 2, 1, 2, dk); // knot
      P(13, 2, 1, 1, hi);
      P(19, 2, 1, 1, hi);
      break;
    case 'hat':
      P(8, 4, 16, 2, dk);   // brim
      P(11, 0, 10, 4, col); // crown
      P(11, 0, 3, 1, hi);   // highlight
      P(11, 3, 10, 1, dk);  // band shadow
      break;
    default:
      break; // none
  }
}
