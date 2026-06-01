// Set/reset a player's secret code (bcrypt-hashed).
//   node --env-file=.env.local scripts/set-code.mjs <playerId> <newCode>
// e.g. node --env-file=.env.local scripts/set-code.mjs chloe sunflower42
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const [, , playerId, code] = process.argv;
if (!playerId || !code) { console.error('Usage: node --env-file=.env.local scripts/set-code.mjs <playerId> <newCode>'); process.exit(1); }

const url = (process.env.SUPABASE_URL || '').trim().replace(/^(https:\/\/[^/]+).*$/i, '$1');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: player } = await db.from('players').select('id,name').eq('id', playerId).maybeSingle();
if (!player) { console.error(`No player with id "${playerId}". (ids: claireh, chloe, jean, yiran, yifei, iris, grace, jeanette, clairey, vera, keira, laura, sharmaine)`); process.exit(1); }

const { error } = await db.from('secret_codes').upsert({ player_id: playerId, code_hash: bcrypt.hashSync(code, 10) }, { onConflict: 'player_id' });
if (error) { console.error('Failed:', error.message); process.exit(1); }
console.log(`✅ Set secret code for ${player.name} (${playerId}).`);
