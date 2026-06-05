import PixelCanvas from './PixelCanvas.jsx';
import { placeableSprite, ITEM_PALETTE } from '../pixel/items.js';
import { spriteSize } from '../pixel/engine.js';

// Preview of any placeable item — a stock item or a player's custom creation.
export default function Placeable({ id, creations = [], scale = 3, className, style }) {
  const sprite = placeableSprite(id, creations);
  if (!sprite) return null;
  const { w, h } = spriteSize(sprite);
  return (
    <PixelCanvas
      width={Math.max(w, 12)} height={Math.max(h, 1)} scale={scale}
      layers={[{ sprite, palette: ITEM_PALETTE }]}
      className={className} style={style}
    />
  );
}
