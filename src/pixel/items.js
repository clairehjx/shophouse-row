// Item catalogue. Signature items reuse the shop icons; generic items add a few
// shared treasures. Sprites use the shared ICON_PALETTE. Keep this small (~20)
// at launch per the game plan; expand later.
import { SHOP_ICONS, ICON_PALETTE } from './icons.js';

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
