// Item catalogue. Signature items reuse the shop icons; generic items add a few
// shared treasures. Sprites use the shared ICON_PALETTE. Keep this small (~20)
// at launch per the game plan; expand later.
import { SHOP_ICONS, ICON_PALETTE } from './icons.js';
import { spriteSize } from './engine.js';
import { TILE, ROOM_W, ROOM_H, DISP_C0, DISP_R0 } from './roomGeom.js';

export { ICON_PALETTE as ITEM_PALETTE };

// ---- Extra generic item sprites (12 wide) ----
const bread = [
  '............',
  '...nnnnnn...',
  '..nccccccn..',
  '.nccccccccn.',
  '.nccnccnccn.',
  '.nccccccccn.',
  '..nccccccn..',
  '...nnnnnn...',
];
const gift = [
  '....y..y....',
  '.....yy.....',
  '.rrrrrrrrr..',
  '.rryrryyrr..',
  '.rrrrrrrrr..',
  '.rryrryyrr..',
  '.rrrrrrrrr..',
  '............',
];
const jar = [
  '...kkkk.....',
  '...kssk.....',
  '..kwwwwk....',
  '.kwyyyywk...',
  '.kwyyyywk...',
  '.kwyyyywk...',
  '.kwwwwwwk...',
  '..kkkkkk....',
];
const candle = [
  '.....o......',
  '....oyo.....',
  '.....k......',
  '....www.....',
  '....wcw.....',
  '....wcw.....',
  '....wcw.....',
  '....www.....',
];
const mug = [
  '.kkkkk......',
  '.kwwwkkk....',
  '.kwttwkk....',
  '.kwttwkk....',
  '.kwttwk.....',
  '.kwwwwk.....',
  '.kkkkkk.....',
];
const crystal = [
  '....k.......',
  '...kuk......',
  '..kuuuk.....',
  '.kuuuuuk....',
  '.kuuuuuk....',
  '..kuuuk.....',
  '...kuk......',
  '....k.......',
];
const star = [
  '.....y......',
  '....yyy.....',
  '.yyyyyyyyy..',
  '..yyyyyyy...',
  '...yyyyy....',
  '..yy...yy...',
];
const heart = [
  '.pp...pp....',
  'pppp.pppp...',
  'ppppppppp...',
  '.pppppppp...',
  '..pppppp....',
  '...pppp.....',
  '....pp......',
];
const teapot = [
  '...kkkk.....',
  '..kwwwwk....',
  '.kwttttwkk..',
  '.kwttttwk.k.',
  '.kwttttwkk..',
  '.kwwwwwwk...',
  '..kkkkkk....',
];
const ribbon = [
  '.r.....r....',
  'rrr...rrr...',
  '.rrr.rrr....',
  '..rrmrr.....',
  '.rrr.rrr....',
  'rrr...rrr...',
  '.r.....r....',
];

// --- bookshop: a single titled book + stationery ---
const book = [
  '.kkkkkkk....',
  '.kuuuuuk....',
  '.kuwwwuk....',
  '.kuwwwuk....',
  '.kuuuuuk....',
  '.kuuuuuk....',
  '.kkkkkkk....',
  '..wwwww.....',
];
const notebooks = [
  '..k.k.k.....',
  '.kkkkkkkk...',
  '.kooooook...',
  '.kowwwwok...',
  '.kowwwwok...',
  '.kkkkkkkk...',
  '.kbbbbbbk...',
  '.kkkkkkkk...',
];
const pen = [
  '.........ky.',
  '........kbk.',
  '.......kbk..',
  '......kbk...',
  '.....kbk....',
  '....kbk.....',
  '...kbk......',
  '..kk........',
];
const pencil = [
  '....k.......',
  '...kok......',
  '...kyk......',
  '...kyk......',
  '...kyk......',
  '...kyk......',
  '...kpk......',
  '...kkk......',
];
const ruler = [
  'kkkkkkkkkkk.',
  'kykykykykyk.',
  'kyyyyyyyyyk.',
  'kykykykykyk.',
  'kkkkkkkkkkk.',
];
const eraser = [
  '.kkkkkk.....',
  '.kwwwwk.....',
  '.kppppk.....',
  '.kppppk.....',
  '.kkkkkk.....',
];

// --- one shared sprite per shop's creatable shelf kind ---
const vinyl = [
  '...kkkk.....',
  '..kkkkkk....',
  '.kkk..kkk...',
  '.kk.rr.kk...',
  '.kk.rr.kk...',
  '.kkk..kkk...',
  '..kkkkkk....',
  '...kkkk.....',
];
const candy = [
  '.k........k.',
  '.kk.mmmm.kk.',
  '..k.mmmm.k..',
  '..k.mmmm.k..',
  '.kk.mmmm.kk.',
  '.k........k.',
];
const can = [
  '.kkkkkkk....',
  '.ksssssk....',
  '.kwwwwwk....',
  '.kwrrrwk....',
  '.kwrrrwk....',
  '.kwwwwwk....',
  '.kkkkkkk....',
];
const seed = [
  '.kkkkkk.....',
  '.kwwwwk.....',
  '.kwGGwk.....',
  '.kwgGwk.....',
  '.kwwwwk.....',
  '.kwwwwk.....',
  '.kkkkkk.....',
];
const bubbleTea = [
  '......pp....',
  '......pp....',
  '.kkkkkkkk...',
  '.kcccccck...',
  '.kcccccck...',
  '.kckckckk...',
  '.kkkkkkkk...',
];
const petfood = [
  '...o..o.....',
  '..o.oo.o....',
  '.kkkkkkkk...',
  '.kwoooowk...',
  '.kwoooowk...',
  '.kwwwwwwk...',
  '..kkkkkk....',
];
const toybox = [
  '..r..b......',
  '.kkkkkkk....',
  '.kyyyyyk....',
  '.kybbbyk....',
  '.kyyyyyk....',
  '.kyrrryk....',
  '.kkkkkkk....',
];
const car = [
  '............',
  '....kkkkk...',
  '...kwwwwwk..',
  '.kkkkkkkkkk.',
  '.krrrrrrrrk.',
  '.kkkkkkkkkk.',
  '..kk....kk..',
  '..kk....kk..',
];
const soda = [
  '....b.......',
  '....b.......',
  '.kkkkkk.....',
  '.krwrrk.....',
  '.krrwrk.....',
  '.krrrwk.....',
  '.kwrrrk.....',
  '.kkkkkk.....',
];

// Sprite for any titled book (item id "book:<title>"). Exported for resolveItem.
export const BOOK_SPRITE = book;

// One creatable "shelf kind" per shop type. Items are "<prefix>:<name>" and all
// share one sprite (the name is the variation) — just like the bookshelf.
// `eat` marks food/drink the character can consume. `main` is the palette char that
// gets recoloured when the owner picks a colour for a new item.
export const SHELF = {
  book:    { shopType: 'bookshop',  sprite: book,                label: 'Bookshelf',      noun: 'book',     placeholder: 'Add a book title…',          main: 'u' },
  vinyl:   { shopType: 'music',     sprite: vinyl,               label: 'Vinyl shelf',    noun: 'vinyl',    placeholder: 'Add a vinyl…',               main: 'r' },
  yarn:    { shopType: 'craft',     sprite: SHOP_ICONS.craft,    label: 'Yarn shelf',     noun: 'yarn',     placeholder: 'Add a yarn colour…',         main: 'm' },
  candy:   { shopType: 'sweet',     sprite: candy,               label: 'Candy shelf',    noun: 'candy',    placeholder: 'Add a candy flavour…',       main: 'm', eat: 'Ate' },
  can:     { shopType: 'grocer',    sprite: can,                 label: 'Tin can shelf',  noun: 'tin can',  placeholder: 'Add a tin can…',             main: 'r', eat: 'Ate' },
  seed:    { shopType: 'garden',    sprite: seed,                label: 'Seed shelf',     noun: 'seed',     placeholder: 'Add a seed packet…',         main: 'G' },
  bread:   { shopType: 'bakery',    sprite: bread,               label: 'Bread shelf',    noun: 'loaf',     placeholder: 'Add a bread flavour…',       main: 'c', eat: 'Ate' },
  tea:     { shopType: 'teahouse',  sprite: bubbleTea,           label: 'Bubble tea shelf',noun: 'bubble tea',placeholder: 'Add a bubble tea flavour…', main: 'c', eat: 'Sipped' },
  paint:   { shopType: 'art',       sprite: SHOP_ICONS.art,      label: 'Paint shelf',    noun: 'paint',    placeholder: 'Add a paint colour…',        main: 'r' },
  flower:  { shopType: 'florist',   sprite: SHOP_ICONS.florist,  label: 'Flower shelf',   noun: 'flower',   placeholder: 'Add a flower…',              main: 'p' },
  petfood: { shopType: 'petshop',   sprite: petfood,             label: 'Pet food shelf', noun: 'pet food', placeholder: 'Add a pet food…',            main: 'o' },
  globe:   { shopType: 'snowglobe', sprite: SHOP_ICONS.snowglobe,label: 'Snowglobe shelf',noun: 'snowglobe',placeholder: 'Add a snowglobe…',           main: 'B' },
  toy:     { shopType: 'toy',       sprite: toybox,              label: 'Toy box shelf',  noun: 'toy box',  placeholder: 'Add a toy…',                 main: 'y' },
  car:     { shopType: 'car',       sprite: car,                 label: 'Car shelf',      noun: 'car',      placeholder: 'Add a car…',                 main: 'r' },
  soda:    { shopType: 'soda',      sprite: soda,                label: 'Soda shelf',     noun: 'soda',     placeholder: 'Add a soda flavour…',        main: 'r', eat: 'Sipped' },
};

// Colour choices offered when making a new unique item.
export const SHELF_COLORS = ['#e2604f', '#f4a96b', '#f6c875', '#8fc7a0', '#6fc6c0', '#7fb8e0', '#c7b6e8', '#f4a9c7'];

// Is this item edible/drinkable? Returns the verb ('Ate'/'Sipped') or null.
export function edibleVerb(itemId) {
  if (typeof itemId !== 'string' || !itemId.includes(':')) return null;
  return SHELF[itemId.slice(0, itemId.indexOf(':'))]?.eat || null;
}
const SHELF_FOR_SHOP = Object.fromEntries(Object.entries(SHELF).map(([prefix, d]) => [d.shopType, { prefix, ...d }]));
export const SHOP_SIGNATURE_SPRITE = Object.fromEntries(Object.entries(SHELF).map(([, d]) => [d.shopType, d.sprite]));

export function shelfDefForShop(shopType) { return SHELF_FOR_SHOP[shopType] || null; }
export function shelfItemsFromInventory(inv = [], prefix) {
  if (!prefix) return [];
  return inv.filter((i) => typeof i.itemId === 'string' && i.itemId.startsWith(`${prefix}:`));
}
export function isShelfItem(itemId) {
  if (typeof itemId !== 'string' || !itemId.includes(':')) return false;
  return !!SHELF[itemId.slice(0, itemId.indexOf(':'))];
}

// Stock pixel images everyone starts with for decorating (shared, not "sold" goods).
export const DECOR_ITEMS = ['gift', 'candle', 'star', 'heart', 'mug', 'jar', 'teapot', 'crystal', 'ribbon', 'plant'];

// Editor grid size for custom creations.
export const CREATE_SIZE = 12;

// Resolve a *placeable* item's sprite — a stock item OR a player's custom creation
// ("creation:<id>"). Creations use the same ITEM_PALETTE as everything else.
export function placeableSprite(itemId, creations = []) {
  const r = resolveItem(itemId);
  if (r) return r.sprite;
  if (typeof itemId === 'string' && itemId.startsWith('creation:')) return creations.find((c) => c.id === itemId.slice(9))?.sprite || null;
  return null;
}
export function placeableName(itemId, creations = []) {
  const r = resolveItem(itemId);
  if (r) return r.name;
  if (typeof itemId === 'string' && itemId.startsWith('creation:')) return creations.find((c) => c.id === itemId.slice(9))?.name || 'Creation';
  return itemId;
}

// --- Placement layer / solidity (derived from the itemId, never stored) ---
// Floor tiles = custom pixel creations: drawn flat under everything, walkable.
export function isFloorTile(itemId) { return typeof itemId === 'string' && itemId.startsWith('creation:'); }
// Furniture = the 24px catalogue pieces: solid (you walk around them).
export function isFurniture(itemId) { return resolveItem(itemId)?.category === 'furniture'; }
export function isSolid(itemId) { return isFurniture(itemId); }

// --- Rotation (furniture & floor tiles) -------------------------------------
// Rotation is stored on the placement as `rot` ∈ {0,1,2,3} = number of 90° clockwise
// turns. It's additive: legacy entries have no `rot` (→ 0) and still render exactly.
function rotate90(sprite) {
  const h = sprite.length;
  const w = Math.max(...sprite.map((r) => r.length));
  const pad = sprite.map((r) => r.padEnd(w, '.'));
  const out = [];
  for (let c = 0; c < w; c++) {           // new row = old column, bottom-up → CW turn
    let row = '';
    for (let r = h - 1; r >= 0; r--) row += pad[r][c];
    out.push(row);
  }
  return out;
}
export function normRot(rot) { return Number.isInteger(rot) ? ((rot % 4) + 4) % 4 : 0; }
// Rotate a char-array sprite by `rot` quarter-turns. rot 1/3 swap width<->height.
export function rotateSprite(sprite, rot = 0) {
  let s = sprite;
  for (let k = 0, n = normRot(rot); k < n; k++) s = rotate90(s);
  return s;
}

// Normalize a placement to the free {itemId,x,y,rot} shape (x,y = sprite top-left, logical px).
// Legacy {itemId,c,r} entries convert using ShopRoom's EXACT old offsets so they land on the
// identical on-screen pixel; out-of-bounds entries are CLAMPED, never dropped (preservation).
export function normalizePlacement(p, creations = []) {
  const itemId = p.itemId;
  const rot = normRot(p.rot);
  const base = placeableSprite(itemId, creations);
  const sprite = base ? rotateSprite(base, rot) : null; // size after rotation (rot 1/3 swap w/h)
  const { w, h } = sprite ? spriteSize(sprite) : { w: TILE, h: TILE };
  let x, y;
  if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
    x = p.x; y = p.y;
  } else {
    const c = p.c || 0, r = p.r || 0;
    x = (DISP_C0 + c) * TILE + Math.floor((TILE - w) / 2);
    y = (DISP_R0 + r) * TILE + (TILE - h) - 1;
  }
  // Clamp into the floor bounds (keeps furniture off the 1-tile wall border).
  x = Math.max(TILE, Math.min(x, ROOM_W - TILE - w));
  y = Math.max(TILE, Math.min(y, ROOM_H - TILE - h));
  return { itemId, x, y, rot };
}

// Rotate a placement one quarter-turn clockwise, keeping its CENTRE fixed (feels natural
// when w/h swap), then re-clamp into bounds. Returns a clean {itemId,x,y,rot} entry.
export function rotatePlacement(p, creations = []) {
  const base = normalizePlacement(p, creations); // {itemId,x,y,rot}
  const s0 = placeableSprite(base.itemId, creations);
  if (!s0) return base;
  const before = spriteSize(rotateSprite(s0, base.rot));
  const rot = normRot(base.rot + 1);
  const after = spriteSize(rotateSprite(s0, rot));
  const cx = base.x + before.w / 2, cy = base.y + before.h / 2;
  return normalizePlacement(
    { itemId: base.itemId, x: Math.round(cx - after.w / 2), y: Math.round(cy - after.h / 2), rot },
    creations,
  );
}

// --- Furniture: bigger placeholder sprites (real art comes later from gen-furniture.py).
// Wider than the 12-wide decor and bottom-aligned. category:'furniture' = solid (see InteriorPlan.MD).
const armchair = [
  '...NNNNNNNNNN...',
  '..NffffffffffN..',
  '..NffffffffffN..',
  '..NffffffffffN..',
  '.NNffffffffffNN.',
  '.NfWWWWWWWWWWfN.',
  '.NfWWWWWWWWWWfN.',
  '.NfWWWWWWWWWWfN.',
  '.NNNNNNNNNNNNNN.',
  '.NN........NN...',
  '.NN........NN...',
];
const sofa = [
  '....NNNNNNNNNNNNNNNN....',
  '...NffffffffffffffffN...',
  '...NffffffffffffffffN...',
  '..NNffffffffffffffffNN..',
  '..NfWWWWWWWWWWWWWWWWfN..',
  '..NfWWWWWWWWWWWWWWWWfN..',
  '..NfWWWWWWWWWWWWWWWWfN..',
  '..NfWWWWWWWWWWWWWWWWfN..',
  '..NNNNNNNNNNNNNNNNNNNN..',
  '..NN................NN..',
  '..NN................NN..',
];
// Generated by scripts/gen-furniture.py (gemini-3.5-flash) and hand-curated:
// top-down bed — headboard, two pillows, lit linen blanket → rose duvet, dark footboard.
const bed = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........kkkkkkkk........',
  '.......kWWWWWWWWk.......',
  '......kWWWWWWWWWWk......',
  '.....kWWWWWWWWWWWWk.....',
  '.....kNNNNNNNNNNNNk.....',
  '.....kNllllNNllllNk.....',
  '.....kNwwwwNNwwwwNk.....',
  '.....kNccccNNccccNk.....',
  '.....kllllllllllllk.....',
  '.....kwwwwwwwwwwwwk.....',
  '.....kcccccccccccck.....',
  '.....kFffffffffffFk.....',
  '.....kFffffffffffFk.....',
  '.....kFffffffffffFk.....',
  '.....kFffffffffffFk.....',
  '.....kFFFFFFFFFFFFk.....',
  '.....kFFFFFFFFFFFFk.....',
  '.....kFFFFFFFFFFFFk.....',
  '.....kdNNddddddNNdk.....',
  '.....kkkkkkkkkkkkkk.....',
];
const roundTable = [
  '...WWWWWWWWWW...',
  '..WWWWWWWWWWWW..',
  '.WWWWWWWWWWWWWW.',
  '.NNNNNNNNNNNNNN.',
  '......NNNN......',
  '......NNNN......',
  '......NNNN......',
  '....NNNNNNNN....',
  '...NNNNNNNNNN...',
];
const bookshelf = [
  'NNNNNNNNNNNNNNNNNN',
  'NbbbbrrrruuuuggggN',
  'NbbbbrrrruuuuggggN',
  'NNNNNNNNNNNNNNNNNN',
  'NggggbbbbrrrruuuuN',
  'NggggbbbbrrrruuuuN',
  'NNNNNNNNNNNNNNNNNN',
  'NuuuuggggbbbbrrrrN',
  'NuuuuggggbbbbrrrrN',
  'NNNNNNNNNNNNNNNNNN',
  'NrrrruuuuggggbbbbN',
  'NrrrruuuuggggbbbbN',
  'NNNNNNNNNNNNNNNNNN',
];
const lamp = [
  '...llll...',
  '..llllll..',
  '.llllllll.',
  'llllllllll',
  '....NN....',
  '....NN....',
  '....NN....',
  '....NN....',
  '....NN....',
  '....NN....',
  '....NN....',
  '....NN....',
  '...NNNN...',
  '..NNNNNN..',
];
const rug = [
  '........FFFFFFFF........',
  '.....FFFFFFFFFFFFFF.....',
  '...FFFllllllllllllFFF...',
  '..FFllllllllllllllllFF..',
  '..FllllllllllllllllllF..',
  '..FllllllllllllllllllF..',
  '..FFllllllllllllllllFF..',
  '...FFFllllllllllllFFF...',
  '.....FFFFFFFFFFFFFF.....',
  '........FFFFFFFF........',
];
const planter = [
  '.....ee.......',
  '...eeEEee.....',
  '..eeeEEeeee...',
  '.eeeeeEEeeeee.',
  '.eeeeeeeeeeee.',
  '..eeeeeeeeee..',
  '.....EE.......',
  '.....EE.......',
  '...nnnnnnnn...',
  '...nWWWWWWn...',
  '....nWWWWn....',
  '....nWWWWn....',
  '.....nnnn.....',
];

// Placeable furniture ids (listed in the bag/editor furniture palette).
export const FURNITURE_IDS = ['armchair', 'sofa', 'bed', 'table', 'bookshelf', 'lamp', 'rug', 'planter'];

// Starter floor-tile patterns for the Floor Tile Designer. These are NOT catalogue items —
// they're just CREATE_SIZE (12×12) example pictures you can load into the editor and tweak,
// alongside your own saved tiles. Keep each row exactly 12 chars.
export const FLOOR_TILE_TEMPLATES = [
  { id: 'tile:wood', name: 'Wood planks', sprite: [
    'WWWWWWWWWWWW', 'WWWWWWWWWWWW', 'WWWWWWWWWWWW', 'NNNNNNNNNNNN',
    'nnnnnnnnnnnn', 'nnnnnnnnnnnn', 'nnnnnnnnnnnn', 'NNNNNNNNNNNN',
    'WWWWWWWWWWWW', 'WWWWWWWWWWWW', 'WWWWWWWWWWWW', 'NNNNNNNNNNNN',
  ] },
  { id: 'tile:checker', name: 'Checker', sprite: [
    'wwsswwsswwss', 'wwsswwsswwss', 'sswwsswwssww', 'sswwsswwssww',
    'wwsswwsswwss', 'wwsswwsswwss', 'sswwsswwssww', 'sswwsswwssww',
    'wwsswwsswwss', 'wwsswwsswwss', 'sswwsswwssww', 'sswwsswwssww',
  ] },
  { id: 'tile:brick', name: 'Brick', sprite: [
    'rrrrrkrrrrrk', 'rrrrrkrrrrrk', 'kkkkkkkkkkkk', 'rrkrrrrrkrrr',
    'rrkrrrrrkrrr', 'kkkkkkkkkkkk', 'rrrrrkrrrrrk', 'rrrrrkrrrrrk',
    'kkkkkkkkkkkk', 'rrkrrrrrkrrr', 'rrkrrrrrkrrr', 'kkkkkkkkkkkk',
  ] },
  { id: 'tile:water', name: 'Water', sprite: [
    'bbbbbbbbbbbb', 'bBbbbbBbbbbb', 'bbbbbbbbbbbb', 'bbbbBbbbbBbb',
    'bbbbbbbbbbbb', 'bBbbbbBbbbbb', 'bbbbbbbbbbbb', 'bbbbBbbbbBbb',
    'bbbbbbbbbbbb', 'bBbbbbBbbbbb', 'bbbbbbbbbbbb', 'bbbbBbbbbBbb',
  ] },
  { id: 'tile:grass', name: 'Grass', sprite: [
    'gggggggggggg', 'gGgggggGgggg', 'gggggggggggg', 'ggggGgggggGg',
    'gggggggggggg', 'gGgggggGgggg', 'gggggggggggg', 'ggggGgggggGg',
    'gggggggggggg', 'gGgggggGgggg', 'gggggggggggg', 'ggggGgggggGg',
  ] },
  { id: 'tile:rug', name: 'Pink rug', sprite: [
    'FFFFFFFFFFFF', 'FffffffffffF', 'FfllllllllfF', 'FflwwwwwwlfF',
    'FflwwwwwwlfF', 'FflwwwwwwlfF', 'FflwwwwwwlfF', 'FflwwwwwwlfF',
    'FfllllllllfF', 'FffffffffffF', 'FFFFFFFFFFFF', 'FFFFFFFFFFFF',
  ] },
  { id: 'tile:stars', name: 'Starry', sprite: [
    'uuuuuuuuuuuu', 'uuuuuwuuuuuu', 'uuuuuuuuuuuu', 'uuwuuuuuuwuu',
    'uuuuuuuuuuuu', 'uuuuuuuwuuuu', 'uuuuuuuuuuuu', 'uwuuuuuuuuuu',
    'uuuuuuuuuuuu', 'uuuuuwuuuuuu', 'uuuuuuuuuuuu', 'uuuuuuuuuwuu',
  ] },
];

export const ITEMS = [
  // signature (icon-backed)
  { id: 'cake', name: 'Cake', category: 'food', sprite: SHOP_ICONS.bakery },
  { id: 'flower', name: 'Flower', category: 'plant', sprite: SHOP_ICONS.florist },
  { id: 'yarn', name: 'Yarn', category: 'craft', sprite: SHOP_ICONS.craft },
  { id: 'tea', name: 'Tea', category: 'drink', sprite: SHOP_ICONS.teahouse },
  { id: 'palette', name: 'Paint palette', category: 'art', sprite: SHOP_ICONS.art },
  { id: 'apple', name: 'Apple', category: 'produce', sprite: SHOP_ICONS.grocer },
  { id: 'kitten', name: 'Kitten', category: 'pet', sprite: SHOP_ICONS.petshop },
  { id: 'cupcake', name: 'Cupcake', category: 'sweet', sprite: SHOP_ICONS.sweet },
  { id: 'plant', name: 'Potted plant', category: 'garden', sprite: SHOP_ICONS.garden },
  { id: 'note', name: 'Music note', category: 'music', sprite: SHOP_ICONS.music },
  { id: 'snowglobe', name: 'Snowglobe', category: 'collectible', sprite: SHOP_ICONS.snowglobe },
  // generic treasures
  { id: 'bread', name: 'Bread', category: 'food', sprite: bread },
  { id: 'gift', name: 'Gift box', category: 'gift', sprite: gift },
  { id: 'jar', name: 'Jar of honey', category: 'pantry', sprite: jar },
  { id: 'candle', name: 'Candle', category: 'decor', sprite: candle },
  { id: 'mug', name: 'Cosy mug', category: 'drink', sprite: mug },
  { id: 'crystal', name: 'Crystal', category: 'collectible', sprite: crystal },
  { id: 'star', name: 'Star', category: 'decor', sprite: star },
  { id: 'heart', name: 'Heart', category: 'decor', sprite: heart },
  { id: 'teapot', name: 'Teapot', category: 'drink', sprite: teapot },
  { id: 'ribbon', name: 'Ribbon', category: 'craft', sprite: ribbon },
  // bookshop stationery
  { id: 'notebooks', name: 'Notebooks', category: 'stationery', sprite: notebooks },
  { id: 'pen', name: 'Pen', category: 'stationery', sprite: pen },
  { id: 'pencil', name: 'Pencil', category: 'stationery', sprite: pencil },
  { id: 'ruler', name: 'Ruler', category: 'stationery', sprite: ruler },
  { id: 'eraser', name: 'Eraser', category: 'stationery', sprite: eraser },
  // furniture (24-ish wide; solid & movable per InteriorPlan.MD)
  { id: 'armchair', name: 'Cozy Armchair', category: 'furniture', sprite: armchair },
  { id: 'sofa', name: 'Sofa', category: 'furniture', sprite: sofa },
  { id: 'bed', name: 'Bed', category: 'furniture', sprite: bed },
  { id: 'table', name: 'Round Table', category: 'furniture', sprite: roundTable },
  { id: 'bookshelf', name: 'Bookshelf', category: 'furniture', sprite: bookshelf },
  { id: 'lamp', name: 'Floor Lamp', category: 'furniture', sprite: lamp },
  { id: 'rug', name: 'Rug', category: 'furniture', sprite: rug },
  { id: 'planter', name: 'Leafy Planter', category: 'furniture', sprite: planter },
];

export const ITEMS_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Custom pixel creations are global (so a traded/gifted "creation:<id>" renders for
// whoever holds it). The UI keeps this registry in sync via setCreationsRegistry.
let CREATIONS = {};
export function setCreationsRegistry(map) { CREATIONS = map || {}; }

// Resolve any item id to {id,name,category,sprite}. Shelf goods use "<prefix>:<name>"
// and custom decorations use "creation:<id>" — both live in the inventory and trade
// like any other item.
export function resolveItem(itemId) {
  if (typeof itemId !== 'string') return null;
  if (itemId.startsWith('creation:')) {
    const cr = CREATIONS[itemId.slice(9)];
    return cr ? { id: itemId, name: cr.name, category: 'creation', sprite: cr.sprite, palette: ICON_PALETTE } : null;
  }
  if (itemId.includes(':')) {
    const prefix = itemId.slice(0, itemId.indexOf(':'));
    const def = SHELF[prefix];
    if (def) {
      let rest = itemId.slice(prefix.length + 1);
      let palette = ICON_PALETTE;
      const ci = rest.indexOf('::'); // "name::rrggbb" carries a recolour
      if (ci >= 0) {
        if (def.main) palette = { ...ICON_PALETTE, [def.main]: `#${rest.slice(ci + 2)}` };
        rest = rest.slice(0, ci);
      }
      return { id: itemId, name: rest, category: prefix, sprite: def.sprite, palette };
    }
  }
  const it = ITEMS_BY_ID[itemId];
  return it ? { ...it, palette: ICON_PALETTE } : null;
}

// Each shop starts with a few of its own unique shelf items (and nothing shared).
const seedNames = (prefix, names) => names.map((n) => [`${prefix}:${n}`, 1]);
export const STARTING_INVENTORY = {
  bookshop: seedNames('book', ['The Secret Garden', 'Matilda', "Charlotte's Web", 'Wonder']),
  music: seedNames('vinyl', ['Pop Hits', 'Lo-fi Beats', 'Classical', 'Jazz Night']),
  craft: seedNames('yarn', ['Red', 'Blue', 'Mint', 'Pink']),
  sweet: seedNames('candy', ['Strawberry', 'Lemon', 'Grape', 'Bubblegum']),
  grocer: seedNames('can', ['Tomato Soup', 'Baked Beans', 'Sweet Corn', 'Peaches']),
  garden: seedNames('seed', ['Sunflower', 'Tulip', 'Basil', 'Carrot']),
  bakery: seedNames('bread', ['Sourdough', 'Banana Bread', 'Rye', 'Brioche']),
  teahouse: seedNames('tea', ['Classic Milk Tea', 'Taro', 'Matcha', 'Brown Sugar']),
  art: seedNames('paint', ['Crimson', 'Cerulean', 'Sunflower', 'Emerald']),
  florist: seedNames('flower', ['Rose', 'Tulip', 'Daisy', 'Lily']),
  petshop: seedNames('petfood', ['Kitten Kibble', 'Puppy Chow', 'Bird Seed', 'Fish Flakes']),
  snowglobe: seedNames('globe', ['Winter Village', 'Snowy Forest', 'Ballerina', 'Castle']),
  toy: seedNames('toy', ['Robot', 'Doll', 'Toy Car', 'Building Blocks']),
  car: seedNames('car', ['Red Racer', 'Police Car', 'Fire Truck', 'Monster Truck']),
  soda: seedNames('soda', ['Cola', 'Orange Fizz', 'Lemon-Lime', 'Grape Soda']),
};

export function startingInventory(shopType) {
  return (STARTING_INVENTORY[shopType] || []).map(([itemId, qty]) => ({ itemId, qty }));
}
