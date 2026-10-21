const SVG_NS = 'http://www.w3.org/2000/svg';
const EMBED_RE = /<svg[\s>][\s\S]*<\/svg\s*>/i;

/**
 * Remove anything executable or embedding from an SVG tree, in place.
 * @param {Element} root
 */
export function sanitizeSvg(root) {
  for (const el of root.querySelectorAll('script, iframe, object, embed, form')) el.remove();
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const { name, value } of [...el.attributes]) {
      // URL parsers ignore whitespace and control characters, so `java&#9;script:` still runs.
      const compact = value.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
      const isScriptUrl = /^(javascript|vbscript):/.test(compact);
      if (name.toLowerCase().startsWith('on') || isScriptUrl) el.removeAttribute(name);
    }
  }
  return root;
}

/**
 * Parse SVG markup (or an HTML/XML document wrapping one) into a sanitized `<svg>` root.
 * @param {string} text
 * @returns {SVGSVGElement | null}
 */
export function parseSvgText(text) {
  if (!text || typeof text !== 'string' || !/<svg[\s>]/i.test(text)) return null;
  const parser = new DOMParser();

  const embedded = EMBED_RE.exec(text)?.[0];
  // Markup lifted from HTML often lacks the namespace that XML parsing needs.
  const namespaced =
    embedded &&
    !/^<svg[^>]*\sxmlns=/i.test(embedded) &&
    embedded.replace(/^<svg/i, `<svg xmlns="${SVG_NS}"`);

  for (const candidate of [text, embedded, namespaced]) {
    if (!candidate) continue;
    const doc = parser.parseFromString(candidate, 'image/svg+xml');
    const root = doc.documentElement;
    if (
      !doc.querySelector('parsererror') &&
      root?.localName === 'svg' &&
      root.namespaceURI === SVG_NS
    ) {
      return /** @type {SVGSVGElement} */ (sanitizeSvg(root));
    }
  }
  return null;
}

/**
 * Validate and sanitize fetched SVG text, returning clean standalone markup.
 * @param {string} text
 * @returns {string | null}
 */
export function normalizeSvgText(text) {
  const root = parseSvgText(text);
  return root ? new XMLSerializer().serializeToString(root) : null;
}

/** @param {string | null} value */
function toPixels(value) {
  if (!value) return null;
  const match = /^\s*([\d.]+)\s*(px)?\s*$/i.exec(value);
  const number = match ? Number(match[1]) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * Intrinsic size of an SVG from its width/height attributes, falling back to the viewBox.
 * @param {string | Element} source SVG markup or an `<svg>` element
 * @returns {{ width: number; height: number } | null}
 */
export function getSvgSize(source) {
  const root = typeof source === 'string' ? parseSvgText(source) : source;
  if (!root) return null;

  const box = (root.getAttribute('viewBox') || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const hasBox = box.length === 4 && box[2] > 0 && box[3] > 0;
  let width = toPixels(root.getAttribute('width'));
  let height = toPixels(root.getAttribute('height'));

  if (hasBox) {
    const ratio = box[2] / box[3];
    if (width && !height) height = width / ratio;
    if (height && !width) width = height * ratio;
    if (!width && !height) [width, height] = [box[2], box[3]];
  }
  return width && height ? { width, height } : null;
}

/**
 * Paint every visible fill and stroke one color, as a CSS mask does with the element's background.
 * @param {string} text
 * @param {string} color
 * @returns {string | null}
 */
export function tintSvg(text, color) {
  const root = parseSvgText(text);
  if (!root) return null;
  const paints = ['fill', 'stroke', 'stop-color', 'flood-color'];
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const prop of paints) {
      const value = el.getAttribute(prop);
      if (value && value !== 'none' && !value.startsWith('url(')) el.setAttribute(prop, color);
    }
    const style = el.getAttribute('style');
    if (style) {
      el.setAttribute(
        'style',
        style.replace(/(^|;)\s*(fill|stroke|stop-color)\s*:\s*(?!none|url)[^;]+/g, `$1$2:${color}`)
      );
    }
  }
  if (!root.hasAttribute('fill')) root.setAttribute('fill', color);
  return new XMLSerializer().serializeToString(root);
}
