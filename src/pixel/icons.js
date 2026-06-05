// Tiny ~12×12 product icons, one per shop type. Ragged rows are fine — the
// engine reads each row's own length. Shared palette keeps them small.

export const ICON_PALETTE = {
  k: '#4a3a2e', // outline
  w: '#fff8ea', // cream white
  c: '#f3e7c9', // tan/sponge
  r: '#e2604f', // red
  p: '#f4a9c7', // pink
  m: '#d98ac0', // magenta
  g: '#8fc7a0', // green
  G: '#5b9b6f', // deep green
  y: '#f6c875', // yellow
  o: '#f4a96b', // orange
  b: '#7fb8e0', // blue
  B: '#4a90d9', // deep blue
  u: '#c7b6e8', // lilac
  n: '#a9764f', // brown
  t: '#6fc6c0', // teal
  s: '#dfe8ef', // silver/glass
  // --- furniture shades (additive; see InteriorPlan.MD). Never remove a key. ---
  N: '#6f4a30', // dark wood (legs / shadow side)
  W: '#c79468', // light wood / highlight
  d: '#3a2c22', // deep shadow (darker than k); also AO + stair top-fade
  f: '#d98aa8', // rose fabric midtone
  F: '#b56b86', // rose fabric shadow
  l: '#fbe6c0', // warm cream highlight (linens, lamp glow, stair lip)
  e: '#8a9b7a', // sage (plants, upholstery)
  E: '#5e6f4f', // sage shadow
  S: '#9aa0ab', // stone light (lit stair tread)
  x: '#5d6470', // stone shadow (stair riser)
};

// 🍰 Bakery — cake slice with cherry
const cake = [
  '....k.......',
  '...krk......',
  '...kpk......',
  '..kpppk.....',
  '.kwwwwwwk...',
  'kppppppppk..',
  'kwccccccwk..',
  'kwccccccwk..',
  'kwccccccwk..',
  '.kwwwwwwk...',
  '..kkkkkkk...',
];

// 🌸 Florist — blossom
const flower = [
  '....pp......',
  '...pmmp.....',
  '..pmppmp....',
  '.pmpyypmp...',
  '.pmpyypmp...',
  '..pmppmp....',
  '...pmmp.....',
  '....GG......',
  '...G.G......',
  '..G..G......',
  '.....G......',
];

// 📚 Bookshop — stacked books
const books = [
  '............',
  '.kkkkkkk....',
  '.kbbbbbk....',
  '.kkkkkkk....',
  '.krrrrrrk...',
  '.krrrrrrk...',
  '.kkkkkkkk...',
  '..kgggggk...',
  '..kgggggk...',
  '..kkkkkkk...',
];

// 🧶 Craft shop — yarn ball
const yarn = [
  '...kkkk.....',
  '..kmmmmk....',
  '.kmpmpmpk...',
  '.kpmpmpmk...',
  '.kmpmpmpk...',
  '.kpmpmpmk...',
  '..kmmmmk....',
  '...kkkk.....',
  '.....k......',
  '......k.....',
  '.......k....',
];

// 🍵 Tea house — steaming cup
const tea = [
  '.GG..GG.....',
  '..GG..G.....',
  '.kkkkkkkk...',
  '.kwwwwwwks..',
  '.kwttttwks..',
  '.kwttttwk...',
  '.kwwwwwwk...',
  '..kkkkkk....',
  '...kkkk.....',
];

// 🎨 Art studio — paint palette
const palette = [
  '..kkkkk.....',
  '.kwwwwwwk...',
  'kwrywbgwwk..',
  'kwwwwwwwwk..',
  'kwgwbwywrk..',
  'kwwwwwwwk...',
  '.kwwwwk.....',
  '..kkk.......',
];

// 🛒 Grocer — apple
const apple = [
  '.....G......',
  '....G.......',
  '..rr.rr.....',
  '.rrrrrrr....',
  '.rrrrrrr....',
  '.rrrrrrr....',
  '.rrrrrrr....',
  '..rrrrr.....',
  '...r.r......',
];

// 🐾 Pet shop — cat face
const cat = [
  '.n......n...',
  '.nn....nn...',
  '.nnnnnnnn...',
  'nnwwwwwwnn..',
  'nwkwwwwkwn..',
  'nwwwppwwwn..',
  'nwwwwwwwwn..',
  '.nwwkwwn....',
  '..nnnnnn....',
];

// 🧁 Sweet shop — cupcake
const cupcake = [
  '....pp......',
  '...pmmp.....',
  '..pmwwmp....',
  '.pmwwwwmp...',
  '.kcccccck...',
  '.kcyccyck...',
  '..kccccck...',
  '..kccccck...',
  '...kkkkk....',
];

// 🪴 Garden shop — potted plant
const plant = [
  '...G.G.G....',
  '..GGGGGG....',
  '.GGgGGgGG...',
  '..GGGGGG....',
  '...GGGG.....',
  '....GG......',
  '..oooooo....',
  '..onnnno....',
  '..onnnno....',
  '...oooo.....',
];

// 🎵 Music shop — note box
const music = [
  '............',
  '.kk.........',
  '.kkkkkkk....',
  '.k.....k....',
  '.k.....kk...',
  '.k......k...',
  'kk......k...',
  'kkk....kk...',
  '.kk....k....',
];

// 🔮 Snowglobe shop — glittery globe
const snowglobe = [
  '...ssss.....',
  '..swwwws....',
  '.swwBwwws...',
  '.swBwwsws...',
  '.swwwswws...',
  '.swwswwss...',
  '..swwwws....',
  '...kkkk.....',
  '..knnnnk....',
  '..kkkkkk....',
];

export const SHOP_ICONS = {
  bakery: cake,
  florist: flower,
  bookshop: books,
  craft: yarn,
  teahouse: tea,
  art: palette,
  grocer: apple,
  petshop: cat,
  sweet: cupcake,
  garden: plant,
  music: music,
  snowglobe: snowglobe,
};
