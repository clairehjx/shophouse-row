// Admin play-time stats from the `sessions` table (service-role; read-only).
//   node --env-file=.env.local scripts/play-stats.mjs [--since today|7d|all] [--tz 8]
// Online time = last_ping_at − started_at; active time = accrued active_seconds.
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || '').trim().replace(/^(https:\/\/[^/]+).*$/i, '$1');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const since = arg('--since', 'today');
const tzh = parseInt(arg('--tz', '8'), 10);            // default Singapore (UTC+8)
const TZ = tzh * 3600 * 1000;
const now = Date.now();
let startMs = 0;
if (since === 'today') { const d = new Date(now + TZ); startMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - TZ; }
else if (since === '7d') startMs = now - 7 * 864e5;    // else 'all' → 0

const { data: players } = await db.from('players').select('id,name');
const nm = Object.fromEntries((players || []).map((p) => [p.id, p.name]));
const { data: sessions, error } = await db.from('sessions').select('*').gte('last_ping_at', new Date(startMs).toISOString());
if (error) { console.error('Could not read sessions (did you run the migration?):', error.message); process.exit(1); }

const byP = {};
for (const s of (sessions || [])) {
  const online = (new Date(s.last_ping_at).getTime() - new Date(s.started_at).getTime()) / 1000;
  const v = (byP[s.player_id] ??= { sessions: 0, online: 0, active: 0, last: 0 });
  v.sessions++;
  v.online += Math.max(0, online);
  v.active += s.active_seconds || 0;
  v.last = Math.max(v.last, new Date(s.last_ping_at).getTime());
}
const fmt = (sec) => { const m = Math.round(sec / 60); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
const clock = (ms) => new Date(ms + TZ).toISOString().slice(0, 16).replace('T', ' ');

const rows = Object.entries(byP).sort((a, b) => b[1].last - a[1].last);
console.log(`Play stats — since ${since} (UTC+${tzh}). ${(sessions || []).length} session(s).\n`);
if (!rows.length) { console.log('  (no sessions in this window)'); process.exit(0); }
console.log('  player        sessions   online   active    last seen');
for (const [id, v] of rows) {
  console.log(`  ${(nm[id] || id).padEnd(12)} ${String(v.sessions).padStart(6)}   ${fmt(v.online).padStart(6)}   ${fmt(v.active).padStart(6)}    ${clock(v.last)}`);
}
