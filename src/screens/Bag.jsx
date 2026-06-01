import { useEffect, useState } from 'react';
import ItemSprite from '../components/ItemSprite.jsx';
import ConsumeAnimation from '../components/ConsumeAnimation.jsx';
import { resolveItem, edibleVerb } from '../pixel/items.js';
import api from '../data/api.js';

// Your personal bag — items you own and can trade. Edible items (food & drink) can
// be consumed: click one and it's eaten/sipped (removed from your bag).
export default function Bag({ player, onBack, backLabel = '← Street', toast, onChanged }) {
  const [inv, setInv] = useState(null);
  const [eating, setEating] = useState(null); // { itemId, verb } while the animation plays

  async function load() { setInv(await api.getInventory(player.id)); }
  useEffect(() => { load(); }, [player.id]);

  async function consume(itemId) {
    const verb = edibleVerb(itemId);
    if (!verb) return;
    setEating({ itemId, verb }); // play the eat/sip animation
    await api.removeInventoryItem(player.id, itemId, false); // remove one
    await load();
    onChanged?.();
    setTimeout(() => setEating(null), 1150);
  }

  async function donate(itemId) {
    await api.removeInventoryItem(player.id, itemId, false); // give one away
    toast?.(`Donated ${resolveItem(itemId)?.name} 🎁`);
    await load();
    onChanged?.();
  }

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="cozy-btn-ghost text-xs">{backLabel}</button>
          <h1 className="pixel-text text-base text-ink">🎒 {player.name}'s bag</h1>
        </div>

        <div className="panel p-5">
          {!inv ? (
            <p className="pixel-text text-inksoft text-sm">Opening your bag…</p>
          ) : inv.length === 0 ? (
            <p className="text-inksoft text-sm">Your bag is empty.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {inv.map(({ itemId, qty }) => {
                const verb = edibleVerb(itemId);
                return (
                  <div key={itemId} className="flex flex-col items-center bg-cream border-2 border-parch rounded-xl p-2">
                    <ItemSprite id={itemId} scale={3} />
                    <span className="text-[11px] text-inksoft mt-1 text-center leading-tight">{resolveItem(itemId)?.name}</span>
                    <span className="pixel-text text-[10px] text-ink">×{qty}</span>
                    <div className="flex gap-1 mt-1">
                      {verb && (
                        <button onClick={() => consume(itemId)}
                          className="text-[10px] rounded-full px-2 py-0.5 bg-peach text-paper border-2 border-[#d98a4f] hover:brightness-105">
                          {verb === 'Sipped' ? '🧋 Sip' : '😋 Eat'}
                        </button>
                      )}
                      <button onClick={() => donate(itemId)} title="Donate (give it away)"
                        className="text-[10px] rounded-full px-2 py-0.5 bg-sky/40 text-inksoft border-2 border-parch hover:bg-sky">🎁</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-inksoft mt-4">Tap <strong>Eat</strong>/<strong>Sip</strong> to enjoy food & drinks. Visit a friend's shop to trade. 🔄</p>
        </div>
      </div>
      {eating && <ConsumeAnimation avatar={player.avatar} itemId={eating.itemId} verb={eating.verb} />}
    </div>
  );
}
