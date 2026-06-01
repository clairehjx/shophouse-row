import { useEffect, useRef } from 'react';
import { drawSprite } from '../pixel/engine.js';

// Renders crisp pixel art at an integer scale.
//
// Two ways to use it:
//  1) layers: [{ sprite, palette }, ...]  — composited bottom-to-top (avatars, items)
//  2) draw: (ctx, scale) => {...}          — a procedural scene (the street, shophouses)
//
// `width`/`height` are LOGICAL pixels; the canvas is sized width*scale × height*scale.
export default function PixelCanvas({
  width,
  height,
  scale = 4,
  layers,
  draw,
  className,
  style,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (typeof draw === 'function') {
      draw(ctx, scale);
    }
    if (Array.isArray(layers)) {
      for (const layer of layers) {
        if (!layer || !layer.sprite) continue;
        drawSprite(ctx, layer.sprite, layer.palette, {
          scale,
          ox: (layer.ox || 0) * scale,
          oy: (layer.oy || 0) * scale,
        });
      }
    }
  }, [width, height, scale, layers, draw]);

  return (
    <canvas
      ref={ref}
      width={width * scale}
      height={height * scale}
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', ...style }}
    />
  );
}
