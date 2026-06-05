#!/usr/bin/env python3
"""Offline furniture-sprite generator for Shophouse Row (see InteriorPlan.MD §C and
Furniture-design-brief.md). Asks a Gemini TEXT model for a 24x24 char-array sprite in
our pixel format, validates it hard, and prints a paste-ready JS snippet.

Usage:
    python scripts/gen-furniture.py "bed"
    python scripts/gen-furniture.py "round table" --preview      # ANSI colour preview
    python scripts/gen-furniture.py "lamp" --tries 4             # inner retries per model

Reads GEMINI_API_KEY from the environment (the repo is public — never hard-code it).
NEVER edits items.js: run a piece 2-3x, eyeball it, hand-fix the outline/shading, then
paste the best one into src/pixel/items.js yourself.
"""
import os
import sys
import json

try:
    from google import genai
    from google.genai import types
except ImportError:
    sys.exit("Missing dependency. Run:  pip install google-genai")

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    sys.exit("GEMINI_API_KEY is not set in the environment.")

# ---- args -------------------------------------------------------------------
args = sys.argv[1:]
preview = "--preview" in args
tries = 3
if "--tries" in args:
    i = args.index("--tries"); tries = int(args[i + 1]); del args[i:i + 2]
args = [a for a in args if not a.startswith("--")]
piece = args[0] if args else "bed"

SIZE = 24  # furniture is 24x24 (see the brief)

# ---- palette (char -> plain colour). Must match src/pixel/icons.js. ----------
PALETTE = {
    "k": "dark brown outline", "w": "cream white", "c": "tan", "r": "red",
    "p": "pink", "m": "magenta", "g": "green", "G": "deep green", "y": "yellow",
    "o": "orange", "b": "blue", "B": "deep blue", "u": "lilac", "n": "brown",
    "t": "teal", "s": "silver/glass",
    # furniture shades
    "N": "dark wood (legs/shadow side)", "W": "light wood/highlight",
    "d": "deep shadow (darker than k); ambient occlusion",
    "f": "rose fabric midtone", "F": "rose fabric shadow",
    "l": "warm cream highlight (linens/lamp glow/lip)",
    "e": "sage", "E": "sage shadow",
    "S": "stone light (lit stair tread)", "x": "stone shadow (stair riser)",
}
# Hexes for the ANSI preview only (kept in sync with icons.js).
HEX = {
    "k": "4a3a2e", "w": "fff8ea", "c": "f3e7c9", "r": "e2604f", "p": "f4a9c7",
    "m": "d98ac0", "g": "8fc7a0", "G": "5b9b6f", "y": "f6c875", "o": "f4a96b",
    "b": "7fb8e0", "B": "4a90d9", "u": "c7b6e8", "n": "a9764f", "t": "6fc6c0",
    "s": "dfe8ef", "N": "6f4a30", "W": "c79468", "d": "3a2c22", "f": "d98aa8",
    "F": "b56b86", "l": "fbe6c0", "e": "8a9b7a", "E": "5e6f4f", "S": "9aa0ab",
    "x": "5d6470",
}
ALLOWED = set(PALETTE) | {".", " "}

# ---- a guaranteed-valid 24x24 few-shot (built in code so it can't be malformed) ----
def build_example():
    g = [["." for _ in range(SIZE)] for _ in range(SIZE)]
    x0, x1, y0, y1 = 4, 19, 8, 20          # a little wooden chest
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = "W"                  # lit wood body
    for y in range(y1 - 3, y1 + 1):        # front face in shadow
        for x in range(x0, x1 + 1):
            g[y][x] = "N"
    for x in range(x0, x1 + 1):            # outer outline only
        g[y0][x] = g[y1][x] = "k"
    for y in range(y0, y1 + 1):
        g[y][x0] = g[y][x1] = "k"
    for x in range(x0 + 1, x1):            # warm lip on the top/front seam
        g[y1 - 3][x] = "l"
    return ["".join(row) for row in g]

EXAMPLE = build_example()

LEGEND = "\n".join(f"  {ch} = {desc}" for ch, desc in PALETTE.items())

PROMPT = f"""You design pixel-art furniture for a cozy top-down game called Shophouse Row.

Output ONE sprite as JSON, EXACTLY this shape and nothing else:
{{"name": "<short name>", "sprite": [ ... {SIZE} strings ... ]}}

Hard rules for "sprite":
- EXACTLY {SIZE} strings (rows). Each string EXACTLY {SIZE} characters.
- One character = one pixel. "." is transparent.
- Use ONLY these palette characters (char = colour):
{LEGEND}

Style ("house look"):
- Slightly oblique top-down 3/4 view: show the top AND a bit of the front face.
- Single dark outline (k) on the OUTER silhouette ONLY. NEVER put black/outline pixels
  between internal parts — separate shapes with shading or colour instead.
- One light direction (top / upper-left): top faces lit/warm, front & under faces in shadow.
- Warm light, cool shadow. Bottom-align the base; keep a readable silhouette.
- For wood use N (dark) + W (light); fabric f/F; sage e/E; stone S/x; warm lip = l.

Here is a VALID example (a little chest) in the exact format — match this format precisely:
{json.dumps({"name": "chest", "sprite": EXAMPLE})}

Now design: "{piece}". Return ONLY the JSON object."""

# Newest text model first; fall back to the previous generation of the same (flash) class.
MODELS = ["gemini-3.5-flash", "gemini-3-flash", "gemini-2.5-flash", "gemini-2.0-flash"]

client = genai.Client(api_key=API_KEY)


def validate(sprite):
    if not isinstance(sprite, list):
        return None, "sprite is not a list"
    if len(sprite) != SIZE:
        return None, f"{len(sprite)} rows (need {SIZE})"
    out = []
    for i, row in enumerate(sprite):
        if not isinstance(row, str):
            return None, f"row {i} is not a string"
        if len(row) != SIZE:
            return None, f"row {i} is {len(row)} chars (need {SIZE})"
        bad = sorted({ch for ch in row if ch not in ALLOWED})
        if bad:
            return None, f"row {i} has illegal chars {bad}"
        out.append(row)
    if all(ch in ". " for row in out for ch in row):
        return None, "sprite is all-transparent"
    return out, None


def ask(model):
    cfg = types.GenerateContentConfig(
        response_mime_type="application/json", temperature=0.4
    )
    resp = client.models.generate_content(model=model, contents=PROMPT, config=cfg)
    data = json.loads(resp.text)
    return data.get("name") or piece, data.get("sprite")


def js_ident(s):
    parts = "".join(c if c.isalnum() else " " for c in s).split()
    if not parts:
        return "piece"
    return parts[0].lower() + "".join(p.capitalize() for p in parts[1:])


def ansi(sprite):
    lines = []
    for row in sprite:
        cells = []
        for ch in row:
            if ch in ". ":
                cells.append("  ")
            else:
                r = int(HEX[ch][0:2], 16); g = int(HEX[ch][2:4], 16); b = int(HEX[ch][4:6], 16)
                cells.append(f"\x1b[48;2;{r};{g};{b}m  \x1b[0m")
        lines.append("".join(cells))
    return "\n".join(lines)


def emit(name, sprite):
    var = js_ident(name)
    print(f"\n// --- paste into src/pixel/items.js (curate first!) ---")
    print(f"const {var} = [")
    for row in sprite:
        print(f"  '{row}',")
    print("];")
    pid = var
    print(f"  {{ id: '{pid}', name: '{name.title()}', category: 'furniture', sprite: {var} }},")
    if preview:
        print("\n" + ansi(sprite))


last_err = None
for model in MODELS:
    for attempt in range(1, tries + 1):
        try:
            print(f"Trying {model} (attempt {attempt}/{tries}) …", file=sys.stderr, flush=True)
            name, sprite = ask(model)
            ok, reason = validate(sprite)
            if ok:
                print(f"✅ valid 24x24 sprite from {model}", file=sys.stderr)
                emit(name, ok)
                sys.exit(0)
            print(f"   invalid: {reason}", file=sys.stderr)
        except Exception as e:  # noqa: BLE001 — retry / fall back on any error
            last_err = e
            print(f"   {model} error: {e}", file=sys.stderr)

sys.exit(f"All models failed to produce a valid sprite. Last error: {last_err}")
