import PixelCanvas from './PixelCanvas.jsx';
import { resolveItem, ITEM_PALETTE } from '../pixel/items.js';
import { spriteSize } from '../pixel/engine.js';

// Draws a catalogue item's sprite in a fixed 12-wide box. Handles titled books.
export default function ItemSprite({ id, scale = 3, className, style }) {
  const item = resolveItem(id);
  if (!item) return null;
  const { w, h } = spriteSize(item.sprite);
  return (
    <PixelCanvas
      width={Math.max(w, 12)}
      height={Math.max(h, 1)}
      scale={scale}
      layers={[{ sprite: item.sprite, palette: item.palette || ITEM_PALETTE }]}
      className={className}
      style={style}
    />
  );
}
