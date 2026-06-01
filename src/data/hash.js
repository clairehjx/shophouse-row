// Local-dev code hashing. Uses Web Crypto SHA-256 with a fixed app salt.
//
// NOTE: this is a STAND-IN for local play only. Phase 5 (Supabase) replaces this
// with real bcrypt hashing server-side. Codes are never stored in plaintext, even
// here — only this hash is persisted in localStorage.
const SALT = 'shophouse-row-local-v1';

export async function hashCode(code) {
  const norm = String(code).trim().toLowerCase();
  const data = new TextEncoder().encode(`${SALT}:${norm}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
