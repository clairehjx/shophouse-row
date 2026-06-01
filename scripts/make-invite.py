#!/usr/bin/env python3
"""Generate a Shophouse Row invitation card (PNG) with Gemini's image model
("Nano Banana 2" / Gemini 3 Pro Image), falling back to earlier image models.

Usage:
    python scripts/make-invite.py "Jeanette" "puppy"

Reads GEMINI_API_KEY from the environment (never hard-code it).
Output: invites/<name>.png
"""
import os
import sys
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    sys.exit("Missing dependency. Run:  pip install google-genai")

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    sys.exit("GEMINI_API_KEY is not set in the environment.")

name = sys.argv[1] if len(sys.argv) > 1 else "Friend"
code = sys.argv[2] if len(sys.argv) > 2 else "puppy"   # the website (gate) code
shop_code = sys.argv[3] if len(sys.argv) > 3 else name.lower().replace(" ", "").replace(".", "")  # the player's Shophouse Row code
SITE = "claire-hjx.vercel.app"

PROMPT = f"""Design a single, polished INVITATION CARD as a portrait image (3:4 aspect ratio, like a phone screen).

Visual style: cozy and cute, a blend of soft watercolor and retro pixel-art. Dreamy pastel-blue and warm-peach colour palette. A rounded paper card with gentle shadows. Include a charming little pixel-art row of shophouses along the bottom and a cute friendly puppy near the title. Kid-friendly and hand-made feeling, suitable for an 11-year-old. Leave generous, clean space for the text so everything is easy to read.

Render this EXACT text on the card, neatly arranged and perfectly spelled and legible:

• Title (big, playful): You're invited!
• Greeting: Hi {name}!
• Short message: Come play my cozy pixel game, Shophouse Row — you get your own little shop on our street!
• Two clearly highlighted rounded boxes, stacked, that stand out:
    Box 1 — Website secret code:  {code}
    Box 2 — Your Shophouse Row secret code:  {shop_code}
• A numbered list titled "How to join:"
    1. Go to {SITE}
    2. Type the website secret code: {code}
    3. Scroll to "Shophouse Row" and click "Open app"
    4. Enter your name ({name}) and your Shophouse Row code: {shop_code}
• A short list titled "How to play:"
    - Walk around with the arrow buttons; press the up button to enter a shop
    - Decorate your shop and draw your own items in the pixel editor
    - Visit friends to leave notes, trade items, and give gifts
• Footer in a cute handwritten style: See you on the row! — Claire

Keep the layout tidy and uncramped; all text must be spelled correctly, well-aligned, and easy to read. No watermarks."""

# Newest first; the script falls back to the previous generation of the same class.
MODELS = [
    "gemini-3-pro-image-preview",   # Nano Banana 2 / Pro
    "gemini-3-pro-image",
    "gemini-2.5-flash-image",       # Nano Banana
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-preview-image-generation",
]

client = genai.Client(api_key=API_KEY)
out_dir = Path(__file__).resolve().parent.parent / "invites"
out_dir.mkdir(exist_ok=True)
dest = out_dir / (name.lower().replace(" ", "_").replace(".", "") + ".png")


def generate(model: str) -> bool:
    config = types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])
    resp = client.models.generate_content(model=model, contents=PROMPT, config=config)
    for cand in (resp.candidates or []):
        parts = getattr(cand.content, "parts", None) or []
        for part in parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                dest.write_bytes(inline.data)
                # The model may return JPEG bytes; normalise to a real PNG if possible.
                import shutil, subprocess
                if shutil.which("convert"):
                    try:
                        subprocess.run(["convert", str(dest), f"png24:{dest}"], check=True)
                    except Exception:
                        pass
                return True
    return False


last_err = None
for model in MODELS:
    try:
        print(f"Trying {model} …", flush=True)
        if generate(model):
            print(f"✅ Saved {dest}  (model: {model})")
            sys.exit(0)
        print(f"   {model}: returned no image, trying next…")
    except Exception as e:  # noqa: BLE001 — try the next model on any error
        last_err = e
        print(f"   {model} failed: {e}")

sys.exit(f"All image models failed. Last error: {last_err}")
