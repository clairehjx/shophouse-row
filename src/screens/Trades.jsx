import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import ItemSprite from '../components/ItemSprite.jsx';
import api from '../data/api.js';
import { resolveItem } from '../pixel/items.js';
import { timeAgo } from '../util.js';

function ItemChip({ id }) {
  return (
    <span className="inline-flex items-center gap-1 bg-cream border-2 border-parch rounded-lg px-2 py-1">
      <ItemSprite id={id} scale={2} />
      <span className="text-xs text-inksoft">{resolveItem(id)?.name || id}</span>
    </span>
  );
}

// Trade logbook: incoming offers to accept/decline, your pending offers, and history.
export default function Trades({ player, onBack, backLabel = '← Street', toast, onChanged }) {
  const [data, setData] = useState({ incoming: [], outgoing: [], history: [] });
  const [people, setPeople] = useState({});

  async function load() {
    const [t, players] = await Promise.all([api.listTrades(player.id), api.listPlayers()]);
    setData(t);
    setPeople(Object.fromEntries(players.map((p) => [p.id, p])));
  }
  useEffect(() => { load(); }, [player.id]);

  async function respond(tradeId, accept) {
    const res = await api.respondTrade(tradeId, accept);
    if (!res.ok) toast?.(res.error);
    else toast?.(accept ? 'Trade accepted — items swapped! ✨' : 'Trade declined.');
    await load();
    onChanged?.();
  }

  async function retract(tradeId) {
    const res = await api.retractTrade(player.id, tradeId);
    if (!res?.ok) toast?.(res?.error || 'Could not retract.');
    else toast?.('Offer retracted.');
    await load();
    onChanged?.();
  }

  const name = (id) => people[id]?.name || id;

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="cozy-btn-ghost text-xs">{backLabel}</button>
          <h1 className="pixel-text text-base text-ink">🔄 Trades</h1>
        </div>

        {/* Incoming */}
        <div className="panel p-5 mb-4">
          <h2 className="pixel-text text-xs text-inksoft mb-3">Offers for you</h2>
          {data.incoming.length === 0 ? (
            <p className="text-inksoft text-sm">No offers right now.</p>
          ) : (
            <div className="space-y-3">
              {data.incoming.map((t) => (
                <div key={t.id} className="bg-cream border-2 border-parch rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-skyhi rounded-lg border-2 border-parch p-0.5">
                      <Avatar data={people[t.from]?.avatar} scale={1} />
                    </div>
                    <span className="pixel-text text-xs text-ink">{name(t.from)}</span>
                    <span className="text-[10px] text-inksoft">{timeAgo(t.createdAt)}</span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 text-sm text-inksoft">
                    gives <ItemChip id={t.offeredItemId} /> for your <ItemChip id={t.requestedItemId} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => respond(t.id, true)} className="cozy-btn-primary text-xs">✓ Accept</button>
                    <button onClick={() => respond(t.id, false)} className="cozy-btn-ghost text-xs">✕ Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing */}
        <div className="panel p-5 mb-4">
          <h2 className="pixel-text text-xs text-inksoft mb-3">Your pending offers</h2>
          {data.outgoing.length === 0 ? (
            <p className="text-inksoft text-sm">You haven't offered any trades.</p>
          ) : (
            <div className="space-y-2">
              {data.outgoing.map((t) => (
                <div key={t.id} className="flex items-center flex-wrap gap-2 text-sm text-inksoft">
                  To <span className="pixel-text text-xs text-ink">{name(t.to)}</span>:
                  <ItemChip id={t.offeredItemId} /> for <ItemChip id={t.requestedItemId} />
                  <span className="text-[10px] text-sun">⏳ waiting</span>
                  <button onClick={() => retract(t.id)} className="cozy-btn-ghost text-[10px] !px-2 !py-0.5">Retract</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="panel p-5">
          <h2 className="pixel-text text-xs text-inksoft mb-3">Logbook</h2>
          {data.history.length === 0 ? (
            <p className="text-inksoft text-sm">No past trades yet.</p>
          ) : (
            <div className="space-y-1">
              {data.history.map((t) => (
                <div key={t.id} className="text-xs text-inksoft flex items-center gap-1 flex-wrap">
                  <span className={t.status === 'accepted' ? 'text-sage font-bold' : 'text-rose'}>
                    {t.status === 'accepted' ? '✓' : '✕'}
                  </span>
                  {name(t.from)} → {name(t.to)}: {resolveItem(t.offeredItemId)?.name || t.offeredItemId} for {resolveItem(t.requestedItemId)?.name || t.requestedItemId}
                  <span className="text-[10px]">· {timeAgo(t.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
