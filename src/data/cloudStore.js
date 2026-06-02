// Cloud data layer — same interface as localStore.js, but backed by the Vercel
// serverless functions (/api/login, /api/rpc) + Supabase. Selected by src/data/api.js
// when VITE_SUPABASE_URL is set at build time. Presence uses a last_seen_at heartbeat.
const TOKEN_KEY = 'shophouse-row/token';
const ME_KEY = 'shophouse-row/me';

let token = (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) || null;
let me = (() => { try { return JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch { return null; } })();

async function rpc(action, params) {
  const r = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, params }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `rpc ${action} failed`);
  return j.result;
}

let hb;
function startHeartbeat() {
  if (hb || !token) return;
  const ping = () => { if (token) rpc('ping').catch(() => {}); };
  ping();
  hb = setInterval(ping, 60000);
}
if (token) startHeartbeat();

function cacheMe(p) { me = p; localStorage.setItem(ME_KEY, JSON.stringify(p)); return p; }

// ---- auth ----
export async function ensureSeeded() { /* cloud is seeded via scripts/seed-supabase.mjs */ }
export async function nameExists() { return true; } // /api/login validates the name
export async function login(name, code) {
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code }) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) return { ok: false, error: j.error || 'login' };
  token = j.token;
  localStorage.setItem(TOKEN_KEY, token);
  cacheMe(j.player);
  startHeartbeat();
  return { ok: true, player: j.player };
}
export function getSession() { return token ? me : null; }
export function logout() { token = null; me = null; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ME_KEY); if (hb) { clearInterval(hb); hb = null; } }

// ---- players ----
export async function listPlayers() { return rpc('listPlayers'); }
export async function getPlayer(id) { return rpc('getPlayer', { id }); }
export async function completeSetup(id, { avatar, shopType }) { return cacheMe(await rpc('completeSetup', { avatar, shopType })); }
export async function saveAvatar(id, avatar) { return cacheMe(await rpc('saveAvatar', { avatar })); }

// ---- shops ----
export async function getShop(ownerId) { return rpc('getShop', { ownerId }); }
export async function listShops() { return rpc('listShops'); }
export async function saveShop(ownerId, patch) { return rpc('saveShop', { ownerId, patch }); }

// ---- inventory ----
export async function getInventory(ownerId) { return rpc('getInventory', { ownerId }); }
export async function addInventoryItem(ownerId, itemId, qty = 1) { return rpc('addInventoryItem', { ownerId, itemId, qty }); }
export async function removeInventoryItem(ownerId, itemId, all = true) { return rpc('removeInventoryItem', { ownerId, itemId, all }); }

// ---- creations ----
export async function getCreations() { return rpc('getCreations'); }
export async function addCreation(ownerId, payload) { return rpc('addCreation', payload); }

// ---- messages ----
export async function sendMessage(fromId, toId, body) { return rpc('sendMessage', { toId, body }); }
export async function listInbox() { return rpc('listInbox'); }
export async function markInboxRead() { return rpc('markInboxRead'); }
export async function listThreads() { return rpc('listThreads'); }
export async function markThreadRead(playerId, withId) { return rpc('markThreadRead', { withId }); }

// ---- trades + gifts ----
export async function proposeTrade(fromId, toId, offeredItemId, requestedItemId) { return rpc('proposeTrade', { toId, offeredItemId, requestedItemId }); }
export async function listTrades() { return rpc('listTrades'); }
export async function respondTrade(tradeId, accept) { return rpc('respondTrade', { tradeId, accept }); }
export async function giftItem(fromId, toId, itemId) { return rpc('giftItem', { toId, itemId }); }

// ---- announcements (admin broadcast → News tab) ----
export async function listAnnouncements() { return rpc('listAnnouncements'); }
export async function postAnnouncement(playerId, body) { return rpc('postAnnouncement', { body }); }
export async function markNewsRead() { return rpc('markNewsRead'); }

// ---- misc ----
export async function getCounts() { return rpc('getCounts'); }
export function devSwitch() { throw new Error('devSwitch is local-only'); }
export function resetStore() { /* no-op in cloud */ }
