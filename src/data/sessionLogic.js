// Pure play-session accounting, shared by the server (api/_lib.js) and the local
// store so both behave identically — and so the rule is unit-testable with a
// controlled clock. All timestamps here are epoch milliseconds; each storage layer
// converts to/from ISO (Supabase) or keeps ms (localStorage) at its own edge.

export const SESSION_GAP_MS = 10 * 60 * 1000; // online gap (>10 min) that starts a new session

// Given the player's most recent session (or null), the time of their previous beat,
// the current beat time, and whether this beat was "active" (real input), decide what
// the beat does: extend the current session, or open a new one.
//   lastSession: { id, lastPingAt, activeSeconds } | null   (ms)
//   returns { kind:'extend', sessionId, patch:{ lastPingAt, [activeSeconds, lastActiveAt] } }
//        or { kind:'new', row:{ startedAt, lastPingAt, lastActiveAt|null, activeSeconds:0 } }
export function planBeat(lastSession, prevSeenMs, nowMs, active) {
  const gap = prevSeenMs ? nowMs - prevSeenMs : Infinity;
  if (lastSession && gap <= SESSION_GAP_MS) {
    const patch = { lastPingAt: nowMs };
    if (active) {
      // Accrue the elapsed online time as active time, capped at the gap so a missed
      // beat can never over-count.
      const elapsed = Math.min((nowMs - lastSession.lastPingAt) / 1000, SESSION_GAP_MS / 1000);
      patch.activeSeconds = lastSession.activeSeconds + Math.max(0, Math.round(elapsed));
      patch.lastActiveAt = nowMs;
    }
    return { kind: 'extend', sessionId: lastSession.id, patch };
  }
  return { kind: 'new', row: { startedAt: nowMs, lastPingAt: nowMs, lastActiveAt: active ? nowMs : null, activeSeconds: 0 } };
}
