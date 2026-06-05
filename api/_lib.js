// Shared server helpers for the Vercel serverless functions (Phase 5 cloud backend).
// DORMANT until the Supabase env vars are set — see PHASE5.md. Files prefixed with
// "_" are not treated as routes by Vercel.
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { planBeat } from '../src/data/sessionLogic.js';

const ONLINE_WINDOW = 5 * 60 * 1000;

export function sb() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/^(https:\/\/[^/]+).*$/i, '$1');
  return createClient(url, (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), { auth: { persistSession: false } });
}
export function signToken(playerId) {
  return jwt.sign({ sub: playerId }, process.env.JWT_SECRET, { expiresIn: '60d' });
}
export function verifyToken(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return null;
  try { return jwt.verify(t, process.env.JWT_SECRET).sub; } catch { return null; }
}
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const c of req) raw += c;
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

const nid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const mapPlayer = (p) => ({
  id: p.id, name: p.name, shopType: p.shop_type, isAdmin: p.is_admin,
  setupComplete: p.setup_complete, avatar: p.avatar,
  online: p.last_seen_at ? (Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_WINDOW) : false,
});
const mapShop = (s) => s && ({
  ownerId: s.owner_id, signText: s.sign_text, awningColor: s.awning_color, wallColor: s.wall_color,
  roofColor: s.roof_color, facadeItem: s.facade_item, greeting: s.greeting,
  interior: s.interior || [], interior2: s.interior2 || [], interiorTheme: s.interior_theme || null,
});

async function invAdd(db, playerId, itemId, qty) {
  const { data } = await db.from('inventory').select('qty').eq('player_id', playerId).eq('item_id', itemId).maybeSingle();
  if (data) await db.from('inventory').update({ qty: data.qty + qty }).eq('player_id', playerId).eq('item_id', itemId);
  else await db.from('inventory').insert({ player_id: playerId, item_id: itemId, qty });
}
async function invRemove(db, playerId, itemId, all) {
  const { data } = await db.from('inventory').select('qty').eq('player_id', playerId).eq('item_id', itemId).maybeSingle();
  if (!data) return false;
  if (all || data.qty <= 1) await db.from('inventory').delete().eq('player_id', playerId).eq('item_id', itemId);
  else await db.from('inventory').update({ qty: data.qty - 1 }).eq('player_id', playerId).eq('item_id', itemId);
  return true;
}
const COL = { signText: 'sign_text', awningColor: 'awning_color', wallColor: 'wall_color', roofColor: 'roof_color', facadeItem: 'facade_item', greeting: 'greeting', interior: 'interior', interior2: 'interior2', interiorTheme: 'interior_theme' };

async function isAdmin(db, me) {
  const { data } = await db.from('players').select('is_admin').eq('id', me).maybeSingle();
  return !!data?.is_admin;
}

// Log/extend a play session off the existing heartbeat (and on login). `prevSeen` is
// the player's last_seen_at BEFORE this beat. Safe if the sessions table is missing
// (Supabase returns errors, not throws) — it simply no-ops until the migration runs.
export async function touchSession(db, playerId, prevSeen, active) {
  const nowMs = Date.now();
  const prevMs = prevSeen ? new Date(prevSeen).getTime() : 0;
  const { data: s } = await db.from('sessions').select('id,last_ping_at,active_seconds')
    .eq('player_id', playerId).order('last_ping_at', { ascending: false }).limit(1).maybeSingle();
  const last = s ? { id: s.id, lastPingAt: new Date(s.last_ping_at).getTime(), activeSeconds: s.active_seconds } : null;
  const plan = planBeat(last, prevMs, nowMs, active);
  if (plan.kind === 'extend') {
    const patch = { last_ping_at: new Date(plan.patch.lastPingAt).toISOString() };
    if ('activeSeconds' in plan.patch) {
      patch.active_seconds = plan.patch.activeSeconds;
      patch.last_active_at = new Date(plan.patch.lastActiveAt).toISOString();
    }
    return db.from('sessions').update(patch).eq('id', plan.sessionId);
  }
  const r = plan.row;
  return db.from('sessions').insert({
    id: nid('s'), player_id: playerId,
    started_at: new Date(r.startedAt).toISOString(), last_ping_at: new Date(r.lastPingAt).toISOString(),
    last_active_at: r.lastActiveAt ? new Date(r.lastActiveAt).toISOString() : null, active_seconds: r.activeSeconds,
  });
}

// Each handler: (db, params, me) → result. `me` is the authenticated player id.
export const handlers = {
  async ping(db, { active } = {}, me) {
    const { data: p } = await db.from('players').select('last_seen_at').eq('id', me).maybeSingle();
    try { await touchSession(db, me, p?.last_seen_at, !!active); } catch { /* sessions table optional */ }
    await db.from('players').update({ last_seen_at: new Date().toISOString() }).eq('id', me);
    return { ok: true };
  },
  async listPlayers(db) { const { data } = await db.from('players').select('*'); return (data || []).map(mapPlayer); },
  async getPlayer(db, { id }) { const { data } = await db.from('players').select('*').eq('id', id).maybeSingle(); return data ? mapPlayer(data) : null; },
  async completeSetup(db, { avatar, shopType }, me) { const patch = { setup_complete: true }; if (avatar) patch.avatar = avatar; if (shopType) patch.shop_type = shopType; await db.from('players').update(patch).eq('id', me); return handlers.getPlayer(db, { id: me }); },
  async saveAvatar(db, { avatar }, me) { await db.from('players').update({ avatar }).eq('id', me); return handlers.getPlayer(db, { id: me }); },

  async getShop(db, { ownerId }) { const { data } = await db.from('shops').select('*').eq('owner_id', ownerId).maybeSingle(); return mapShop(data); },
  async listShops(db) { const { data } = await db.from('shops').select('*'); return (data || []).map(mapShop); },
  async saveShop(db, { ownerId, patch }, me) {
    if (ownerId !== me) return { error: 'forbidden' };
    const col = { updated_at: new Date().toISOString() };
    for (const k in patch) if (COL[k]) col[COL[k]] = patch[k];
    await db.from('shops').update(col).eq('owner_id', ownerId);
    return handlers.getShop(db, { ownerId });
  },

  async getInventory(db, { ownerId }) { const { data } = await db.from('inventory').select('item_id,qty').eq('player_id', ownerId); return (data || []).map((r) => ({ itemId: r.item_id, qty: r.qty })); },
  async addInventoryItem(db, { ownerId, itemId, qty = 1 }, me) { if (ownerId !== me) return { error: 'forbidden' }; await invAdd(db, ownerId, itemId, qty); return handlers.getInventory(db, { ownerId }); },
  async removeInventoryItem(db, { ownerId, itemId, all = true }, me) { if (ownerId !== me) return { error: 'forbidden' }; await invRemove(db, ownerId, itemId, all); return handlers.getInventory(db, { ownerId }); },

  async getCreations(db) { const { data } = await db.from('creations').select('*'); return (data || []).map((c) => ({ id: c.id, name: c.name, sprite: c.sprite, by: c.by_player })); },
  async addCreation(db, { name, sprite }, me) { const id = nid('cr'); await db.from('creations').insert({ id, name: String(name || 'Creation').slice(0, 24), sprite, by_player: me }); await invAdd(db, me, `creation:${id}`, 1); return { id }; },

  async sendMessage(db, { toId, body }, me) { await db.from('messages').insert({ id: nid('m'), from_player: me, to_player: toId, body: String(body).slice(0, 100), read: false, created_at: new Date().toISOString() }); return { ok: true }; },
  async listInbox(db, _p, me) { const { data } = await db.from('messages').select('*').eq('to_player', me).order('created_at', { ascending: false }); return (data || []).map((m) => ({ id: m.id, from: m.from_player, to: m.to_player, body: m.body, read: m.read, createdAt: new Date(m.created_at).getTime() })); },
  async markInboxRead(db, _p, me) { await db.from('messages').update({ read: true }).eq('to_player', me).eq('read', false); return { ok: true }; },
  async markThreadRead(db, { withId }, me) { await db.from('messages').update({ read: true }).eq('to_player', me).eq('from_player', withId).eq('read', false); return { ok: true }; },
  // Unsend: only the sender can delete their own message (hard delete for everyone).
  async deleteMessage(db, { messageId }, me) {
    const { data: m } = await db.from('messages').select('from_player').eq('id', messageId).maybeSingle();
    if (!m || m.from_player !== me) return { ok: false, error: 'forbidden' };
    await db.from('messages').delete().eq('id', messageId);
    return { ok: true };
  },
  async listThreads(db, _p, me) {
    const { data } = await db.from('messages').select('*').or(`from_player.eq.${me},to_player.eq.${me}`);
    const map = new Map();
    for (const m of (data || [])) {
      const other = m.from_player === me ? m.to_player : m.from_player;
      if (!map.has(other)) map.set(other, []);
      map.get(other).push({ id: m.id, from: m.from_player, to: m.to_player, body: m.body, read: m.read, createdAt: new Date(m.created_at).getTime(), mine: m.from_player === me });
    }
    const threads = [];
    for (const [withId, msgs] of map) {
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      threads.push({ withId, messages: msgs, unread: msgs.filter((x) => !x.mine && !x.read).length, lastAt: msgs[msgs.length - 1].createdAt });
    }
    return threads.sort((a, b) => b.lastAt - a.lastAt);
  },

  async proposeTrade(db, { toId, offeredItemId, requestedItemId }, me) {
    const fi = await db.from('inventory').select('qty').eq('player_id', me).eq('item_id', offeredItemId).maybeSingle();
    if (!fi.data || fi.data.qty < 1) return { ok: false, error: "You don't have that item." };
    const ti = await db.from('inventory').select('qty').eq('player_id', toId).eq('item_id', requestedItemId).maybeSingle();
    if (!ti.data || ti.data.qty < 1) return { ok: false, error: "They don't have that item." };
    await db.from('trades').insert({ id: nid('t'), from_player: me, to_player: toId, offered_item_id: offeredItemId, requested_item_id: requestedItemId, status: 'pending', created_at: new Date().toISOString() });
    return { ok: true };
  },
  async listTrades(db, _p, me) {
    const { data } = await db.from('trades').select('*').or(`from_player.eq.${me},to_player.eq.${me}`);
    const all = (data || []).map((t) => ({ id: t.id, from: t.from_player, to: t.to_player, offeredItemId: t.offered_item_id, requestedItemId: t.requested_item_id, status: t.status, createdAt: new Date(t.created_at).getTime() }));
    const byNew = (a, b) => b.createdAt - a.createdAt;
    return {
      incoming: all.filter((t) => t.to === me && t.status === 'pending').sort(byNew),
      outgoing: all.filter((t) => t.from === me && t.status === 'pending').sort(byNew),
      history: all.filter((t) => t.status !== 'pending').sort(byNew),
    };
  },
  // Retract: only the proposer can cancel their own still-pending offer. No items are
  // escrowed (they move on accept), so this is a safe status flip → lands in history.
  async retractTrade(db, { tradeId }, me) {
    const { data: t } = await db.from('trades').select('from_player,status').eq('id', tradeId).maybeSingle();
    if (!t || t.from_player !== me || t.status !== 'pending') return { ok: false, error: 'Trade not found.' };
    await db.from('trades').update({ status: 'retracted' }).eq('id', tradeId);
    return { ok: true };
  },
  async respondTrade(db, { tradeId, accept }, me) {
    const { data: t } = await db.from('trades').select('*').eq('id', tradeId).maybeSingle();
    if (!t || t.to_player !== me || t.status !== 'pending') return { ok: false, error: 'Trade not found.' };
    if (!accept) { await db.from('trades').update({ status: 'declined' }).eq('id', tradeId); return { ok: true }; }
    if (!await invRemove(db, t.from_player, t.offered_item_id, false)) { await db.from('trades').update({ status: 'declined' }).eq('id', tradeId); return { ok: false, error: 'The offer is no longer available.' }; }
    if (!await invRemove(db, t.to_player, t.requested_item_id, false)) { await invAdd(db, t.from_player, t.offered_item_id, 1); await db.from('trades').update({ status: 'declined' }).eq('id', tradeId); return { ok: false, error: 'You no longer have that item.' }; }
    await invAdd(db, t.to_player, t.offered_item_id, 1);
    await invAdd(db, t.from_player, t.requested_item_id, 1);
    await db.from('trades').update({ status: 'accepted' }).eq('id', tradeId);
    return { ok: true };
  },
  async giftItem(db, { toId, itemId }, me) {
    if (!await invRemove(db, me, itemId, false)) return { ok: false, error: "You don't have that item." };
    await invAdd(db, toId, itemId, 1);
    let name = itemId;
    if (typeof itemId === 'string' && itemId.startsWith('creation:')) { const c = await db.from('creations').select('name').eq('id', itemId.slice(9)).maybeSingle(); name = c.data?.name || 'a gift'; }
    await db.from('messages').insert({ id: nid('m'), from_player: me, to_player: toId, body: `🎁 I sent you ${name}!`, read: false, created_at: new Date().toISOString() });
    return { ok: true };
  },
  async getCounts(db, _p, me) {
    const { count: unread } = await db.from('messages').select('*', { count: 'exact', head: true }).eq('to_player', me).eq('read', false);
    const { count: pendingTrades } = await db.from('trades').select('*', { count: 'exact', head: true }).eq('to_player', me).eq('status', 'pending');
    // News count is fully isolated: it can never affect the Notes/Trades badges,
    // even if the announcements table/column isn't migrated yet.
    let news = 0;
    try {
      const { data: meRow } = await db.from('players').select('news_seen_at').eq('id', me).maybeSingle();
      const since = meRow?.news_seen_at || '1970-01-01T00:00:00Z';
      const { count } = await db.from('announcements').select('*', { count: 'exact', head: true }).gt('created_at', since);
      news = count || 0;
    } catch { news = 0; }
    return { unread: unread || 0, pendingTrades: pendingTrades || 0, news };
  },

  // Admin broadcast announcements (News tab).
  async listAnnouncements(db) {
    const { data } = await db.from('announcements').select('*').order('created_at', { ascending: false });
    return (data || []).map((a) => ({ id: a.id, body: a.body, by: a.by_player, createdAt: new Date(a.created_at).getTime() }));
  },
  async postAnnouncement(db, { body }, me) {
    if (!await isAdmin(db, me)) return { ok: false, error: 'Only the admin can post announcements.' };
    const text = String(body || '').trim().slice(0, 280);
    if (!text) return { ok: false, error: 'Write something first.' };
    const { error } = await db.from('announcements').insert({ id: nid('a'), body: text, by_player: me, created_at: new Date().toISOString() });
    if (error) return { ok: false, error: 'News isn’t set up on the server yet.' };
    return { ok: true };
  },
  async markNewsRead(db, _p, me) {
    await db.from('players').update({ news_seen_at: new Date().toISOString() }).eq('id', me);
    return { ok: true };
  },
};
