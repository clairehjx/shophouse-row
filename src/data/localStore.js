// Local-first data store. Everything lives in localStorage so the game is fully
// playable in one browser with no backend. The async function signatures here are
// the contract `api.js` exposes to the UI; Phase 5 swaps this file's internals for
// Supabase serverless calls WITHOUT changing api.js or the screens.
import { hashCode } from './hash.js';
import { SHOP_TYPES } from '../pixel/shophouse.js';
import { startingInventory, resolveItem } from '../pixel/items.js';
import { randomAvatar } from '../pixel/avatar.js';

// Optional snapshot of the live database, written by `scripts/pull-snapshot.mjs`.
// When present, `npm run dev` seeds from real data instead of the synthetic demo.
// import.meta.glob returns {} when the file is absent (no error); the try/catch keeps
// this importable in plain Node (smoke tests) where import.meta.glob doesn't exist.
let SNAPSHOT = null;
try {
  const mods = import.meta.glob('./snapshot.local.json', { eager: true, import: 'default' });
  SNAPSHOT = Object.values(mods)[0] || null;
} catch { SNAPSHOT = null; }

// Storage key is versioned; a fresh snapshot (new pulledAt) gets its own key so
// re-pulling auto-reseeds local state without manually clearing localStorage.
const STORAGE_KEY = SNAPSHOT ? `shophouse-row/snap-${SNAPSHOT.pulledAt}` : 'shophouse-row/v17';

// --- inventory helpers (mutate an inventory array in place) ---
function addToInv(inv, itemId, n = 1) {
  const e = inv.find((i) => i.itemId === itemId);
  if (e) e.qty += n;
  else inv.push({ itemId, qty: n });
}
function removeFromInv(inv, itemId, n = 1) {
  const e = inv.find((i) => i.itemId === itemId);
  if (!e || e.qty < n) return false;
  e.qty -= n;
  if (e.qty <= 0) inv.splice(inv.indexOf(e), 1);
  return true;
}

// A player counts as "online" if seen within this window. In local play, you make
// a neighbour online by playing as them (dev switcher); Phase 5 swaps this for
// real-time presence. Demo neighbours seed as recently-seen so the street looks alive.
const ONLINE_WINDOW = 5 * 60 * 1000;

// Look of an unclaimed "Opening soon" storefront.
const VACANT = { awningColor: '#cfc4ad', wallColor: '#efe7d4', roofColor: '#9a8f7a', signText: 'Opening soon' };

// A few neighbours start already set up, so the street feels alive and there are
// shops to visit/trade with. Their shop types are claimed (and unique).
// Claire H.'s saved default avatar (frozen so it stays the same for testing).
// dark skin · pink twin-tails · mint dress · cream bow
const CLAIRE_AVATAR = { skin: 4, hairStyle: 4, hairColor: 6, outfit: 1, outfitColor: 2, accessory: 1, accessoryColor: 9 };

// All shops open by default, pre-assigned. Claire H. keeps her saved avatar.
const DEMO = {
  claireh: { shopType: 'bookshop', seed: 0.05, avatar: CLAIRE_AVATAR },
  chloe: { shopType: 'craft', seed: 0.13 },
  jean: { shopType: 'teahouse', seed: 0.21 },
  yiran: { shopType: 'petshop', seed: 0.29 },
  yifei: { shopType: 'art', seed: 0.37 },
  iris: { shopType: 'toy', seed: 0.45 },
  grace: { shopType: 'bakery', seed: 0.53 },
  jeanette: { shopType: 'music', seed: 0.61 },
  clairey: { shopType: 'grocer', seed: 0.69 },
  vera: { shopType: 'florist', seed: 0.77 },
  keira: { shopType: 'snowglobe', seed: 0.85 },
  laura: { shopType: 'sweet', seed: 0.93 },
  sharmaine: { shopType: 'garden', seed: 0.99 },
  caleb: { shopType: 'car', seed: 0.37 },
  cayden: { shopType: 'soda', seed: 0.43 },
};

// The fixed 12-player roster from the game plan. Claire H. is admin.
// Default dev secret codes are the lowercase id (see DEV-NOTES.md) and can be
// changed any time by clearing localStorage and editing this seed.
// Street order (left→right). Claire H. and Chloe sit in the middle (indices 6 & 7).
const ROSTER = [
  { id: 'jean', name: 'Jean' },
  { id: 'yiran', name: 'Yiran' },
  { id: 'yifei', name: 'Yifei' },
  { id: 'iris', name: 'Iris' },
  { id: 'grace', name: 'Grace' },
  { id: 'jeanette', name: 'Jeanette' },
  { id: 'claireh', name: 'Claire H.', isAdmin: true },
  { id: 'chloe', name: 'Chloe' },
  { id: 'clairey', name: 'Claire Y.' },
  { id: 'vera', name: 'Vera' },
  { id: 'keira', name: 'Keira' },
  { id: 'laura', name: 'Laura' },
  { id: 'sharmaine', name: 'Sharmaine' },
  { id: 'caleb', name: 'Caleb' },
  { id: 'cayden', name: 'Cayden' },
];

let state = null;

function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    state = null;
  }
  // Migrate older saved states so newer fields never read as undefined.
  if (state) {
    if (!state.creations) state.creations = {};
    if (!state.announcements) state.announcements = [];
    if (state.shops) for (const s of Object.values(state.shops)) { if (!s.interior) s.interior = []; if (!s.interior2) s.interior2 = []; }
  }
  return state;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Seed the store on first run. Idempotent. Hashes the default dev codes.
export async function ensureSeeded() {
  if (load()) return;
  if (SNAPSHOT) { await seedFromSnapshot(); return; }
  const players = {};
  const codes = {};
  const shops = {};
  const inventory = {};
  for (const r of ROSTER) {
    const demo = DEMO[r.id];
    const type = demo ? SHOP_TYPES.find((s) => s.key === demo.shopType) : null;
    players[r.id] = {
      id: r.id,
      name: r.name,
      shopType: demo ? demo.shopType : null, // unclaimed until the player picks at setup
      isAdmin: !!r.isAdmin,
      setupComplete: !!demo,
      avatar: demo ? (demo.avatar || randomAvatar(demo.seed)) : null,
      lastSeenAt: demo ? Date.now() : 0, // demo neighbours start "online"
      newsSeenAt: 0, // last time they opened the News tab
    };
    codes[r.id] = await hashCode(r.id); // default code = the id, e.g. "chloe"
    shops[r.id] = type
      ? {
          ownerId: r.id,
          signText: type.name,
          awningColor: type.awning,
          wallColor: type.wall,
          roofColor: type.roof,
          facadeItem: null, // street window shows the shop's signature sprite
          greeting: `Welcome to my ${type.name}! ${type.emoji}`,
          interior: [],
          interior2: [], // second-floor placements
        }
      : { ownerId: r.id, ...VACANT, facadeItem: null, greeting: '', interior: [], interior2: [] };
    inventory[r.id] = demo ? startingInventory(demo.shopType) : [];
  }
  state = { players, codes, shops, inventory, creations: {}, messages: [], trades: [], announcements: [], session: null, seq: 1 };
  // Sample conversations + a trade so the social loop is testable the moment you log in.
  const t0 = Date.now();
  state.messages.push(
    { id: nextId('m'), from: 'claireh', to: 'iris', body: 'Hi Iris! Welcome to the row 🎉', read: true, createdAt: t0 - 7200_000 },
    { id: nextId('m'), from: 'iris', to: 'claireh', body: 'Thank you! Your bookshop is the best 📚', read: true, createdAt: t0 - 6900_000 },
    { id: nextId('m'), from: 'iris', to: 'claireh', body: 'Can I borrow Matilda? 🥺', read: false, createdAt: t0 - 3600_000 },
    { id: nextId('m'), from: 'grace', to: 'claireh', body: 'Fresh bread for a book sometime? 🥖📖', read: false, createdAt: t0 - 1800_000 },
  );
  state.trades.push({ id: nextId('t'), from: 'grace', to: 'claireh', offeredItemId: 'bread:Sourdough', requestedItemId: 'book:Matilda', status: 'pending', createdAt: t0 - 1800_000 });
  state.announcements.push({ id: nextId('a'), body: 'Welcome to Shophouse Row! 🎉 Decorate your shop and say hi to your neighbours.', by: 'claireh', createdAt: t0 - 5400_000 });
  save();
}

// Build local state from a pulled live-database snapshot. JSON-clone so edits in dev
// don't mutate the imported module. Codes default to each player id (the dev "Play as"
// switcher needs none); real bcrypt codes are never pulled.
async function seedFromSnapshot() {
  const clone = JSON.parse(JSON.stringify(SNAPSHOT));
  const codes = {};
  for (const id of Object.keys(clone.players)) codes[id] = await hashCode(id);
  state = {
    players: clone.players,
    codes,
    shops: clone.shops,
    inventory: clone.inventory || {},
    creations: clone.creations || {},
    messages: clone.messages || [],
    trades: clone.trades || [],
    announcements: clone.announcements || [],
    session: null,
    seq: 100000, // well above any local "m1/t1/cr1" ids to avoid collisions
  };
  // Make sure every player has an inventory array and every shop has both floors.
  for (const id of Object.keys(state.players)) if (!state.inventory[id]) state.inventory[id] = [];
  for (const s of Object.values(state.shops)) { if (!s.interior) s.interior = []; if (!s.interior2) s.interior2 = []; }
  save();
}

// ---- Auth -----------------------------------------------------------------

function findByName(name) {
  const norm = String(name).trim().toLowerCase();
  return Object.values(state.players).find(
    (p) => p.name.toLowerCase() === norm || p.id === norm,
  );
}

export async function nameExists(name) {
  await ensureSeeded();
  return !!findByName(name);
}

export async function login(name, code) {
  await ensureSeeded();
  const player = findByName(name);
  if (!player) return { ok: false, error: 'name' };
  const hash = await hashCode(code);
  if (hash !== state.codes[player.id]) return { ok: false, error: 'code' };
  player.lastSeenAt = Date.now();
  state.session = { playerId: player.id };
  save();
  return { ok: true, player: publicPlayer(player) };
}

export function getSession() {
  load();
  if (!state || !state.session) return null;
  const p = state.players[state.session.playerId];
  return p ? publicPlayer(p) : null;
}

export function logout() {
  load();
  if (!state) return;
  state.session = null;
  save();
}

// ---- Players --------------------------------------------------------------

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    shopType: p.shopType,
    isAdmin: p.isAdmin,
    setupComplete: p.setupComplete,
    avatar: p.avatar,
    online: Date.now() - (p.lastSeenAt || 0) < ONLINE_WINDOW,
  };
}

export async function listPlayers() {
  await ensureSeeded();
  return Object.values(state.players).map(publicPlayer);
}

export async function getPlayer(id) {
  await ensureSeeded();
  const p = state.players[id];
  return p ? publicPlayer(p) : null;
}

// Save avatar (+ optionally a chosen shop type) and mark setup complete.
export async function completeSetup(id, { avatar, shopType }) {
  await ensureSeeded();
  const p = state.players[id];
  if (!p) return null;
  if (avatar) p.avatar = avatar;
  if (shopType && shopType !== p.shopType) {
    p.shopType = shopType;
    const def = SHOP_TYPES.find((s) => s.key === shopType);
    const shop = state.shops[id];
    if (def && shop) {
      shop.signText = def.name;
      shop.awningColor = def.awning;
      shop.wallColor = def.wall;
      shop.roofColor = def.roof;
      shop.facadeItem = null; // street window uses the shop's signature sprite
      if (!shop.greeting) shop.greeting = `Welcome to my ${def.name}! ${def.emoji}`;
    }
    // Merge the shop's starting stock into the player's bag when they claim it.
    if (!state.inventory[id]) state.inventory[id] = [];
    startingInventory(shopType).forEach((s) => addToInv(state.inventory[id], s.itemId, s.qty));
  }
  p.setupComplete = true;
  save();
  return publicPlayer(p);
}

// ---- Inventory ------------------------------------------------------------

export async function getInventory(ownerId) {
  await ensureSeeded();
  return (state.inventory[ownerId] || []).map((it) => ({ ...it }));
}

export async function addInventoryItem(ownerId, itemId, qty = 1) {
  await ensureSeeded();
  if (!state.inventory[ownerId]) state.inventory[ownerId] = [];
  addToInv(state.inventory[ownerId], itemId, qty);
  save();
  return getInventory(ownerId);
}

// ---- Custom pixel creations (per player) ----------------------------------

// Creations are a GLOBAL registry { id: {id,name,sprite,by} } so a traded/gifted
// "creation:<id>" renders for whoever holds it. getCreations() returns all of them.
export async function getCreations() {
  await ensureSeeded();
  if (!state.creations) state.creations = {};
  return Object.values(state.creations).map((c) => ({ ...c }));
}

// Saving a pixel image registers it and drops one copy into the maker's bag.
export async function addCreation(ownerId, { name, sprite }) {
  await ensureSeeded();
  if (!state.creations) state.creations = {};
  const id = nextId('cr');
  state.creations[id] = { id, name: String(name || 'Creation').slice(0, 24), sprite, by: ownerId };
  if (!state.inventory[ownerId]) state.inventory[ownerId] = [];
  addToInv(state.inventory[ownerId], `creation:${id}`, 1);
  save();
  return { id };
}

// Remove an item. By default removes the whole entry (used for titled books).
export async function removeInventoryItem(ownerId, itemId, all = true) {
  await ensureSeeded();
  const inv = state.inventory[ownerId] || [];
  const idx = inv.findIndex((i) => i.itemId === itemId);
  if (idx >= 0) {
    if (all || inv[idx].qty <= 1) inv.splice(idx, 1);
    else inv[idx].qty -= 1;
  }
  save();
  return getInventory(ownerId);
}

// Re-save just the avatar (profile edit).
export async function saveAvatar(id, avatar) {
  await ensureSeeded();
  const p = state.players[id];
  if (!p) return null;
  p.avatar = avatar;
  save();
  return publicPlayer(p);
}

// ---- Shops ----------------------------------------------------------------

export async function getShop(ownerId) {
  await ensureSeeded();
  return state.shops[ownerId] ? { ...state.shops[ownerId] } : null;
}

export async function listShops() {
  await ensureSeeded();
  return Object.values(state.shops).map((s) => ({ ...s }));
}

export async function saveShop(ownerId, patch) {
  await ensureSeeded();
  const shop = state.shops[ownerId];
  if (!shop) return null;
  Object.assign(shop, patch);
  save();
  return { ...shop };
}

// Dev helper used by the "Play as…" switcher and reset button.
export async function devSwitch(id) {
  await ensureSeeded();
  const p = state.players[id];
  if (!p) return null;
  p.lastSeenAt = Date.now();
  state.session = { playerId: id };
  save();
  return publicPlayer(p);
}

export function resetStore() {
  state = null;
  localStorage.removeItem(STORAGE_KEY);
}

function nextId(prefix) {
  if (!state.seq) state.seq = 1;
  return `${prefix}${state.seq++}`;
}

// ---- Messages (sticky notes, ≤100 chars, no open chat) --------------------

export async function sendMessage(fromId, toId, body) {
  await ensureSeeded();
  const msg = {
    id: nextId('m'), from: fromId, to: toId,
    body: String(body).slice(0, 100), read: false, createdAt: Date.now(),
  };
  state.messages.push(msg);
  save();
  return { ...msg };
}

export async function listInbox(playerId) {
  await ensureSeeded();
  return state.messages
    .filter((m) => m.to === playerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((m) => ({ ...m }));
}

export async function markInboxRead(playerId) {
  await ensureSeeded();
  let changed = false;
  state.messages.forEach((m) => { if (m.to === playerId && !m.read) { m.read = true; changed = true; } });
  if (changed) save();
}

// Conversations grouped by the other person, each with full history (oldest→newest).
export async function listThreads(playerId) {
  await ensureSeeded();
  const map = new Map();
  for (const m of state.messages) {
    if (m.from !== playerId && m.to !== playerId) continue;
    const other = m.from === playerId ? m.to : m.from;
    if (!map.has(other)) map.set(other, []);
    map.get(other).push({ ...m, mine: m.from === playerId });
  }
  const threads = [];
  for (const [withId, msgs] of map) {
    msgs.sort((a, b) => a.createdAt - b.createdAt);
    threads.push({
      withId,
      messages: msgs,
      unread: msgs.filter((m) => !m.mine && !m.read).length,
      lastAt: msgs[msgs.length - 1].createdAt,
    });
  }
  threads.sort((a, b) => b.lastAt - a.lastAt);
  return threads;
}

// Mark just one conversation's incoming notes as read.
export async function markThreadRead(playerId, withId) {
  await ensureSeeded();
  let changed = false;
  state.messages.forEach((m) => { if (m.to === playerId && m.from === withId && !m.read) { m.read = true; changed = true; } });
  if (changed) save();
  return changed;
}

// ---- Trades ---------------------------------------------------------------

export async function proposeTrade(fromId, toId, offeredItemId, requestedItemId) {
  await ensureSeeded();
  const fromInv = state.inventory[fromId] || [];
  const toInv = state.inventory[toId] || [];
  if (!fromInv.find((i) => i.itemId === offeredItemId && i.qty > 0)) return { ok: false, error: "You don't have that item." };
  if (!toInv.find((i) => i.itemId === requestedItemId && i.qty > 0)) return { ok: false, error: "They don't have that item." };
  const trade = { id: nextId('t'), from: fromId, to: toId, offeredItemId, requestedItemId, status: 'pending', createdAt: Date.now() };
  state.trades.push(trade);
  save();
  return { ok: true, trade: { ...trade } };
}

export async function listTrades(playerId) {
  await ensureSeeded();
  const mine = state.trades.filter((t) => t.from === playerId || t.to === playerId);
  const byNew = (a, b) => b.createdAt - a.createdAt;
  return {
    incoming: mine.filter((t) => t.to === playerId && t.status === 'pending').sort(byNew).map((t) => ({ ...t })),
    outgoing: mine.filter((t) => t.from === playerId && t.status === 'pending').sort(byNew).map((t) => ({ ...t })),
    history: mine.filter((t) => t.status !== 'pending').sort(byNew).map((t) => ({ ...t })),
  };
}

export async function respondTrade(tradeId, accept) {
  await ensureSeeded();
  const t = state.trades.find((x) => x.id === tradeId);
  if (!t || t.status !== 'pending') return { ok: false, error: 'Trade not found.' };
  if (!accept) { t.status = 'declined'; save(); return { ok: true, trade: { ...t } }; }

  const fromInv = (state.inventory[t.from] ||= []);
  const toInv = (state.inventory[t.to] ||= []);
  if (!removeFromInv(fromInv, t.offeredItemId, 1)) { t.status = 'declined'; save(); return { ok: false, error: 'The offer is no longer available.' }; }
  if (!removeFromInv(toInv, t.requestedItemId, 1)) { addToInv(fromInv, t.offeredItemId, 1); t.status = 'declined'; save(); return { ok: false, error: 'You no longer have that item.' }; }
  addToInv(toInv, t.offeredItemId, 1);
  addToInv(fromInv, t.requestedItemId, 1);
  t.status = 'accepted';
  save();
  return { ok: true, trade: { ...t } };
}

// Give one of your items to another player (no exchange). They get it in their bag
// plus a note so they know. Returns {ok} / {ok:false,error}.
export async function giftItem(fromId, toId, itemId) {
  await ensureSeeded();
  const fromInv = state.inventory[fromId] || [];
  if (!removeFromInv(fromInv, itemId, 1)) return { ok: false, error: "You don't have that item." };
  if (!state.inventory[toId]) state.inventory[toId] = [];
  addToInv(state.inventory[toId], itemId, 1);
  const name = itemId.startsWith('creation:')
    ? (state.creations?.[itemId.slice(9)]?.name || 'a gift')
    : (resolveItem(itemId)?.name || itemId);
  state.messages.push({ id: nextId('m'), from: fromId, to: toId, body: `🎁 I sent you ${name}!`, read: false, createdAt: Date.now() });
  save();
  return { ok: true };
}

// Notification counts for the header badges.
export async function getCounts(playerId) {
  await ensureSeeded();
  const seen = state.players[playerId]?.newsSeenAt || 0;
  return {
    unread: state.messages.filter((m) => m.to === playerId && !m.read).length,
    pendingTrades: state.trades.filter((t) => t.to === playerId && t.status === 'pending').length,
    news: state.announcements.filter((a) => a.createdAt > seen).length,
  };
}

// ---- Announcements (admin broadcast → everyone's News tab) -----------------

export async function listAnnouncements() {
  await ensureSeeded();
  return [...state.announcements].sort((a, b) => b.createdAt - a.createdAt).map((a) => ({ ...a }));
}

export async function postAnnouncement(playerId, body) {
  await ensureSeeded();
  if (!state.players[playerId]?.isAdmin) return { ok: false, error: 'Only the admin can post announcements.' };
  const text = String(body || '').trim().slice(0, 280);
  if (!text) return { ok: false, error: 'Write something first.' };
  const a = { id: nextId('a'), body: text, by: playerId, createdAt: Date.now() };
  state.announcements.push(a);
  save();
  return { ok: true, announcement: { ...a } };
}

export async function markNewsRead(playerId) {
  await ensureSeeded();
  const p = state.players[playerId];
  if (p) { p.newsSeenAt = Date.now(); save(); }
}
