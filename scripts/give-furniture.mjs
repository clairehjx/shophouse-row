// Give every player a starter set of furniture in the live Supabase DB, so they can
// use the interior drag editor. Idempotent: tops up each piece to the target qty
// (re-running never doubles up).
//   node --env-file=.env.local scripts/give-furniture.mjs
import { createClient } from '@supabase/supabase-js';

// Per-player starter furniture: a bed, two couches (sofa), and a table.
const GIVE = { bed: 1, sofa: 2, table: 1 };

const url = (process.env.SUPABASE_URL || '').trim().replace(/^(https:\/\/[^/]+).*$/i, '$1');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: players, error } = await db.from('players').select('id');
if (error) { console.error('Failed to list players:', error.message); process.exit(1); }

for (const p of players) {
  for (const [itemId, qty] of Object.entries(GIVE)) {
    const { data } = await db.from('inventory').select('qty').eq('player_id', p.id).eq('item_id', itemId).maybeSingle();
    if (data) {
      if (data.qty < qty) await db.from('inventory').update({ qty }).eq('player_id', p.id).eq('item_id', itemId);
    } else {
      await db.from('inventory').insert({ player_id: p.id, item_id: itemId, qty });
    }
  }
  console.log(`🛋️ furniture topped up for ${p.id}`);
}
const summary = Object.entries(GIVE).map(([k, v]) => `${v}× ${k}`).join(', ');
console.log(`Done — ensured ${summary} for ${players.length} players.`);
