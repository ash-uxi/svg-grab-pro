const COLOR_RE =
  /(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|white|black)/gi;

/**
 * @param {string} color
 * @returns {number | null} relative luminance 0–1, or null when transparent/unparseable
 */
function luminance(color) {
  let rgb;
  const value = color.toLowerCase();
  if (value === 'white') rgb = [255, 255, 255];
  else if (value === 'black') rgb = [0, 0, 0];
  else if (value.startsWith('#')) {
    const hex =
      value.length <= 5 ? [...value.slice(1, 4)].map((c) => c + c).join('') : value.slice(1, 7);
    if (value.length === 5 || value.length === 9) {
      const alpha = parseInt(value.length === 5 ? value[4] + value[4] : value.slice(7, 9), 16);
      if (alpha < 32) return null;
    }
    rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  } else {
    const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
    if (parts.length < 3 || (parts.length > 3 && parts[3] < 0.125)) return null;
    rgb = parts.slice(0, 3);
  }
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Whether artwork is all-light, all-dark or mixed, so previews can pick a backdrop it shows on.
 * Unpainted SVGs default to black fill, so "no colors found" counts as dark.
 * @param {string} svgText
 * @returns {'light' | 'dark' | 'mixed'}
 */
export function artworkTone(svgText) {
  const values = [...svgText.matchAll(COLOR_RE)]
    .map((match) => luminance(match[1]))
    .filter((value) => value !== null);
  if (values.length === 0) return 'dark';
  if (values.every((value) => value > 0.7)) return 'light';
  if (values.every((value) => value < 0.06)) return 'dark';
  return 'mixed';
}
