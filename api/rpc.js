// POST /api/rpc  { action, params }  (Authorization: Bearer <jwt>) → { result } | { error }
// Single authenticated dispatcher for all data operations (see handlers in _lib.js).
import { sb, verifyToken, readJson, handlers } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const me = verifyToken(req);
  if (!me) return res.status(401).json({ error: 'unauthorized' });
  const { action, params } = await readJson(req);
  const fn = handlers[action];
  if (!fn) return res.status(400).json({ error: `unknown action: ${action}` });
  try {
    const result = await fn(sb(), params || {}, me);
    return res.status(200).json({ result });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
