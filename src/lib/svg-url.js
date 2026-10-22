const CSS_URL_RE = /url\(\s*(['"]?)((?:\\.|.)*?)\1\s*\)/g;

/**
 * True when a URL points at an SVG: a data URI, a `.svg` path, or a CDN-style `format=svg` query.
 * @param {string | null | undefined} url
 */
export function isSvgUrl(url) {
  if (!url) return false;
  if (/^data:image\/svg\+xml[;,]/i.test(url)) return true;
  try {
    const { pathname, search } = new URL(url, 'https://base.invalid/');
    return /\.svg$/i.test(pathname) || /[?&](format|fm|type|ext)=svg(&|$)/i.test(search);
  } catch {
    return false;
  }
}

/**
 * Pull every `url(...)` out of a computed CSS value such as `background-image`.
 * @param {string | null | undefined} value
 * @returns {string[]}
 */
export function extractCssUrls(value) {
  if (!value || value === 'none') return [];
  // Computed values escape quotes inside url("…") — common in data URIs.
  return [...value.matchAll(CSS_URL_RE)]
    .map((match) => match[2].replace(/\\(.)/g, '$1'))
    .filter(Boolean);
}

/**
 * Decode a `data:image/svg+xml` URI. Returns null for anything else.
 * @param {string} url
 */
export function decodeSvgDataUrl(url) {
  const match = /^data:image\/svg\+xml([^,]*),(.*)$/is.exec(url);
  if (!match) return null;
  const [, params, payload] = match;
  try {
    if (/;base64/i.test(params)) {
      const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/**
 * @param {string} svgText
 */
export function svgToDataUrl(svgText) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}
