// Give every player some yummy food & drinks (edible items) in the live Supabase DB.
//   node --env-file=.env.local scripts/give-treats.mjs
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || '').trim().replace(/^(https:\/\/[^/]+).*$/i, '$1');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

// Edible item ids (prefix bread/candy/can = "Ate", tea = "Sipped" bubble tea).
const TREATS = [
  ['bread:Cinnamon Roll', 1],
  ['candy:Strawberry Lollipop', 1],
  ['can:Sweet Peaches', 1],
  ['tea:Brown Sugar Boba', 2],   // a couple of bubble teas to sip
];

const { data: players, error } = await db.from('players').select('id');
if (error) { console.error('Failed to list players:', error.message); process.exit(1); }

for (const p of players) {
  for (const [itemId, qty] of TREATS) {
    const { data } = await db.from('inventory').select('qty').eq('player_id', p.id).eq('item_id', itemId).maybeSingle();
    if (data) await db.from('inventory').update({ qty: data.qty + qty }).eq('player_id', p.id).eq('item_id', itemId);
    else await db.from('inventory').insert({ player_id: p.id, item_id: itemId, qty });
  }
  console.log(`🍞🧋 treats added for ${p.id}`);
}
console.log(`Done — gave ${TREATS.length} kinds of treats to ${players.length} players.`);
