import { useEffect, useState } from 'react';
import api from '../data/api.js';
import { timeAgo } from '../util.js';

// 📣 News — admin (Claire H.) broadcasts a message to everyone; all players read it
// here. Opening the tab marks everything read (clears the badge).
export default function News({ player, onBack, backLabel = '← Street', toast, onChanged }) {
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [list, players] = await Promise.all([api.listAnnouncements(), api.listPlayers()]);
    setItems(list);
    setPeople(Object.fromEntries(players.map((p) => [p.id, p])));
  }

  useEffect(() => {
    (async () => {
      await load();
      await api.markNewsRead(player.id);
      onChanged?.(); // clear the unread badge in the top bar
    })();
  }, [player.id]);

  async function post() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const r = await api.postAnnouncement(player.id, body);
    setBusy(false);
    if (!r?.ok) { toast?.(r?.error || 'Could not post.'); return; }
    setText('');
    await load();
    await api.markNewsRead(player.id);
    onChanged?.();
    toast?.('Posted to everyone! 📣');
  }

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="cozy-btn-ghost text-xs">{backLabel}</button>
          <h1 className="pixel-text text-base text-ink">📣 News</h1>
        </div>

        {/* Admin-only compose box */}
        {player.isAdmin && (
          <div className="panel p-4 mb-4">
            <div className="pixel-text text-xs text-ink mb-2">Post to everyone</div>
            <textarea
              value={text} maxLength={280} rows={3}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write an announcement for the whole row…"
              className="w-full rounded-xl border-[3px] border-parch bg-cream px-3 py-2 text-sm outline-none focus:border-peach resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-inksoft">{text.length}/280</span>
              <button onClick={post} disabled={busy || !text.trim()}
                className="cozy-btn-primary text-xs disabled:opacity-50">Post to everyone</button>
            </div>
          </div>
        )}

        {/* Feed */}
        {items.length === 0 ? (
          <div className="panel p-6 text-center text-inksoft">No announcements yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="panel p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="pixel-text text-xs text-ink">📣 {people[a.by]?.name || 'Claire H.'}</span>
                  <span className="text-[10px] text-inksoft ml-auto">{timeAgo(a.createdAt)}</span>
                </div>
                <p className="text-sm text-ink whitespace-pre-wrap break-words">{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
