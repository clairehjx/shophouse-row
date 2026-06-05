// Headless preservation smoke test for the interior upgrade (InteriorPlan.MD, req #2:
// "never lose a decoration anyone has already placed"). Runs against the local store.
//   node scripts/smoke-interior.mjs
// Polyfill localStorage BEFORE importing api.js so the PROD-off seam picks localStore.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

const api = (await import('../src/data/api.js')).default;
const { normalizePlacement, placeableSprite, setCreationsRegistry, isFloorTile, isSolid } =
  await import('../src/pixel/items.js');
const { TILE, ROOM_W, ROOM_H } = await import('../src/pixel/roomGeom.js');
const { spriteSize } = await import('../src/pixel/engine.js');

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) failures++; };

await api.ensureSeeded();
const players = await api.listPlayers();
const id = players[0].id; // any seeded shop owner

// 1) Register a fake floor-tile creation so creation:cr1 resolves.
const sprite16 = Array.from({ length: 16 }, () => 'bbbbbbbbbbbbbbbb');
const creations = [{ id: 'cr1', sprite: sprite16, name: 'Test Tile' }];
setCreationsRegistry({ cr1: { id: 'cr1', sprite: sprite16, name: 'Test Tile' } });

// 2) Save a deliberately mixed set: legacy {c,r} decor, legacy {c,r} creation, new {x,y} furniture.
const input = [
  { itemId: 'mug', c: 1, r: 1 },              // legacy decor (walk-through)
  { itemId: 'creation:cr1', c: 4, r: 2 },     // legacy creation → re-roled as floor tile
  { itemId: 'armchair', x: 80, y: 60 },       // new furniture (solid)
];
await api.saveShop(id, { interior: input });

// 3) Read back and normalize exactly as the renderer does.
const shop = await api.getShop(id);
const out = (shop.interior || []).map((p) => normalizePlacement(p, creations));

// 4) Preservation assertions.
ok(out.length === input.length, `count preserved (${input.length} in → ${out.length} out, none dropped)`);
for (const p of out) {
  const s = placeableSprite(p.itemId, creations);
  const { w, h } = s ? spriteSize(s) : { w: 0, h: 0 };
  ok(!!s, `sprite resolves: ${p.itemId}`);
  ok(Number.isFinite(p.x) && Number.isFinite(p.y), `finite x,y: ${p.itemId} → (${p.x},${p.y})`);
  ok(p.x >= TILE && p.x <= ROOM_W - TILE - w && p.y >= TILE && p.y <= ROOM_H - TILE - h,
    `in floor bounds: ${p.itemId} → (${p.x},${p.y}) [w${w} h${h}]`);
}
// Layer/solidity is derived correctly from the itemId.
ok(isFloorTile('creation:cr1') && !isSolid('creation:cr1'), 'creation → floor tile (walkable)');
ok(isSolid('armchair'), 'armchair → solid furniture');
ok(!isSolid('mug') && !isFloorTile('mug'), 'mug → walk-through decor');

// 5) Theme round-trip through the opaque saveShop seam (no DB column needed locally).
await api.saveShop(id, { interiorTheme: 'rose' });
const themed = await api.getShop(id);
ok(themed.interiorTheme === 'rose', `theme round-trips: interiorTheme = ${themed.interiorTheme}`);

console.log(failures === 0 ? '\n🎉 All preservation checks passed.' : `\n💥 ${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
