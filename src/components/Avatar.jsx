import PixelCanvas from './PixelCanvas.jsx';
import { drawAvatar, AVATAR_SIZE, DEFAULT_AVATAR } from '../pixel/avatar.js';

// A single pixel avatar at the given integer scale.
export default function Avatar({ data, scale = 4, className, style }) {
  const a = data || DEFAULT_AVATAR;
  return (
    <PixelCanvas
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      scale={scale}
      draw={(ctx, s) => drawAvatar(ctx, s, a, 0, 0)}
      className={className}
      style={style}
    />
  );
}
