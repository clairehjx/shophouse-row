// POST /api/login  { name, code } → { ok, token, player } | { ok:false, error }
import bcrypt from 'bcryptjs';
import { sb, signToken, readJson, mapPlayer, touchSession } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { name, code } = await readJson(req);
  const db = sb();
  const { data: p } = await db.from('players').select('*').eq('name_lower', String(name || '').trim().toLowerCase()).maybeSingle();
  if (!p) return res.status(200).json({ ok: false, error: 'name' });
  const { data: sc } = await db.from('secret_codes').select('code_hash').eq('player_id', p.id).maybeSingle();
  const ok = sc && await bcrypt.compare(String(code || ''), sc.code_hash);
  if (!ok) return res.status(200).json({ ok: false, error: 'code' });
  try { await touchSession(db, p.id, p.last_seen_at, true); } catch { /* sessions table optional */ }
  await db.from('players').update({ last_seen_at: new Date().toISOString() }).eq('id', p.id);
  return res.status(200).json({ ok: true, token: signToken(p.id), player: { ...mapPlayer(p), online: true } });
}
