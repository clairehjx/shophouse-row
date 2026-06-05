import { useEffect, useRef, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import api from '../data/api.js';
import { timeAgo } from '../util.js';

// Notes grouped by friend, shown as a conversation. Pick a friend to see the full
// back-and-forth history and reply at the bottom.
export default function Inbox({ player, onBack, backLabel = '← Street', toast, onChanged }) {
  const [threads, setThreads] = useState([]);
  const [people, setPeople] = useState({});
  const [openWith, setOpenWith] = useState(null);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  async function load() {
    const [ts, players] = await Promise.all([api.listThreads(player.id), api.listPlayers()]);
    setThreads(ts);
    setPeople(Object.fromEntries(players.map((p) => [p.id, p])));
    return ts;
  }
  useEffect(() => { load(); }, [player.id]);

  async function openThread(withId) {
    setOpenWith(withId);
    const changed = await api.markThreadRead(player.id, withId);
    await load();
    if (changed) onChanged?.();
    setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 50);
  }

  async function send() {
    const body = text.trim();
    if (!body || !openWith) return;
    await api.sendMessage(player.id, openWith, body);
    setText('');
    await load();
    onChanged?.();
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
  }

  async function unsend(id) {
    const r = await api.deleteMessage(player.id, id);
    if (!r?.ok) { toast?.('Could not unsend that.'); return; }
    await load();
    onChanged?.();
  }

  const current = threads.find((t) => t.withId === openWith);
  const friend = openWith ? people[openWith] : null;

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          {openWith ? (
            <button onClick={() => setOpenWith(null)} className="cozy-btn-ghost text-xs">← All notes</button>
          ) : (
            <button onClick={onBack} className="cozy-btn-ghost text-xs">{backLabel}</button>
          )}
          <h1 className="pixel-text text-base text-ink flex items-center gap-2">
            {friend ? (
              <>
                <span className="bg-skyhi rounded-lg border-2 border-parch p-0.5"><Avatar data={friend.avatar} scale={1} /></span>
                {friend.name}
              </>
            ) : '💌 Notes'}
          </h1>
        </div>

        {/* Conversation list */}
        {!openWith && (
          threads.length === 0 ? (
            <div className="panel p-6 text-center text-inksoft">No notes yet. Visit a friend's shop to leave one!</div>
          ) : (
            <div className="space-y-2">
              {threads.map((t) => {
                const who = people[t.withId];
                const last = t.messages[t.messages.length - 1];
                return (
                  <button key={t.withId} onClick={() => openThread(t.withId)}
                    className="w-full panel p-3 flex items-center gap-3 text-left hover:bg-cream transition">
                    <div className="bg-skyhi rounded-xl border-2 border-parch p-1 shrink-0">
                      <Avatar data={who?.avatar} scale={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="pixel-text text-xs text-ink">{who?.name || t.withId}</span>
                        <span className="text-[10px] text-inksoft ml-auto">{timeAgo(t.lastAt)}</span>
                      </div>
                      <p className="text-sm text-inksoft truncate">
                        {last.mine ? 'You: ' : ''}{last.body}
                      </p>
                    </div>
                    {t.unread > 0 && (
                      <span className="bg-rose text-paper text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">
                        {t.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* Conversation thread */}
        {openWith && current && (
          <div className="panel p-4">
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {current.messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-peach text-paper' : 'bg-cream text-ink border-2 border-parch'}`}>
                    <p className="break-words">{m.body}</p>
                    <div className={`text-[9px] mt-0.5 flex items-center gap-2 ${m.mine ? 'text-paper/80 justify-end' : 'text-inksoft'}`}>
                      <span>{timeAgo(m.createdAt)}</span>
                      {m.mine && <button onClick={() => unsend(m.id)} className="underline hover:no-underline">Unsend</button>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t-2 border-parch">
              <input
                value={text} maxLength={100}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                placeholder={`Write ${friend?.name || 'them'} a note…`}
                className="flex-1 rounded-xl border-[3px] border-parch bg-cream px-3 py-2 text-sm outline-none focus:border-peach"
              />
              <button onClick={send} className="cozy-btn-primary text-xs">Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
