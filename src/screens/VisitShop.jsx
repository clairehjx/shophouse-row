import { useEffect, useState } from 'react';
import ShopRoom from '../components/ShopRoom.jsx';
import { SHOP_TYPE_MAP } from '../pixel/shophouse.js';
import api from '../data/api.js';

// Visiting a friend's shop — walk around the top-down room, browse their shelves,
// talk to them at the counter to leave a note or propose a trade.
export default function VisitShop({ owner, me, onBack, toast, onChanged }) {
  const [shop, setShop] = useState(null);
  const [ownerInv, setOwnerInv] = useState([]);
  const [myInv, setMyInv] = useState([]);
  const [creations, setCreations] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, oi, mi, crs] = await Promise.all([
        api.getShop(owner.id), api.getInventory(owner.id), api.getInventory(me.id), api.getCreations(),
      ]);
      setShop(s);
      setOwnerInv(oi);
      setMyInv(mi);
      setCreations(crs);
    })();
  }, [owner.id, me.id]);

  const type = SHOP_TYPE_MAP[owner.shopType];

  async function sendNote(body) {
    await api.sendMessage(me.id, owner.id, body);
    toast?.(`Note left for ${owner.name}! 💌`);
    onChanged?.();
  }
  async function proposeTrade(give, get) {
    if (!give || !get) return;
    const res = await api.proposeTrade(me.id, owner.id, give, get);
    if (!res.ok) { toast?.(res.error); return; }
    toast?.(`Trade offer sent to ${owner.name}! 🔄`);
    onChanged?.();
  }
  async function gift(itemId) {
    if (!itemId) return;
    const res = await api.giftItem(me.id, owner.id, itemId);
    if (!res.ok) { toast?.(res.error); return; }
    toast?.(`Gave ${owner.name} a gift! 🎁`);
    const [oi, mi] = await Promise.all([api.getInventory(owner.id), api.getInventory(me.id)]);
    setOwnerInv(oi); setMyInv(mi);
    onChanged?.();
  }

  if (!shop) {
    return <div className="h-full flex items-center justify-center pixel-text text-inksoft">Knocking…</div>;
  }

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="cozy-btn-ghost text-xs">← Street (Esc)</button>
          <h1 className="pixel-text text-base text-ink">{type?.emoji} {shop.signText || type?.name}</h1>
          {owner.online && <span className="text-xs text-sage font-bold">● online</span>}
        </div>
        <ShopRoom
          owner={owner} walker={me.avatar} shop={shop} ownerInv={ownerInv} myInv={myInv} creations={creations}
          onSendNote={sendNote} onProposeTrade={proposeTrade} onGift={gift} toast={toast} onLeave={onBack}
        />
      </div>
    </div>
  );
}
