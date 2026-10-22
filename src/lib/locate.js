import { extractCssUrls, isSvgUrl } from './svg-url.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CSS_IMAGE_PROPS = [
  'background-image',
  'mask-image',
  '-webkit-mask-image',
  'content',
  'list-style-image',
];
const PSEUDOS = [null, '::before', '::after'];
const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'head',
  'link',
  'meta',
  'iframe',
]);

/**
 * @typedef {{ kind: 'inline'; element: SVGSVGElement }
 *   | { kind: 'url'; element: Element; url: string; tint?: string }} SvgTarget
 * `tint` is set for CSS masks, whose visible color is the element's background, not the file's.
 */

/** @param {Element} el */
function isSvgRoot(el) {
  return el.localName === 'svg' && el.namespaceURI === SVG_NS;
}

/**
 * The outermost `<svg>` containing `el` (nested `<svg>`s are part of their parent's artwork).
 * @param {Element} el
 * @returns {SVGSVGElement | null}
 */
export function outermostSvg(el) {
  let found = null;
  for (let node = /** @type {Element | null} */ (el); node; node = node.parentElement) {
    if (isSvgRoot(node)) found = node;
  }
  return /** @type {SVGSVGElement | null} */ (found);
}

/**
 * SVG URL loaded by an `<img>`, `<object>` or `<embed>` (respecting `srcset`/`<picture>`).
 * @param {Element} el
 */
export function svgUrlFromElement(el) {
  const name = el.localName;
  if (name === 'img') {
    const img = /** @type {HTMLImageElement} */ (el);
    const src = img.currentSrc || img.src;
    return isSvgUrl(src) ? src : null;
  }
  if (name === 'object') {
    const object = /** @type {HTMLObjectElement} */ (el);
    return object.data && (isSvgUrl(object.data) || object.type === 'image/svg+xml')
      ? object.data
      : null;
  }
  if (name === 'embed') {
    const embed = /** @type {HTMLEmbedElement} */ (el);
    return embed.src && (isSvgUrl(embed.src) || embed.type === 'image/svg+xml') ? embed.src : null;
  }
  return null;
}

/**
 * SVG painted by CSS on the element or its pseudo-elements (backgrounds, masks, `content`).
 * @param {Element} el
 * @returns {{ url: string; tint?: string } | null}
 */
export function svgFromCss(el) {
  const view = el.ownerDocument.defaultView;
  if (!view) return null;
  for (const pseudo of PSEUDOS) {
    const style = view.getComputedStyle(el, pseudo);
    for (const prop of CSS_IMAGE_PROPS) {
      const url = extractCssUrls(style.getPropertyValue(prop)).find(isSvgUrl);
      if (!url) continue;
      const background = style.getPropertyValue('background-color');
      const isMask = prop.endsWith('mask-image');
      const tint = isMask && background && !/^(transparent|rgba\(.*,\s*0\))$/.test(background);
      return tint ? { url, tint: background } : { url };
    }
  }
  return null;
}

/**
 * @param {Element} el
 * @returns {SvgTarget | null}
 */
export function targetFromElement(el) {
  const svg = outermostSvg(el);
  if (svg) return { kind: 'inline', element: svg };
  const url = svgUrlFromElement(el);
  if (url) return { kind: 'url', element: el, url };
  const css = svgFromCss(el);
  return css ? { kind: 'url', element: el, ...css } : null;
}

/**
 * `elementsFromPoint`, descending into open shadow roots.
 * @param {Document | ShadowRoot} root
 * @param {number} x
 * @param {number} y
 * @returns {Element[]}
 */
function deepElementsFromPoint(root, x, y, depth = 0) {
  /** @type {Set<Element>} */
  const out = new Set();
  for (const el of root.elementsFromPoint?.(x, y) ?? []) {
    if (el.shadowRoot && el.shadowRoot !== root && depth < 4) {
      for (const inner of deepElementsFromPoint(el.shadowRoot, x, y, depth + 1)) out.add(inner);
    }
    out.add(el);
  }
  return [...out];
}

/**
 * Find the SVG the user right-clicked: the target itself, a small wrapper painting one via CSS,
 * or an SVG covered by a transparent overlay (stretched links, hover layers).
 * @param {{ path: EventTarget[]; x: number; y: number; doc: Document }} input
 * @returns {SvgTarget | null}
 */
export function findTargetAtPoint({ path, x, y, doc }) {
  const view = doc.defaultView;
  if (!view) return null;
  const elements = /** @type {Element[]} */ (
    path.filter((node) => /** @type {Node} */ (node).nodeType === 1)
  );
  const target = elements[0];
  if (!target) return null;

  // Big containers (hero sections, page wrappers) shouldn't swallow the browser menu.
  const maxArea = view.innerWidth * view.innerHeight * 0.25;
  const isSmall = (/** @type {Element} */ el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.width * rect.height <= maxArea;
  };

  // Inline SVGs and SVG images are grabbed at any size; CSS backgrounds only on small elements.
  const direct = targetFromElement(target);
  const isCssPainted = direct?.kind === 'url' && !svgUrlFromElement(target);
  if (direct && (!isCssPainted || isSmall(target))) return direct;

  const checked = new Set([target]);
  const candidates = [...elements.slice(1, 4), ...deepElementsFromPoint(doc, x, y).slice(0, 12)];
  for (const el of candidates) {
    if (checked.has(el) || el === doc.documentElement || el === doc.body) continue;
    checked.add(el);
    if (!isSmall(el)) continue;
    const found = targetFromElement(el);
    if (found) return found;
  }
  return null;
}

/** @param {Element} el */
function isRendered(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  return el.ownerDocument.defaultView?.getComputedStyle(el).visibility !== 'hidden';
}

/**
 * Every SVG on the page: inline `<svg>`, SVG images/objects, and CSS-painted SVGs,
 * including inside open shadow roots. URL targets are deduplicated by URL.
 * @param {Document} doc
 * @param {{ limit?: number; cssBudget?: number }} [options]
 * @returns {SvgTarget[]}
 */
export function collectPageTargets(doc, { limit = 300, cssBudget = 6000 } = {}) {
  /** @type {SvgTarget[]} */
  const targets = [];
  const seenUrls = new Set();
  let cssChecks = 0;

  /** @param {SvgTarget} target */
  const add = (target) => {
    if (target.kind === 'url') {
      if (seenUrls.has(target.url)) return;
      seenUrls.add(target.url);
    }
    targets.push(target);
  };

  /** @param {ParentNode} parent */
  const walk = (parent) => {
    for (const el of parent.children) {
      if (targets.length >= limit) return;
      if (SKIP_TAGS.has(el.localName)) continue;
      if (isSvgRoot(el)) {
        if (isRendered(el)) add({ kind: 'inline', element: /** @type {SVGSVGElement} */ (el) });
        continue;
      }
      const url = svgUrlFromElement(el);
      const css = !url && cssChecks++ < cssBudget ? svgFromCss(el) : null;
      if ((url || css) && isRendered(el)) {
        add(url ? { kind: 'url', element: el, url } : { kind: 'url', element: el, ...css });
      }
      if (el.shadowRoot) walk(el.shadowRoot);
      walk(el);
    }
  };

  walk(doc.body ?? doc.documentElement);
  return targets;
}
