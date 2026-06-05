// Shared room geometry — the single source of truth for the renderer (ShopRoom) AND the
// placement migration (normalizePlacement in items.js), so the two can never drift.
// The logical room stays 192×144 (see InteriorPlan.MD: "same room, render bigger").
export const TILE = 16;
export const COLS = 12;
export const ROWS = 9;
export const ROOM_W = COLS * TILE; // 192
export const ROOM_H = ROWS * TILE; // 144

// Where the legacy 6×4 decoration grid ({itemId,c,r}) was displayed in the room.
// Used only to convert old placements to the new free {x,y} shape at the identical pixel.
export const DISP_C0 = 3;
export const DISP_R0 = 3;
