import { useRef, useState } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { ITEM_PALETTE, CREATE_SIZE } from '../pixel/items.js';

// A tiny pixel-art editor. Draw on a CREATE_SIZE×CREATE_SIZE grid with the shared
// palette, name it, and save — the saved sprite becomes a placeable item. You can
// also load any of your items as a starting *template* (non-destructive: it only
// copies the picture into the editor; the original item is untouched).
const PALETTE_CHARS = Object.keys(ITEM_PALETTE);
const EMPTY = () => Array.from({ length: CREATE_SIZE }, () => Array(CREATE_SIZE).fill('.'));
const GRID_LINE = '#9c8559';

// Copy a sprite (array of strings) centred into a fresh CREATE_SIZE grid.
function spriteToGrid(sprite) {
  const g = EMPTY();
  const h = Math.min(sprite.length, CREATE_SIZE);
  const offY = Math.floor((CREATE_SIZE - h) / 2);
  for (let r = 0; r < h; r++) {
    const row = sprite[r] || '';
    const w = Math.min(row.length, CREATE_SIZE);
    const offX = Math.floor((CREATE_SIZE - w) / 2);
    for (let c = 0; c < w; c++) {
      const ch = row[c];
      if (ch && ch !== '.' && ch !== ' ' && ITEM_PALETTE[ch]) g[offY + r][offX + c] = ch;
    }
  }
  return g;
}

export default function PixelEditor({ onSave, templates = [] }) {
  const [grid, setGrid] = useState(EMPTY);
  const [color, setColor] = useState(PALETTE_CHARS[0]);
  const [name, setName] = useState('');
  const painting = useRef(false);

  const paint = (r, c) => setGrid((g) => {
    if (g[r][c] === color) return g;
    const next = g.map((row) => row.slice());
    next[r][c] = color;
    return next;
  });

  function save() {
    if (grid.every((row) => row.every((ch) => ch === '.'))) return;
    onSave?.(name.trim() || 'My creation', grid.map((row) => row.join('')));
    setGrid(EMPTY());
    setName('');
  }

  return (
    <div
      className="select-none"
      onPointerDown={() => { painting.current = true; }}
      onPointerUp={() => { painting.current = false; }}
      onPointerLeave={() => { painting.current = false; }}
    >
      {/* Template picker */}
      {templates.length > 0 && (
        <div className="mb-3">
          <span className="pixel-text text-[10px] text-inksoft">Start from a floor-tile pattern (or your own)</span>
          <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto">
            <button onClick={() => setGrid(EMPTY())} title="Blank"
              className="px-2 h-9 rounded-lg border-2 border-parch bg-cream text-xs text-inksoft">Blank</button>
            {templates.map((t) => (
              <button key={t.id} onClick={() => setGrid(spriteToGrid(t.sprite))} title={`Use ${t.name} as template`}
                className="p-1 rounded-lg border-2 border-parch bg-cream hover:border-peach">
                <PixelCanvas width={12} height={12} scale={2} layers={[{ sprite: t.sprite, palette: ITEM_PALETTE }]} />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-inksoft mt-1">Loading a template just copies it here — your original item stays as it is.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {/* canvas */}
        <div
          className="grid bg-paper rounded-lg p-1"
          style={{ gridTemplateColumns: `repeat(${CREATE_SIZE}, 16px)`, border: `2px solid ${GRID_LINE}` }}
        >
          {grid.map((row, r) => row.map((ch, c) => (
            <button
              key={`${r}-${c}`}
              onPointerDown={() => paint(r, c)}
              onPointerEnter={() => { if (painting.current) paint(r, c); }}
              className="w-4 h-4"
              style={{
                borderRight: `1px solid ${GRID_LINE}55`,
                borderBottom: `1px solid ${GRID_LINE}55`,
                background: ch === '.' ? '#fffaf0' : ITEM_PALETTE[ch],
              }}
            />
          )))}
        </div>

        {/* palette + actions */}
        <div className="flex-1 min-w-[160px]">
          <div className="flex flex-wrap gap-1 mb-2">
            <button onClick={() => setColor('.')}
              className={`w-7 h-7 rounded border-[3px] text-[10px] ${color === '.' ? 'border-ink' : 'border-paper'} bg-cream`}
              title="Eraser">⌫</button>
            {PALETTE_CHARS.map((ch) => (
              <button key={ch} onClick={() => setColor(ch)}
                className={`w-7 h-7 rounded border-[3px] ${color === ch ? 'border-ink scale-110' : 'border-paper'}`}
                style={{ background: ITEM_PALETTE[ch] }} />
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24}
            placeholder="Name your creation…"
            className="w-full rounded-xl border-[3px] border-parch bg-cream px-3 py-2 text-sm outline-none focus:border-peach mb-2" />
          <div className="flex gap-2">
            <button onClick={save} className="cozy-btn-primary text-xs">💾 Save</button>
            <button onClick={() => setGrid(EMPTY())} className="cozy-btn-ghost text-xs">🧹 Clear</button>
          </div>
          <p className="text-xs text-inksoft mt-2">Pick a colour and draw. Saved creations can be placed in your shop.</p>
        </div>
      </div>
    </div>
  );
}
