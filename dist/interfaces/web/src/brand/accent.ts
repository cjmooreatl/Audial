// Brand-safe accent palette and validation. Audial owners can pick their own
// accent for their channel; the palette is a curated risograph-coded set.

export interface AccentSwatch {
  hex: string;
  name: string;
}

export const ACCENT_SWATCHES: AccentSwatch[] = [
  { hex: '#7A1F1F', name: 'oxblood' },
  { hex: '#1E3A8A', name: 'cobalt' },
  { hex: '#C29B0C', name: 'sulfur' },
  { hex: '#E07A2A', name: 'tangerine' },
  { hex: '#0F6B4F', name: 'jade' },
  { hex: '#2A2A26', name: 'charcoal' },
  { hex: '#B8849C', name: 'dusty rose' },
  { hex: '#6E4DCF', name: 'iris' },
  { hex: '#8DA635', name: 'moss' },
  { hex: '#1F3A36', name: 'pine' },
  { hex: '#A8480F', name: 'rust' },
  { hex: '#0E5A6E', name: 'teal' },
  { hex: '#915C2D', name: 'umber' },
  { hex: '#3F1F5C', name: 'blackcurrant' },
  { hex: '#9C2641', name: 'amaranth' },
  { hex: '#3D5A1F', name: 'olive' },
  { hex: '#5C2D2D', name: 'bordeaux' },
  { hex: '#0E0E0E', name: 'near-black' },
];

// Approximate luminance (sRGB → relative luminance per WCAG)
function luminance(hex: string): number {
  const m = hex.replace('#', '').match(/^([a-f0-9]{6})$/i);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const adj = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * adj(r) + 0.7152 * adj(g) + 0.0722 * adj(b);
}

// Hue in degrees from sRGB hex (rough approximation)
function hue(hex: string): number {
  const m = hex.replace('#', '').match(/^([a-f0-9]{6})$/i);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = h * 60;
  return (h + 360) % 360;
}

const HEAT_HUE = hue('#FF3B2E');

export function validateAccent(hex: string): string | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return 'Out of range. Use a #RRGGBB hex.';
  }
  if (luminance(hex) > 0.7) {
    return 'Too light for the bone surface.';
  }
  const dh = Math.min(
    Math.abs(hue(hex) - HEAT_HUE),
    360 - Math.abs(hue(hex) - HEAT_HUE),
  );
  if (dh < 8) {
    return 'Too close to alert. Try another hue.';
  }
  return null;
}
