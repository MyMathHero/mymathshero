// Layered avatar parts — MOBILE COPY of web lib/avatarParts.js.
// Keep in sync with the web version. Pure data + functions, no deps, so
// web (<svg>) and mobile (react-native-svg) draw an identical avatar.
/* eslint-disable */
// Layered avatar system — the single source of truth for every drawable part.
//
// WHY LAYERS: the old system had 12 hardcoded preset characters (pick a whole
// character, can't change its hair) plus emoji "cosmetics" that sat beside the
// avatar rather than on it. This registry replaces both: an avatar is a stack of
// independent parts, so a student can change hair, add a hat, swap a top, etc.
//
// WHY SVG (not layered PNGs): every part is a pure geometry function taking
// COLOUR props, so "6 hairstyles x 6 hair colours" is 6 shapes + a colour
// picker, not 36 image files. It stays crisp at any size, needs no network
// requests, and the SAME part data renders on web (<svg>) and mobile
// (react-native-svg).
//
// COORDINATES: everything is drawn in a 100x100 viewBox that matches the legacy
// CharacterAvatar geometry, so presets convert cleanly:
//   head   circle (50,46) r22      neck  rect x44 y62 w12 h12
//   eyes   y=46 (x=42 / x=58)      mouth y≈55
//   body   shoulders from y74 down to y100
//
// A part definition is:
//   { id, name, cost, shapes(colors) -> [ {type, ...attrs} ] }
// `shapes` returns PLAIN DATA (never JSX) so the same definition works in both
// renderers. Supported shape types: circle, ellipse, rect, path, line.

export const SKIN_TONES = [
  { id: 'porcelain', name: 'Porcelain', color: '#FCE0C8' },
  { id: 'light',     name: 'Light',     color: '#F5C9A6' },
  { id: 'medium',    name: 'Medium',    color: '#E8B98F' },
  { id: 'tan',       name: 'Tan',       color: '#D9A066' },
  { id: 'brown',     name: 'Brown',     color: '#A9714B' },
  { id: 'deep',      name: 'Deep',      color: '#6B4432' },
]

export const HAIR_COLORS = [
  { id: 'black',    name: 'Black',    color: '#1B1B1B' },
  { id: 'brown',    name: 'Brown',    color: '#3B2A1A' },
  { id: 'sandy',    name: 'Sandy',    color: '#A9743B' },
  { id: 'blonde',   name: 'Blonde',   color: '#E3B961' },
  { id: 'ginger',   name: 'Ginger',   color: '#C2571F' },
  { id: 'grey',     name: 'Grey',     color: '#9AA3AF' },
  { id: 'blue',     name: 'Blue',     color: '#2563EB' },
  { id: 'pink',     name: 'Pink',     color: '#EC4899' },
  { id: 'green',    name: 'Green',    color: '#16A34A' },
  { id: 'purple',   name: 'Purple',   color: '#7C3AED' },
]

export const CLOTHING_COLORS = [
  { id: 'navy',   name: 'Navy',   color: '#1E3A8A' },
  { id: 'gold',   name: 'Gold',   color: '#C49A1A' },
  { id: 'red',    name: 'Red',    color: '#DC2626' },
  { id: 'blue',   name: 'Blue',   color: '#2563EB' },
  { id: 'green',  name: 'Green',  color: '#16A34A' },
  { id: 'purple', name: 'Purple', color: '#7C3AED' },
  { id: 'black',  name: 'Black',  color: '#1F2937' },
  { id: 'white',  name: 'White',  color: '#F8FAFC' },
  { id: 'pink',   name: 'Pink',   color: '#EC4899' },
  { id: 'teal',   name: 'Teal',   color: '#0D9488' },
]

const INK = '#1F2937'   // outlines, eyes, mouth

// ── BACKGROUND ──────────────────────────────────────────────────────────────
export const BACKGROUNDS = [
  { id: 'sky',    name: 'Sky',    cost: 0, default: true, grad: ['#60A5FA', '#1D4ED8'] },
  { id: 'sunset', name: 'Sunset', cost: 0, grad: ['#FCA5A5', '#DC2626'] },
  { id: 'mint',   name: 'Mint',   cost: 0, grad: ['#6EE7B7', '#059669'] },
  { id: 'grape',  name: 'Grape',  cost: 60, grad: ['#C4B5FD', '#6D28D9'] },
  { id: 'gold',   name: 'Gold',   cost: 60, grad: ['#FDE68A', '#C49A1A'] },
  { id: 'space',  name: 'Space',  cost: 120, grad: ['#312E81', '#0B1020'] },
  { id: 'ocean',  name: 'Ocean',  cost: 120, grad: ['#67E8F9', '#0E7490'] },
]

// ── HAIR ────────────────────────────────────────────────────────────────────
// Drawn around the head circle (50,46) r22.
export const HAIR = [
  { id: 'none', name: 'Bald', cost: 0, shapes: () => [] },
  {
    id: 'short', name: 'Short', cost: 0, default: true,
    shapes: (c: any) => [
      { type: 'path', d: 'M28 44 Q28 22 50 22 Q72 22 72 44 Q72 33 50 31 Q28 33 28 44 Z', fill: c.hair },
    ],
  },
  {
    id: 'buzz', name: 'Buzz Cut', cost: 0,
    shapes: (c: any) => [
      { type: 'path', d: 'M29 42 Q30 26 50 26 Q70 26 71 42 Q66 34 50 34 Q34 34 29 42 Z', fill: c.hair },
    ],
  },
  {
    id: 'wavy', name: 'Wavy', cost: 40,
    shapes: (c: any) => [
      { type: 'path', d: 'M27 46 Q26 20 50 20 Q74 20 73 46 Q70 36 62 34 Q56 40 50 34 Q44 40 38 34 Q30 36 27 46 Z', fill: c.hair },
    ],
  },
  {
    id: 'curly', name: 'Curly', cost: 40,
    shapes: (c: any) => [
      { type: 'circle', cx: 34, cy: 30, r: 8, fill: c.hair },
      { type: 'circle', cx: 50, cy: 24, r: 9, fill: c.hair },
      { type: 'circle', cx: 66, cy: 30, r: 8, fill: c.hair },
      { type: 'circle', cx: 28, cy: 42, r: 6, fill: c.hair },
      { type: 'circle', cx: 72, cy: 42, r: 6, fill: c.hair },
    ],
  },
  {
    id: 'long', name: 'Long', cost: 60,
    shapes: (c: any) => [
      { type: 'path', d: 'M26 70 Q24 34 50 21 Q76 34 74 70 Q68 62 68 46 Q60 34 50 33 Q40 34 32 46 Q32 62 26 70 Z', fill: c.hair },
    ],
  },
  {
    id: 'ponytail', name: 'Ponytail', cost: 60,
    shapes: (c: any) => [
      { type: 'path', d: 'M28 44 Q28 21 50 21 Q72 21 72 44 Q72 32 50 30 Q28 32 28 44 Z', fill: c.hair },
      { type: 'ellipse', cx: 76, cy: 52, rx: 6, ry: 12, fill: c.hair },
    ],
  },
  {
    id: 'bun', name: 'Top Bun', cost: 80,
    shapes: (c: any) => [
      { type: 'circle', cx: 50, cy: 18, r: 7, fill: c.hair },
      { type: 'path', d: 'M28 44 Q28 22 50 22 Q72 22 72 44 Q72 33 50 31 Q28 33 28 44 Z', fill: c.hair },
    ],
  },
  {
    id: 'spiky', name: 'Spiky', cost: 80,
    shapes: (c: any) => [
      { type: 'path', d: 'M28 44 L33 26 L38 38 L44 22 L50 36 L56 22 L62 38 L67 26 L72 44 Q60 32 50 32 Q40 32 28 44 Z', fill: c.hair },
    ],
  },
]

// ── EYES ────────────────────────────────────────────────────────────────────
export const EYES = [
  {
    id: 'dot', name: 'Classic', cost: 0, default: true,
    shapes: () => [
      { type: 'circle', cx: 42, cy: 46, r: 3.1, fill: INK },
      { type: 'circle', cx: 58, cy: 46, r: 3.1, fill: INK },
    ],
  },
  {
    id: 'happy', name: 'Happy', cost: 0,
    shapes: () => [
      { type: 'path', d: 'M38 47 Q42 42 46 47', stroke: INK, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' },
      { type: 'path', d: 'M54 47 Q58 42 62 47', stroke: INK, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' },
    ],
  },
  {
    id: 'big', name: 'Big', cost: 30,
    shapes: () => [
      { type: 'circle', cx: 42, cy: 46, r: 5, fill: '#FFFFFF' },
      { type: 'circle', cx: 58, cy: 46, r: 5, fill: '#FFFFFF' },
      { type: 'circle', cx: 42.8, cy: 46.6, r: 2.6, fill: INK },
      { type: 'circle', cx: 58.8, cy: 46.6, r: 2.6, fill: INK },
    ],
  },
  {
    id: 'wink', name: 'Wink', cost: 30,
    shapes: () => [
      { type: 'circle', cx: 42, cy: 46, r: 3.1, fill: INK },
      { type: 'path', d: 'M54 46 Q58 43 62 46', stroke: INK, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' },
    ],
  },
  {
    id: 'sleepy', name: 'Sleepy', cost: 30,
    shapes: () => [
      { type: 'path', d: 'M38 46 Q42 49 46 46', stroke: INK, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' },
      { type: 'path', d: 'M54 46 Q58 49 62 46', stroke: INK, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' },
    ],
  },
]

// ── BROWS ───────────────────────────────────────────────────────────────────
export const BROWS = [
  { id: 'none', name: 'None', cost: 0, shapes: () => [] },
  {
    id: 'normal', name: 'Normal', cost: 0, default: true,
    shapes: (c: any) => [
      { type: 'path', d: 'M37 39 Q42 36 47 39', stroke: c.hair, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' },
      { type: 'path', d: 'M53 39 Q58 36 63 39', stroke: c.hair, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' },
    ],
  },
  {
    id: 'raised', name: 'Surprised', cost: 20,
    shapes: (c: any) => [
      { type: 'path', d: 'M37 36 Q42 33 47 36', stroke: c.hair, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' },
      { type: 'path', d: 'M53 36 Q58 33 63 36', stroke: c.hair, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' },
    ],
  },
  {
    id: 'serious', name: 'Serious', cost: 20,
    shapes: (c: any) => [
      { type: 'line', x1: 37, y1: 38, x2: 47, y2: 40, stroke: c.hair, strokeWidth: 2.2, strokeLinecap: 'round' },
      { type: 'line', x1: 53, y1: 40, x2: 63, y2: 38, stroke: c.hair, strokeWidth: 2.2, strokeLinecap: 'round' },
    ],
  },
]

// ── MOUTH ───────────────────────────────────────────────────────────────────
export const MOUTH = [
  {
    id: 'smile', name: 'Smile', cost: 0, default: true,
    shapes: () => [{ type: 'path', d: 'M43 55 Q50 60 57 55', stroke: INK, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' }],
  },
  {
    id: 'grin', name: 'Big Grin', cost: 0,
    shapes: () => [
      { type: 'path', d: 'M41 54 Q50 63 59 54 Z', fill: INK },
      { type: 'path', d: 'M43.5 55.5 Q50 55.5 56.5 55.5', stroke: '#FFFFFF', strokeWidth: 2, strokeLinecap: 'round' },
    ],
  },
  {
    id: 'neutral', name: 'Neutral', cost: 0,
    shapes: () => [{ type: 'line', x1: 44, y1: 56, x2: 56, y2: 56, stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round' }],
  },
  {
    id: 'surprised', name: 'Surprised', cost: 20,
    shapes: () => [{ type: 'ellipse', cx: 50, cy: 56, rx: 3.5, ry: 4.5, fill: INK }],
  },
  {
    id: 'tongue', name: 'Cheeky', cost: 20,
    shapes: () => [
      { type: 'path', d: 'M41 54 Q50 62 59 54 Z', fill: INK },
      { type: 'ellipse', cx: 52, cy: 59, rx: 3.4, ry: 2.6, fill: '#F87171' },
    ],
  },
]

// ── TOPS (shoulders/torso from y74) ─────────────────────────────────────────
export const TOPS = [
  {
    id: 'tee', name: 'T-Shirt', cost: 0, default: true,
    shapes: (c: any) => [
      { type: 'path', d: 'M16 100 Q16 74 50 74 Q84 74 84 100 Z', fill: c.top },
    ],
  },
  {
    id: 'hoodie', name: 'Hoodie', cost: 60,
    shapes: (c: any) => [
      { type: 'path', d: 'M16 100 Q16 74 50 74 Q84 74 84 100 Z', fill: c.top },
      // hood behind the neck
      { type: 'path', d: 'M34 76 Q50 66 66 76 Q50 84 34 76 Z', fill: c.top, opacity: 0.75 },
      { type: 'line', x1: 50, y1: 78, x2: 50, y2: 92, stroke: '#FFFFFF', strokeWidth: 1.6, opacity: 0.7 },
    ],
  },
  {
    id: 'polo', name: 'Polo', cost: 40,
    shapes: (c: any) => [
      { type: 'path', d: 'M16 100 Q16 74 50 74 Q84 74 84 100 Z', fill: c.top },
      { type: 'path', d: 'M44 74 L50 82 L56 74 Z', fill: '#FFFFFF', opacity: 0.9 },
    ],
  },
  {
    id: 'uniform', name: 'School Uniform', cost: 0,
    shapes: (c: any) => [
      { type: 'path', d: 'M16 100 Q16 74 50 74 Q84 74 84 100 Z', fill: '#F8FAFC' },
      { type: 'path', d: 'M44 74 L50 84 L56 74 Z', fill: c.top },
      { type: 'rect', x: 46, y: 84, width: 8, height: 16, fill: c.top, opacity: 0.9 },
    ],
  },
  {
    id: 'hero', name: 'Hero Suit', cost: 100,
    shapes: (c: any) => [
      { type: 'path', d: 'M16 100 Q16 74 50 74 Q84 74 84 100 Z', fill: c.top },
      { type: 'circle', cx: 50, cy: 90, r: 7, fill: c.accent, opacity: 0.95 },
    ],
  },
  {
    id: 'jersey', name: 'Sports Jersey', cost: 80,
    shapes: (c: any) => [
      { type: 'path', d: 'M16 100 Q16 74 50 74 Q84 74 84 100 Z', fill: c.top },
      { type: 'rect', x: 30, y: 74, width: 6, height: 26, fill: '#FFFFFF', opacity: 0.85 },
      { type: 'rect', x: 64, y: 74, width: 6, height: 26, fill: '#FFFFFF', opacity: 0.85 },
    ],
  },
]

// ── HATS ────────────────────────────────────────────────────────────────────
export const HATS = [
  { id: 'none', name: 'No Hat', cost: 0, default: true, shapes: () => [] },
  {
    // Sits ON the hairline: the dome covers the top of the head (y≈24–40) and a
    // brim juts right. Hats draw AFTER hair, so they must overlap it to read as
    // "worn" rather than floating above.
    id: 'cap', name: 'Baseball Cap', cost: 60,
    shapes: (c: any) => [
      { type: 'path', d: 'M28 40 Q28 20 50 20 Q72 20 72 40 Z', fill: c.hat },
      { type: 'rect', x: 27, y: 38, width: 46, height: 4, rx: 2, fill: c.hat },
      { type: 'path', d: 'M71 42 Q88 42 88 37 Q79 34 71 36 Z', fill: c.hat, opacity: 0.9 },
    ],
  },
  {
    id: 'beanie', name: 'Beanie', cost: 60,
    shapes: (c: any) => [
      { type: 'path', d: 'M28 40 Q28 18 50 18 Q72 18 72 40 Z', fill: c.hat },
      { type: 'rect', x: 27, y: 37, width: 46, height: 7, rx: 3.5, fill: c.hat, opacity: 0.8 },
      { type: 'circle', cx: 50, cy: 15, r: 4.5, fill: c.hat, opacity: 0.95 },
    ],
  },
  {
    // Mortarboard: a wide flat board that clearly sits on top of the hair, with
    // the cap base beneath it and a tassel hanging right.
    id: 'grad', name: 'Graduation Cap', cost: 150,
    shapes: (c: any) => [
      { type: 'path', d: 'M32 34 Q32 22 50 22 Q68 22 68 34 Z', fill: '#111827' },
      { type: 'path', d: 'M24 32 L50 22 L76 32 L50 42 Z', fill: '#1F2937' },
      { type: 'line', x1: 72, y1: 30, x2: 77, y2: 44, stroke: c.accent, strokeWidth: 2 },
      { type: 'circle', cx: 77, cy: 45, r: 3, fill: c.accent },
    ],
  },
  {
    id: 'crown', name: 'Crown', cost: 200,
    shapes: () => [
      { type: 'path', d: 'M32 32 L36 18 L43 27 L50 14 L57 27 L64 18 L68 32 Z', fill: '#FBBF24' },
      { type: 'rect', x: 31, y: 30, width: 38, height: 6, rx: 2, fill: '#D97706' },
    ],
  },
  {
    // Brim first (behind), then the crown of the hat on top of it.
    id: 'bucket', name: 'Bucket Hat', cost: 80,
    shapes: (c: any) => [
      { type: 'ellipse', cx: 50, cy: 40, rx: 27, ry: 6, fill: c.hat, opacity: 0.9 },
      { type: 'path', d: 'M32 40 Q32 20 50 20 Q68 20 68 40 Z', fill: c.hat },
    ],
  },
]

// ── GLASSES ─────────────────────────────────────────────────────────────────
export const GLASSES = [
  { id: 'none', name: 'None', cost: 0, default: true, shapes: () => [] },
  {
    id: 'round', name: 'Round', cost: 50,
    shapes: () => [
      { type: 'circle', cx: 42, cy: 46, r: 6, fill: 'none', stroke: INK, strokeWidth: 1.8 },
      { type: 'circle', cx: 58, cy: 46, r: 6, fill: 'none', stroke: INK, strokeWidth: 1.8 },
      { type: 'line', x1: 48, y1: 46, x2: 52, y2: 46, stroke: INK, strokeWidth: 1.8 },
    ],
  },
  {
    id: 'square', name: 'Square', cost: 50,
    shapes: () => [
      { type: 'rect', x: 35.5, y: 41, width: 13, height: 10, rx: 2, fill: 'none', stroke: INK, strokeWidth: 1.8 },
      { type: 'rect', x: 51.5, y: 41, width: 13, height: 10, rx: 2, fill: 'none', stroke: INK, strokeWidth: 1.8 },
      { type: 'line', x1: 48.5, y1: 46, x2: 51.5, y2: 46, stroke: INK, strokeWidth: 1.8 },
    ],
  },
  {
    id: 'shades', name: 'Sunglasses', cost: 90,
    shapes: () => [
      { type: 'rect', x: 34, y: 41, width: 14, height: 10, rx: 3, fill: INK },
      { type: 'rect', x: 52, y: 41, width: 14, height: 10, rx: 3, fill: INK },
      { type: 'line', x1: 48, y1: 45, x2: 52, y2: 45, stroke: INK, strokeWidth: 2 },
    ],
  },
  {
    id: 'hero', name: 'Hero Visor', cost: 120,
    shapes: (c: any) => [
      { type: 'path', d: 'M30 44 Q50 38 70 44 Q50 52 30 44 Z', fill: c.accent, opacity: 0.9 },
    ],
  },
]

// ── ACCESSORY (neck/chest) ──────────────────────────────────────────────────
export const ACCESSORIES = [
  { id: 'none', name: 'None', cost: 0, default: true, shapes: () => [] },
  {
    id: 'cape', name: 'Cape', cost: 80,
    shapes: (c: any) => [
      { type: 'path', d: 'M22 100 Q14 82 24 72 L34 78 Q28 88 30 100 Z', fill: c.accent },
      { type: 'path', d: 'M78 100 Q86 82 76 72 L66 78 Q72 88 70 100 Z', fill: c.accent },
    ],
  },
  {
    id: 'scarf', name: 'Scarf', cost: 60,
    shapes: (c: any) => [
      { type: 'rect', x: 38, y: 70, width: 24, height: 6, rx: 3, fill: c.accent },
      { type: 'rect', x: 56, y: 74, width: 6, height: 14, rx: 3, fill: c.accent, opacity: 0.9 },
    ],
  },
  {
    id: 'medal', name: 'Gold Medal', cost: 120,
    shapes: () => [
      { type: 'line', x1: 44, y1: 74, x2: 50, y2: 86, stroke: '#DC2626', strokeWidth: 2 },
      { type: 'line', x1: 56, y1: 74, x2: 50, y2: 86, stroke: '#DC2626', strokeWidth: 2 },
      { type: 'circle', cx: 50, cy: 90, r: 5.5, fill: '#FBBF24', stroke: '#D97706', strokeWidth: 1.2 },
    ],
  },
  {
    id: 'headphones', name: 'Headphones', cost: 100,
    shapes: (c: any) => [
      { type: 'path', d: 'M28 46 Q28 22 50 22 Q72 22 72 46', stroke: c.accent, strokeWidth: 3, fill: 'none' },
      { type: 'rect', x: 24, y: 44, width: 8, height: 12, rx: 3, fill: c.accent },
      { type: 'rect', x: 68, y: 44, width: 8, height: 12, rx: 3, fill: c.accent },
    ],
  },
]

// ── LAYER ORDER (bottom → top) ──────────────────────────────────────────────
// The order the renderer draws in. Body/skin are structural (not pickable).
export const LAYER_ORDER = [
  'background', 'body', 'accessoryBack', 'top', 'head', 'brows', 'eyes',
  'mouth', 'hair', 'glasses', 'hat', 'accessory',
]

// Pickable categories, in the order the editor shows them.
export const CATEGORIES = [
  { id: 'skinTone',   label: 'Skin',       emoji: '🎨', type: 'color', options: SKIN_TONES },
  { id: 'hair',       label: 'Hair',       emoji: '💇', type: 'part',  options: HAIR, colorKey: 'hairColor', colors: HAIR_COLORS },
  { id: 'eyes',       label: 'Eyes',       emoji: '👀', type: 'part',  options: EYES },
  { id: 'brows',      label: 'Eyebrows',   emoji: '🤨', type: 'part',  options: BROWS },
  { id: 'mouth',      label: 'Mouth',      emoji: '👄', type: 'part',  options: MOUTH },
  { id: 'top',        label: 'Tops',       emoji: '👕', type: 'part',  options: TOPS, colorKey: 'topColor', colors: CLOTHING_COLORS },
  { id: 'hat',        label: 'Hats',       emoji: '🧢', type: 'part',  options: HATS, colorKey: 'hatColor', colors: CLOTHING_COLORS },
  { id: 'glasses',    label: 'Glasses',    emoji: '🕶️', type: 'part',  options: GLASSES },
  { id: 'accessory',  label: 'Accessories', emoji: '⭐', type: 'part', options: ACCESSORIES, colorKey: 'accentColor', colors: CLOTHING_COLORS },
  { id: 'background', label: 'Background', emoji: '🌈', type: 'part',  options: BACKGROUNDS },
]

const REGISTRY: Record<string, any[]> = {
  hair: HAIR, eyes: EYES, brows: BROWS, mouth: MOUTH, top: TOPS,
  hat: HATS, glasses: GLASSES, accessory: ACCESSORIES, background: BACKGROUNDS,
}

export function partsFor(category: string) { return REGISTRY[category] || [] }

export function findPart(category: string, id: any) {
  const list = REGISTRY[category]
  if (!list) return null
  return list.find((p: any) => p.id === id) || list.find((p: any) => p.default) || list[0] || null
}

// The avatar every new student starts with.
export const DEFAULT_CONFIG: Record<string, string> = {
  skinTone: '#F5C9A6',
  hairColor: '#3B2A1A',
  topColor: '#1E3A8A',
  hatColor: '#DC2626',
  accentColor: '#C49A1A',
  hair: 'short',
  eyes: 'dot',
  brows: 'normal',
  mouth: 'smile',
  top: 'tee',
  hat: 'none',
  glasses: 'none',
  accessory: 'none',
  background: 'sky',
}

// Coerce any stored value into a safe, complete config. Unknown ids fall back to
// that category's default, so a retired item can never break a student's avatar.
export function normaliseConfig(raw: any): any {
  const cfg = { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) }
  for (const cat of Object.keys(REGISTRY)) {
    const part = findPart(cat, cfg[cat])
    cfg[cat] = part ? part.id : DEFAULT_CONFIG[cat]
  }
  const isColor = (v: any) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
  for (const k of ['skinTone', 'hairColor', 'topColor', 'hatColor', 'accentColor']) {
    if (!isColor(cfg[k])) cfg[k] = DEFAULT_CONFIG[k]
  }
  return cfg
}

// The colour bag handed to every part's shapes() fn.
export function colorsFrom(cfg: any) {
  return {
    skin: cfg.skinTone, hair: cfg.hairColor, top: cfg.topColor,
    hat: cfg.hatColor, accent: cfg.accentColor,
  }
}

// Build the full ordered shape list for a config — the renderers just draw this.
// Returns { background: {grad}, shapes: [...] }.
export function buildAvatar(rawConfig: any): any {
  const cfg = normaliseConfig(rawConfig)
  const c = colorsFrom(cfg)
  const bg = findPart('background', cfg.background)
  const shapes: any[] = []

  const push = (part: any) => { if (part?.shapes) shapes.push(...part.shapes(c)) }

  // accessory drawn BEHIND the body (capes) then again in front (medals) —
  // parts opt in by id; simplest split: cape goes behind.
  const acc = findPart('accessory', cfg.accessory)
  if (acc?.id === 'cape') push(acc)

  push(findPart('top', cfg.top))
  // neck + head are structural
  shapes.push({ type: 'rect', x: 44, y: 62, width: 12, height: 12, rx: 4, fill: c.skin })
  shapes.push({ type: 'circle', cx: 50, cy: 46, r: 22, fill: c.skin })

  push(findPart('brows', cfg.brows))
  push(findPart('eyes', cfg.eyes))
  push(findPart('mouth', cfg.mouth))
  push(findPart('hair', cfg.hair))
  push(findPart('glasses', cfg.glasses))
  push(findPart('hat', cfg.hat))
  if (acc && acc.id !== 'cape') push(acc)

  return { background: bg, shapes, config: cfg }
}

// ── PRESETS → CONFIG ────────────────────────────────────────────────────────
// The 12 legacy characters become one-tap STARTING POINTS: tapping one loads a
// full layer config the student can then customise. Existing students keep their
// look and gain the editor (see presetToConfig in the migration path).
export const PRESETS = [
  { id: 'hero',      name: 'Captain Hero', config: { skinTone: '#F5C9A6', hairColor: '#3B2A1A', topColor: '#1E3A8A', accentColor: '#FBBF24', hair: 'short', top: 'hero', accessory: 'cape', background: 'sky' } },
  { id: 'ninja',     name: 'Shadow Ninja', config: { skinTone: '#E8B98F', hairColor: '#111827', topColor: '#1F2937', accentColor: '#EF4444', hair: 'buzz', top: 'tee', glasses: 'shades', background: 'space' } },
  { id: 'astronaut', name: 'Star Explorer', config: { skinTone: '#F5C9A6', hairColor: '#3B2A1A', topColor: '#F8FAFC', accentColor: '#38BDF8', hair: 'short', top: 'jersey', glasses: 'hero', background: 'space' } },
  { id: 'gamer',     name: 'Pixel Pro', config: { skinTone: '#E8B98F', hairColor: '#1F2937', topColor: '#7C3AED', accentColor: '#22D3EE', hair: 'spiky', top: 'hoodie', accessory: 'headphones', background: 'grape' } },
  { id: 'scientist', name: 'Lab Genius', config: { skinTone: '#D9A066', hairColor: '#111827', topColor: '#F8FAFC', accentColor: '#1D4ED8', hair: 'curly', top: 'polo', glasses: 'round', background: 'mint' } },
  { id: 'athlete',   name: 'Track Star', config: { skinTone: '#A9714B', hairColor: '#1B1B1B', topColor: '#16A34A', accentColor: '#FBBF24', hair: 'bun', top: 'jersey', accessory: 'medal', background: 'mint' } },
  { id: 'artist',    name: 'Colour Wizard', config: { skinTone: '#FCE0C8', hairColor: '#EC4899', topColor: '#EC4899', accentColor: '#7C3AED', hair: 'wavy', top: 'tee', background: 'grape' } },
  { id: 'scholar',   name: 'Top Scholar', config: { skinTone: '#6B4432', hairColor: '#1B1B1B', topColor: '#1E3A8A', accentColor: '#C49A1A', hair: 'short', top: 'uniform', hat: 'grad', background: 'gold' } },
  { id: 'royal',     name: 'Maths Monarch', config: { skinTone: '#F5C9A6', hairColor: '#E3B961', topColor: '#7C3AED', accentColor: '#FBBF24', hair: 'long', top: 'hero', hat: 'crown', background: 'gold' } },
  { id: 'diver',     name: 'Deep Diver', config: { skinTone: '#E8B98F', hairColor: '#2563EB', topColor: '#0D9488', accentColor: '#67E8F9', hair: 'wavy', top: 'jersey', background: 'ocean' } },
  { id: 'skater',    name: 'Skate Legend', config: { skinTone: '#D9A066', hairColor: '#C2571F', topColor: '#DC2626', accentColor: '#1F2937', hair: 'curly', top: 'hoodie', hat: 'cap', background: 'sunset' } },
  { id: 'chill',     name: 'Cool Cat', config: { skinTone: '#A9714B', hairColor: '#9AA3AF', topColor: '#2563EB', accentColor: '#C49A1A', hair: 'ponytail', top: 'polo', glasses: 'shades', hat: 'bucket', background: 'sunset' } },
]

// Legacy `avatar` string (a preset id, or an emoji from the oldest system) →
// a full layer config. Unknown/emoji values fall back to the default look.
export function presetToConfig(presetId: any) {
  const p = PRESETS.find((x: any) => x.id === presetId)
  return normaliseConfig(p ? p.config : DEFAULT_CONFIG)
}
