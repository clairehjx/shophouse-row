// Pull a snapshot of the LIVE Supabase database into a local file so `npm run dev`
// runs the local code against the real current data — verify changes before deploying
// (no PWA-cache fighting). The snapshot is written in localStore's native shapes.
//
//   node --env-file=.env.local scripts/pull-snapshot.mjs
//
// Output: src/data/snapshot.local.json  (git-ignored — contains real player data).
// Delete that file (or run `npm run dev` after removing it) to go back to the
// synthetic demo seed. Secret codes are NOT pulled; locally every code defaults to
// the player id and the dev "Play as" switcher needs no code at all.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || '').trim().replace(/^(https:\/\/[^/]+).*$/i, '$1');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
console.log('Pulling snapshot from', url);

const ms = (x) => (x ? new Date(x).getTime() : 0);
const all = async (table) => {
  const { data, error } = await db.from(table).select('*');
  if (error) { console.error(`Failed reading ${table}:`, error.message); process.exit(1); }
  return data || [];
};

const [players, shops, inventory, creations, messages, trades] = await Promise.all(
  ['players', 'shops', 'inventory', 'creations', 'messages', 'trades'].map(all),
);
// Tolerant: these tables may not exist until their migration is run.
const annRes = await db.from('announcements').select('*');
const announcements = (annRes.data || []).map((a) => ({ id: a.id, body: a.body, by: a.by_player, createdAt: ms(a.created_at) }));
if (annRes.error) console.log('  (announcements table not found yet — skipping; run schema.sql to enable News)');
const sesRes = await db.from('sessions').select('*');
const sessions = (sesRes.data || []).map((s) => ({ id: s.id, playerId: s.player_id, startedAt: ms(s.started_at), lastPingAt: ms(s.last_ping_at), lastActiveAt: ms(s.last_active_at), activeSeconds: s.active_seconds || 0 }));
if (sesRes.error) console.log('  (sessions table not found yet — skipping; run schema.sql to enable play stats)');

const snap = {
  pulledAt: Date.now(),
  players: Object.fromEntries(players.map((p) => [p.id, {
    id: p.id, name: p.name, shopType: p.shop_type, isAdmin: !!p.is_admin,
    setupComplete: !!p.setup_complete, avatar: p.avatar || null, lastSeenAt: ms(p.last_seen_at),
    newsSeenAt: ms(p.news_seen_at),
  }])),
  shops: Object.fromEntries(shops.map((s) => [s.owner_id, {
    ownerId: s.owner_id, signText: s.sign_text, awningColor: s.awning_color, wallColor: s.wall_color,
    roofColor: s.roof_color, facadeItem: s.facade_item, greeting: s.greeting,
    interior: s.interior || [], interior2: s.interior2 || [],
  }])),
  inventory: inventory.reduce((acc, r) => {
    (acc[r.player_id] ||= []).push({ itemId: r.item_id, qty: r.qty });
    return acc;
  }, {}),
  creations: Object.fromEntries(creations.map((c) => [c.id, { id: c.id, name: c.name, sprite: c.sprite, by: c.by_player }])),
  messages: messages.map((m) => ({ id: m.id, from: m.from_player, to: m.to_player, body: m.body, read: !!m.read, createdAt: ms(m.created_at) })),
  trades: trades.map((t) => ({ id: t.id, from: t.from_player, to: t.to_player, offeredItemId: t.offered_item_id, requestedItemId: t.requested_item_id, status: t.status, createdAt: ms(t.created_at) })),
  announcements,
  sessions,
};

const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'snapshot.local.json');
writeFileSync(dest, JSON.stringify(snap, null, 2));
console.log(`Wrote ${dest}`);
console.log(`  players ${players.length} · shops ${shops.length} · inventory ${inventory.length} · creations ${creations.length} · messages ${messages.length} · trades ${trades.length} · announcements ${announcements.length} · sessions ${sessions.length}`);
console.log('Now run:  npm run dev   (local code, real data). Delete the file to return to the demo seed.');
