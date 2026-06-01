import ItemSprite from './ItemSprite.jsx';
import { resolveItem } from '../pixel/items.js';

// A wooden shelf of items — one shared sprite per shop kind, with the name as the
// caption (so different vinyls / yarns / candies / books are told apart by name).
export default function ShelfGrid({ items = [], empty = 'Nothing on the shelf yet.' }) {
  if (!items.length) return <p className="text-inksoft text-sm">{empty}</p>;
  return (
    <div className="bg-wood rounded-lg border-[3px] border-[#7d5538] p-3">
      <div className="flex flex-wrap gap-2">
        {items.map(({ itemId, qty }) => (
          <div key={itemId} className="flex flex-col items-center bg-paper border-2 border-parch rounded-xl p-2 w-[88px]">
            <ItemSprite id={itemId} scale={3} />
            <span className="text-[11px] text-inksoft mt-1 text-center leading-tight">{resolveItem(itemId)?.name || itemId}</span>
            {qty > 1 && <span className="pixel-text text-[10px] text-ink">×{qty}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
