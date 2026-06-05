import { useEffect, useState } from 'react';
import PixelCanvas from '../components/PixelCanvas.jsx';
import ItemSprite from '../components/ItemSprite.jsx';
import Avatar from '../components/Avatar.jsx';
import ShelfGrid from '../components/ShelfGrid.jsx';
import ShopRoom from '../components/ShopRoom.jsx';
import Placeable from '../components/Placeable.jsx';
import PixelEditor from '../components/PixelEditor.jsx';
import { drawShophouse, SHOP_W, SHOP_H, SHOP_TYPE_MAP, AWNING_COLORS } from '../pixel/shophouse.js';
import {
  resolveItem, shelfDefForShop, shelfItemsFromInventory, DECOR_ITEMS, SHOP_SIGNATURE_SPRITE,
  placeableName, placeableSprite, setCreationsRegistry, SHELF_COLORS, isFurniture, isFloorTile, rotatePlacement,
  FLOOR_TILE_TEMPLATES,
} from '../pixel/items.js';
import { THEMES, defaultThemeFor } from '../pixel/themes.js';
import api from '../data/api.js';

const SIGN_MAX = 16;
const GREETING_MAX = 80;

export default function MyShop({ player, onBack, toast }) {
  const [shop, setShop] = useState(null);
  const [interior, setInterior] = useState([]);
  const [interior2, setInterior2] = useState([]);
  const [editFloor, setEditFloor] = useState(1); // 1 = ground, 2 = upstairs
  const [inv, setInv] = useState([]);
  const [creations, setCreations] = useState([]); // global registry list (for rendering)
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(null); // optional colour for a new unique item
  const [mode, setMode] = useState('walk'); // 'walk' (preview) | 'setup' (editor)

  // In setup mode, Esc leaves the shop (the walk room handles Esc itself).
  useEffect(() => {
    if (mode !== 'setup') return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onBack]);

  async function loadInventory() {
    const list = await api.getInventory(player.id);
    setInv(list);
    return list;
  }
  async function loadCreations() {
    const list = await api.getCreations(); // global registry
    setCreations(list);
    setCreationsRegistry(Object.fromEntries(list.map((c) => [c.id, c])));
    return list;
  }

  useEffect(() => {
    (async () => {
      const [s, list, crs] = await Promise.all([api.getShop(player.id), api.getInventory(player.id), api.getCreations()]);
      setShop(s);
      setInterior(s?.interior || []);
      setInterior2(s?.interior2 || []);
      setInv(list);
      setCreations(crs);
      setCreationsRegistry(Object.fromEntries(crs.map((c) => [c.id, c])));
    })();
  }, [player.id]);

  const type = SHOP_TYPE_MAP[player.shopType];
  const shelfDef = shelfDefForShop(player.shopType); // this shop's creatable kind
  const shelfItems = shelfItemsFromInventory(inv, shelfDef?.prefix);
  // You decorate with the decorations in YOUR bag (saved creations); stock images
  // are only starting templates in the editor below.
  const ownedDecor = inv.filter((i) => typeof i.itemId === 'string' && i.itemId.startsWith('creation:'));
  const placements = editFloor === 1 ? interior : interior2;
  // Editor palette: furniture (solid) and your floor tiles (custom pixel creations).
  const furnitureOwned = inv.filter((i) => isFurniture(i.itemId));
  const tilesOwned = inv.filter((i) => isFloorTile(i.itemId));

  // Floor Tile Designer templates: built-in floor-tile examples + the player's own saved
  // tiles (creations). No furniture / decor / shelf goods — this designs FLOOR tiles.
  const templates = [];
  const seenSprites = new Set();
  for (const t of FLOOR_TILE_TEMPLATES) {
    if (seenSprites.has(t.sprite)) continue;
    seenSprites.add(t.sprite);
    templates.push(t);
  }
  for (const { itemId } of ownedDecor) {
    const sprite = placeableSprite(itemId, creations);
    if (!sprite || seenSprites.has(sprite)) continue;
    seenSprites.add(sprite);
    templates.push({ id: itemId, name: placeableName(itemId, creations), sprite });
  }

  async function addShelfItem(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !shelfDef) return;
    const id = newColor ? `${shelfDef.prefix}:${name}::${newColor.slice(1)}` : `${shelfDef.prefix}:${name}`;
    await api.addInventoryItem(player.id, id, 1);
    setNewName('');
    await loadInventory();
  }
  async function removeShelfItem(itemId) {
    await api.removeInventoryItem(player.id, itemId, true);
    await loadInventory();
  }

  async function saveCreation(name, sprite) {
    await api.addCreation(player.id, { name, sprite });
    await Promise.all([loadCreations(), loadInventory()]);
  }
  async function donateDecor(itemId) {
    await api.removeInventoryItem(player.id, itemId, false);
    toast?.(`Donated ${placeableName(itemId, creations)} 🎁`);
    await loadInventory();
  }

  function saveFacade(patch) {
    setShop((prev) => ({ ...prev, ...patch }));
    api.saveShop(player.id, patch);
  }
  function saveInterior(next) {
    if (editFloor === 1) { setInterior(next); api.saveShop(player.id, { interior: next }); }
    else { setInterior2(next); api.saveShop(player.id, { interior2: next }); }
  }
  // Placing an item takes it OUT of the bag; picking it back up returns it (so it
  // can be gifted/traded again only when it's back in the bag). Free {x,y} placement.
  async function onPlace(itemId, x, y) {
    const owned = inv.find((i) => i.itemId === itemId)?.qty || 0;
    if (owned <= 0) { toast?.('None left — pick one back up to place it again.'); return; }
    saveInterior([...placements, { itemId, x, y }]);
    await api.removeInventoryItem(player.id, itemId, false);
    await loadInventory();
  }
  function onMove(i, x, y) {
    // Upgrade the moved entry to the clean {itemId,x,y,rot} shape (lazy migration; keep rot).
    saveInterior(placements.map((p, j) => (j === i ? { itemId: p.itemId, x, y, rot: p.rot || 0 } : p)));
  }
  function onRotate(i) {
    // Rotate one quarter-turn about its centre, then re-clamp (handled in rotatePlacement).
    if (!placements[i]) return;
    const next = rotatePlacement(placements[i], creations);
    saveInterior(placements.map((p, j) => (j === i ? next : p)));
  }
  async function onPickup(i) {
    const it = placements[i];
    if (!it) return;
    saveInterior(placements.filter((_, j) => j !== i));
    await api.addInventoryItem(player.id, it.itemId, 1);
    await loadInventory();
  }
  async function clearRoom() {
    for (const p of placements) await api.addInventoryItem(player.id, p.itemId, 1); // return everything
    saveInterior([]);
    await loadInventory();
  }

  if (!shop) {
    return <div className="h-full flex items-center justify-center pixel-text text-inksoft">Opening your shop…</div>;
  }

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={onBack} className="cozy-btn-ghost text-xs">← Street (Esc)</button>
          <h1 className="pixel-text text-base text-ink">{type?.emoji} Your {type?.name}</h1>
          <div className="ml-auto flex rounded-xl overflow-hidden border-[3px] border-parch">
            <button onClick={() => setMode('walk')}
              className={`pixel-text text-[10px] px-3 py-2 ${mode === 'walk' ? 'bg-peach text-paper' : 'bg-cream text-inksoft'}`}>🚶 Walk</button>
            <button onClick={() => setMode('setup')}
              className={`pixel-text text-[10px] px-3 py-2 ${mode === 'setup' ? 'bg-peach text-paper' : 'bg-cream text-inksoft'}`}>🔧 Setup</button>
          </div>
        </div>

        {mode === 'walk' && (
          <ShopRoom owner={player} walker={player.avatar} shop={{ ...shop, interior, interior2 }} ownerInv={inv} creations={creations} isOwn onLeave={onBack} />
        )}

        {mode === 'setup' && (
        <>
        {/* Greeting banner — owner avatar + the welcome message visitors will see */}
        <div className="panel p-4 mb-4 flex items-center gap-3">
          <div className="bg-skyhi rounded-xl border-2 border-parch p-1 shrink-0">
            <Avatar data={player.avatar} scale={3} />
          </div>
          <div className="flex-1">
            <span className="pixel-text text-[10px] text-inksoft">Your greeting to visitors</span>
            <input
              value={shop.greeting || ''}
              maxLength={GREETING_MAX}
              placeholder="Welcome to my shop!"
              onChange={(e) => saveFacade({ greeting: e.target.value })}
              className="mt-1 w-full rounded-xl border-[3px] border-parch bg-cream px-3 py-2 outline-none focus:border-peach"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Facade editor + live preview */}
          <div className="panel p-5">
            <h2 className="pixel-text text-xs text-inksoft mb-3">Shop front</h2>
            <div className="flex justify-center bg-skyhi rounded-2xl border-[3px] border-parch p-2 mb-4">
              <PixelCanvas
                width={SHOP_W} height={SHOP_H} scale={3}
                draw={(ctx, s) => drawShophouse(ctx, 0, 0, s, {
                  wallType: player.shopType,
                  awning: shop.awningColor, wall: shop.wallColor, roof: shop.roofColor,
                  displaySprite: resolveItem(shop.facadeItem)?.sprite || SHOP_SIGNATURE_SPRITE[player.shopType],
                })}
              />
            </div>

            <label className="block mb-3">
              <span className="pixel-text text-[10px] text-inksoft">Sign text</span>
              <input value={shop.signText || ''} maxLength={SIGN_MAX}
                onChange={(e) => saveFacade({ signText: e.target.value })}
                className="mt-1 w-full rounded-xl border-[3px] border-parch bg-cream px-3 py-2 outline-none focus:border-peach" />
            </label>

            <div className="mb-3">
              <span className="pixel-text text-[10px] text-inksoft">Awning colour</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AWNING_COLORS.map((c) => (
                  <button key={c} onClick={() => saveFacade({ awningColor: c })}
                    className={`w-7 h-7 rounded-full border-[3px] ${shop.awningColor === c ? 'border-ink scale-110' : 'border-paper'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            <div>
              <span className="pixel-text text-[10px] text-inksoft">Window display</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DECOR_ITEMS.map((id) => (
                  <button key={id} onClick={() => saveFacade({ facadeItem: id })} title={resolveItem(id)?.name}
                    className={`p-1 rounded-lg border-2 ${shop.facadeItem === id ? 'border-peach bg-paper' : 'border-parch bg-cream'}`}>
                    <ItemSprite id={id} scale={2} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Unique shelf — every shop can create its own named goods to sell/trade.
              Sits to the right of Shop front (both single-column on md+). */}
          {shelfDef && (
            <div className="panel p-5">
              <h2 className="pixel-text text-xs text-inksoft mb-3">Your {shelfDef.label.toLowerCase()} ✨</h2>
              <ShelfGrid items={shelfItems} empty={`No ${shelfDef.noun}s on the shelf yet — add some below!`} />
              <form onSubmit={addShelfItem} className="mt-4">
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={40}
                    placeholder={shelfDef.placeholder}
                    className="flex-1 rounded-xl border-[3px] border-parch bg-cream px-3 py-2 outline-none focus:border-peach"
                  />
                  <button type="submit" className="cozy-btn-primary text-xs">+ Add</button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="pixel-text text-[10px] text-inksoft mr-1">Colour:</span>
                  <button type="button" onClick={() => setNewColor(null)}
                    className={`px-2 h-6 rounded-full border-2 text-[10px] ${newColor === null ? 'border-ink bg-paper' : 'border-parch bg-cream text-inksoft'}`}>Default</button>
                  {SHELF_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full border-[3px] ${newColor === c ? 'border-ink scale-110' : 'border-paper'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </form>
              {shelfItems.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {shelfItems.map(({ itemId }) => (
                    <span key={itemId} className="inline-flex items-center gap-1 bg-cream border-2 border-parch rounded-full pl-3 pr-1 py-1 text-sm text-inksoft">
                      {resolveItem(itemId)?.name || itemId}
                      <button onClick={() => removeShelfItem(itemId)}
                        aria-label={`Remove ${resolveItem(itemId)?.name || itemId}`}
                        className="w-5 h-5 rounded-full bg-rose/20 text-rose hover:bg-rose hover:text-paper transition leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-inksoft mt-3">When a friend trades for one of these, it lands in their bag.</p>
            </div>
          )}

          {/* Interior decorator — drag furniture, design floor tiles, theme the room */}
          <div className="panel p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="pixel-text text-xs text-inksoft">Decorate</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="pixel-text text-[10px] text-inksoft mr-1">Theme</span>
                  <button onClick={() => saveFacade({ interiorTheme: null })} title="Match my shop"
                    className={`w-6 h-6 rounded-full border-[3px] ${!shop.interiorTheme ? 'border-ink scale-110' : 'border-paper'}`}
                    style={{ background: defaultThemeFor(player.shopType).wall }} />
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button key={key} onClick={() => saveFacade({ interiorTheme: key })} title={key}
                      className={`w-6 h-6 rounded-full border-[3px] ${shop.interiorTheme === key ? 'border-ink scale-110' : 'border-paper'}`}
                      style={{ background: t.wall }} />
                  ))}
                </div>
                <div className="flex rounded-lg overflow-hidden border-2 border-parch">
                  <button onClick={() => setEditFloor(1)}
                    className={`pixel-text text-[10px] px-2 py-1 ${editFloor === 1 ? 'bg-peach text-paper' : 'bg-cream text-inksoft'}`}>Floor 1</button>
                  <button onClick={() => setEditFloor(2)}
                    className={`pixel-text text-[10px] px-2 py-1 ${editFloor === 2 ? 'bg-peach text-paper' : 'bg-cream text-inksoft'}`}>🛏️ Floor 2</button>
                </div>
              </div>
            </div>

            <ShopRoom
              owner={player} walker={player.avatar}
              shop={{ ...shop, interior, interior2 }}
              ownerInv={inv} creations={creations} isOwn
              editable selected={selected} editFloor={editFloor}
              onPlace={onPlace} onMove={onMove} onPickup={onPickup} onRotate={onRotate} toast={toast}
            />

            <div className="mt-3">
              {(furnitureOwned.length + tilesOwned.length) === 0 ? (
                <p className="text-xs text-inksoft text-center">No furniture or floor tiles in your bag yet — design floor tiles in <strong>Make your own 🎨</strong> below, then tap one and place it.</p>
              ) : (
                <>
                  {furnitureOwned.length > 0 && (
                    <div className="mb-2">
                      <span className="pixel-text text-[10px] text-inksoft">Furniture (walk around it)</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {furnitureOwned.map(({ itemId, qty }) => (
                          <button key={itemId} onClick={() => setSelected(selected === itemId ? null : itemId)} title={`${placeableName(itemId, creations)} ×${qty}`}
                            className={`p-1 rounded-lg border-2 ${selected === itemId ? 'border-peach bg-paper scale-105' : 'border-parch bg-cream'}`}>
                            <Placeable id={itemId} creations={creations} scale={2} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {tilesOwned.length > 0 && (
                    <div>
                      <span className="pixel-text text-[10px] text-inksoft">Floor tiles (walk on them)</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {tilesOwned.map(({ itemId, qty }) => (
                          <button key={itemId} onClick={() => setSelected(selected === itemId ? null : itemId)} title={`${placeableName(itemId, creations)} ×${qty}`}
                            className={`p-1 rounded-lg border-2 ${selected === itemId ? 'border-peach bg-paper scale-105' : 'border-parch bg-cream'}`}>
                            <Placeable id={itemId} creations={creations} scale={2} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {placements.length > 0 && (
              <div className="text-center mt-3">
                <button onClick={clearRoom} className="cozy-btn-ghost text-xs">🧹 Clear room (return to bag)</button>
              </div>
            )}
          </div>

          {/* Floor Tile Designer — draw your own pixel floor tiles to lay in your shop */}
          <div className="panel p-5 md:col-span-2">
            <h2 className="pixel-text text-xs text-inksoft mb-1">Floor Tile Designer 🎨</h2>
            <p className="text-xs text-inksoft mb-3">Draw a tile — it goes in your bag, then lay it on the floor (furniture sits on top). You can trade or gift tiles too.</p>
            <PixelEditor onSave={saveCreation} templates={templates} />
            {ownedDecor.length > 0 && (
              <div className="mt-4">
                <span className="pixel-text text-[10px] text-inksoft">Your floor tiles (in your bag — place, trade or gift them)</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ownedDecor.map(({ itemId, qty }) => (
                    <div key={itemId} className="bg-cream border-2 border-parch rounded-xl p-2 w-[88px] flex flex-col items-center">
                      <Placeable id={itemId} creations={creations} scale={3} />
                      <span className="text-[10px] text-inksoft mt-1 text-center leading-tight truncate w-full">{placeableName(itemId, creations)}{qty > 1 ? ` ×${qty}` : ''}</span>
                      <button onClick={() => donateDecor(itemId)} title="Donate (give it away)"
                        className="mt-1 text-[10px] rounded-full px-2 py-0.5 bg-sky/40 text-inksoft border-2 border-parch hover:bg-sky">🎁 Donate</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
