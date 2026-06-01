// Generates PWA app icons (a cozy pixel shophouse) as PNGs — no image tooling
// needed, just a tiny hand-rolled PNG encoder over zlib. Run: node scripts/gen-icons.mjs
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const C = {
  bg: [191, 227, 240], brick: [201, 123, 99], awn: [241, 167, 184], cream: [255, 248, 234],
  glass: [125, 184, 224], wood: [125, 85, 56], green: [143, 199, 160], pot: [176, 122, 79],
};

function makeIcon(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => { if (x < 0 || y < 0 || x >= size || y >= size) return; const i = (y * size + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, C.bg);
  const pad = maskable ? 0.18 : 0.1;
  const scale = Math.floor((size * (1 - 2 * pad)) / 16);
  const ox = Math.floor((size - scale * 16) / 2), oy = Math.floor((size - scale * 16) / 2);
  const rect = (gx, gy, w, h, col) => { for (let yy = 0; yy < h * scale; yy++) for (let xx = 0; xx < w * scale; xx++) set(ox + gx * scale + xx, oy + gy * scale + yy, col); };
  rect(2, 2, 12, 2, C.brick);   // roof trim
  rect(2, 4, 12, 1, C.awn);     // awning
  rect(2, 5, 12, 9, C.cream);   // wall
  rect(4, 7, 2, 2, C.glass);    // window
  rect(10, 7, 2, 2, C.glass);   // window
  rect(7, 10, 2, 4, C.wood);    // door
  rect(2, 13, 12, 1, C.wood);   // step
  rect(11, 9, 3, 2, C.green);   // plant leaves
  rect(12, 11, 2, 3, C.pot);    // pot
  return png(size, buf);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/pwa-192.png', makeIcon(192, false));
writeFileSync('public/pwa-512.png', makeIcon(512, false));
writeFileSync('public/maskable-512.png', makeIcon(512, true));
writeFileSync('public/apple-touch-icon.png', makeIcon(180, false));
writeFileSync('public/favicon.png', makeIcon(64, false));
console.log('icons written to public/');
