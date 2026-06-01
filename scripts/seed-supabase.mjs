// One-time seed for the Supabase backend: the 13 players, their shops, starting
// inventory, and bcrypt-hashed secret codes. Mirrors the local v15 seed.
//
// Usage (env must be set — see .env.example):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
//
// Default secret code for every player is their id (e.g. "chloe"); Claire H. should
// change these per girl afterwards (Supabase dashboard, or re-run with edits).
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SHOP_TYPE_MAP } from '../src/pixel/shophouse.js';
import { startingInventory } from '../src/pixel/items.js';
import { randomAvatar } from '../src/pixel/avatar.js';

const CLAIRE_AVATAR = { skin: 4, hairStyle: 4, hairColor: 6, outfit: 1, outfitColor: 2, accessory: 1, accessoryColor: 9 };
const ROSTER = [
  ['jean', 'Jean', 'teahouse'], ['yiran', 'Yiran', 'petshop'], ['yifei', 'Yifei', 'art'],
  ['iris', 'Iris', 'toy'], ['grace', 'Grace', 'bakery'], ['jeanette', 'Jeanette', 'music'],
  ['claireh', 'Claire H.', 'bookshop'], ['chloe', 'Chloe', 'craft'], ['clairey', 'Claire Y.', 'grocer'],
  ['vera', 'Vera', 'florist'], ['keira', 'Keira', 'snowglobe'], ['laura', 'Laura', 'sweet'],
  ['sharmaine', 'Sharmaine', 'garden'],
];

// Keep only the scheme+host (drops trailing slash, /rest/v1, or any path).
const url = (process.env.SUPABASE_URL || '').trim().replace(/^(https:\/\/[^/]+).*$/i, '$1');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
if (!/^https:\/\//i.test(url)) { console.error(`SUPABASE_URL looks wrong: "${process.env.SUPABASE_URL}" — expected https://YOUR-REF.supabase.co`); process.exit(1); }
console.log('Using Supabase URL:', url);

// Make sure it's the privileged key (service_role / secret), not the public one.
function keyRole(k) {
  if (k.startsWith('sb_secret_')) return 'service_role';
  if (k.startsWith('sb_publishable_')) return 'publishable';
  try { return JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString()).role; } catch { return 'unknown'; }
}
const role = keyRole(key);
console.log(`Key type: ${role} (starts "${key.slice(0, 11)}…")`);
if (role !== 'service_role') {
  console.error(`\nThis key is the "${role}" key — it can't bypass security (that's why you saw "permission denied").`);
  console.error('Use the SERVICE ROLE / SECRET key instead:');
  console.error('  Supabase → Project Settings → API Keys → "service_role" (legacy, starts eyJ…) or a "Secret key" (starts sb_secret_…)\n');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const players = [], codes = [], shops = [], inventory = [];
ROSTER.forEach(([id, name, shopType], i) => {
  const type = SHOP_TYPE_MAP[shopType];
  players.push({ id, name, name_lower: name.toLowerCase(), shop_type: shopType, is_admin: id === 'claireh', setup_complete: true, avatar: id === 'claireh' ? CLAIRE_AVATAR : randomAvatar((i + 1) / 14) });
  codes.push({ player_id: id, code_hash: bcrypt.hashSync(id, 10) }); // default code = id
  shops.push({ owner_id: id, sign_text: type.name, awning_color: type.awning, wall_color: type.wall, roof_color: type.roof, facade_item: null, greeting: `Welcome to my ${type.name}! ${type.emoji}`, interior: [], interior2: [] });
  startingInventory(shopType).forEach((it) => inventory.push({ player_id: id, item_id: it.itemId, qty: it.qty }));
});

for (const [table, rows, conflict] of [['players', players, 'id'], ['secret_codes', codes, 'player_id'], ['shops', shops, 'owner_id'], ['inventory', inventory, 'player_id,item_id']]) {
  const { error } = await db.from(table).upsert(rows, { onConflict: conflict });
  if (error) { console.error(`seed ${table} failed:`, error.message); process.exit(1); }
  console.log(`seeded ${table}: ${rows.length} rows`);
}
console.log('Done. Default codes = each id (change per girl in the dashboard).');
