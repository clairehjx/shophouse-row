# Shophouse Row — Furniture & Interior Design Brief

> Paste this whole file into a fresh Claude.ai chat. It is self-contained: it teaches
> you (Claude) the pixel format we use, so you can **generate interactive Artifacts**
> (HTML/canvas) that let me design furniture and shop interiors and *see them render*.
> There are no secrets here. Use Artifacts freely — that's the whole point.

---

## What I'm building

**Shophouse Row** is a cozy **pixel-art, top-down multiplayer game**. Each friend (~14 girls,
I'm the admin) runs a shophouse on a shared street: you walk around a little room, **decorate
it across 2 floors**, and visit friends. It's hand-rolled pixel art on an HTML canvas — no game
engine. Think Animal Crossing warmth in a tiny pixel doll-house.

Right now I want to design **better furniture** and the **look & feel of the shop interior**.

## The sprite format (this is how ALL art works — copy it exactly in your Artifacts)

A sprite is just an **array of equal-length strings**. Each **character = one pixel**, mapped to
a colour by a palette. `.` (and space) = **transparent**.

```js
// Renderer: each char becomes a filled square of `scale` px. '.' and ' ' are skipped.
function drawSprite(ctx, sprite, palette, scale, ox = 0, oy = 0) {
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const hex = palette[ch];
      if (!hex) continue;
      ctx.fillStyle = hex;
      ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale);
    }
  }
}
```

- Existing decor/icons are tiny (~12×12). **New furniture targets 24×24** (room for real shading).
- Pixels look crisp: set `ctx.imageSmoothingEnabled = false` and render at scale 8–16 for previews.
- Furniture sits in a **top-down room**, so a piece is drawn in a slightly **oblique / 3-quarter**
  view (you see the top *and* a bit of the front face) so it reads as an object on a floor.

## The palette (chars → hex)

**Current 16 colours** (all warm/saturated — note: there are NO neutral greys yet):

```js
const PALETTE = {
  k: '#4a3a2e', // outline (dark brown, used as the silhouette line)
  w: '#fff8ea', // cream white
  c: '#f3e7c9', // tan
  r: '#e2604f', // red
  p: '#f4a9c7', // pink
  m: '#d98ac0', // magenta
  g: '#8fc7a0', // green
  G: '#5b9b6f', // deep green
  y: '#f6c875', // yellow
  o: '#f4a96b', // orange
  b: '#7fb8e0', // blue
  B: '#4a90d9', // deep blue
  u: '#c7b6e8', // lilac
  n: '#a9764f', // brown
  t: '#6fc6c0', // teal
  s: '#dfe8ef', // silver/glass (cool, light)
};
```

**Planned additions for furniture** (additive — safe, nothing else changes). Wood + fabric + sage
+ a stone-grey ramp so we can do Octopath-style stone:

```js
const FURNITURE_EXTRA = {
  N: '#6f4a30', // dark wood (legs / shadow side)
  W: '#c79468', // light wood / highlight
  d: '#3a2c22', // deep shadow (darker than k) — also ambient-occlusion
  f: '#d98aa8', // rose fabric midtone
  F: '#b56b86', // rose fabric shadow
  l: '#fbe6c0', // warm cream highlight (linens, lamp glow, the warm "lip")
  e: '#8a9b7a', // sage (plants, upholstery)
  E: '#5e6f4f', // sage shadow
  S: '#9aa0ab', // stone light  (cool) — lit tread of stairs
  x: '#5d6470', // stone shadow (cool) — riser of stairs
};
```

Treat all of the above as one merged palette when rendering: `{ ...PALETTE, ...FURNITURE_EXTRA }`.

## Style rules (the "house look")

- **Single dark outline on the OUTER silhouette only** (`k`, or `d` for stone). **Never** put black
  outlines *between* internal parts — separate shapes with shading/colour instead. (Internal black
  lines = the #1 thing that makes pixel art look cheap.)
- **One light direction** (top / upper-left). Top faces = light; front/under faces = shadow.
- **Warm light, cool shadow.** Lit surfaces lean warm (cream/tan/amber); shadows lean cool/deep.
- Bottom-align legs/base; keep a **readable silhouette** (recognisable even as a tiny black blob).
- Cozy, soft, hand-made feel. A little stone/wood **noise** (1–2 stray pixels of an adjacent shade)
  beats flat fills.

## The current design problem: stairs that feel like Octopath Traveler

I want stone stairs with that **HD-2D** Octopath look. The four ingredients that matter:

1. **Light-band / dark-band rhythm** — each step = a **lit tread** (top) + a **shadowed riser**
   (front). The repeating light/dark stripes ARE the staircase illusion.
2. **Warm lit treads, cool shadowed risers** (torch-lit stone).
3. **A bright warm lip** (one `l` cream pixel) on the leading edge of each step — the "glow".
4. **No internal black outlines** — steps separated by shading only; black just on the outer edge.
   Plus a little **ambient occlusion** (`d`) in the inner corner where a riser meets the next tread.

Because the game is top-down with no real height, stairs are a **decorative prop** — the whole job
is "make a flat 24×24 sprite *read* as Octopath stairs." A **front-facing flight that narrows toward
the back** sells depth best.

**Starter sketch** (illustrative, ~16 wide — `S`=lit tread, `l`=warm lip, `x`=shadow riser,
`d`=outer edge/AO, `.`=transparent):

```
....dSSSSSSd....
....dllllllll....
...dxxxxxxxxd...
...dSSSSSSSSd...
...dllllllllld..
..dxxxxxxxxxxd..
..dSSSSSSSSSSd..
..dllllllllllld.
.dxxxxxxxxxxxxd.
.dSSSSSSSSSSSSd.
.dllllllllllllld
dxxxxxxxxxxxxxxd
dSSSSSSSSSSSSSSd
dlllllllllllllld
dxxxxxxxxxxxxxxxx
dddddddddddddddd
```

## What I want you (Claude.ai) to do

**Build interactive Artifacts so I can design on my phone.** Specifically, start with:

1. **A pixel sprite previewer/editor Artifact** — a self-contained HTML page that:
   - defines the merged palette above,
   - renders a char-array sprite big and crisp (`imageSmoothingEnabled = false`, scale ~12),
   - has a **textarea** where I paste/edit a sprite (array of strings) and see it update live,
   - shows a **palette legend** (swatch + char) so I know which letter is which colour,
   - optional: a click-to-paint grid that outputs the char-array text.

2. Then use it to **iterate on furniture pieces** with me: stairs first (Octopath look above), then
   `armchair, sofa, bed, round table, bookshelf, dresser, lamp, rug, plant pot, clock`. Give each as a
   24×24 char-array in the format above, following the style rules. Show them rendered in the Artifact.

3. **Shop-interior mood**: also help design the *room* the furniture sits in — a cozy top-down
   pixel room (wood floor, a back wall, a window, a rug), warm and inviting, 2 floors. Mock it up as
   an Artifact showing furniture placed in the room so we can judge the overall feel.

**Constraints to honour:** keep every sprite a rectangular array of equal-length strings; only use the
palette chars above (or propose new ones explicitly with a hex); transparent = `.`; outer outline only;
warm light / cool shadow. When you invent a piece, give me the paste-ready `const name = [ ... ]` block.

Ask me about vibe/colour when it'd change the design. Let's make it cute. 🩵
