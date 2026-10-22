import { parseSvgText, sanitizeSvg } from './parse-svg.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Presentation properties baked from computed style into attributes, so CSS classes,
 * custom properties and `currentColor` survive outside the page. [property, initial, inherited]
 * @type {[string, string, boolean][]}
 */
const PAINT_PROPS = [
  ['color', 'rgb(0, 0, 0)', true],
  ['fill', 'rgb(0, 0, 0)', true],
  ['fill-opacity', '1', true],
  ['fill-rule', 'nonzero', true],
  ['stroke', 'none', true],
  ['stroke-width', '1', true],
  ['stroke-opacity', '1', true],
  ['stroke-linecap', 'butt', true],
  ['stroke-linejoin', 'miter', true],
  ['stroke-miterlimit', '4', true],
  ['stroke-dasharray', 'none', true],
  ['stroke-dashoffset', '0', true],
  ['clip-rule', 'nonzero', true],
  ['paint-order', 'normal', true],
  ['visibility', 'visible', true],
  ['opacity', '1', false],
  ['clip-path', 'none', false],
  ['mask', 'none', false],
  ['filter', 'none', false],
  ['vector-effect', 'none', false],
];
/** @type {[string, string, boolean][]} */
const STOP_PROPS = [
  ['stop-color', 'rgb(0, 0, 0)', false],
  ['stop-opacity', '1', false],
];
/** @type {[string, string, boolean][]} */
const FLOOD_PROPS = [
  ['flood-color', 'rgb(0, 0, 0)', false],
  ['flood-opacity', '1', false],
];
const BAKED_PROPS = new Set([...PAINT_PROPS, ...STOP_PROPS, ...FLOOD_PROPS].map(([prop]) => prop));
const TEXT_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
];

/** Containers whose children only render when referenced. */
const DEFS_SELECTOR =
  'defs,symbol,clipPath,mask,pattern,marker,linearGradient,radialGradient,filter';
/** Elements that never take paint properties. */
const NO_PAINT = new Set([
  'title',
  'desc',
  'metadata',
  'style',
  'linearGradient',
  'radialGradient',
  'filter',
]);
const NOISE_ATTR_RE = /^(data-|aria-|ng-|_ng|on|js)/i;
const NOISE_ATTRS = new Set(['role', 'focusable', 'tabindex', 'part', 'slot']);
const URL_REF_RE = /url\(\s*['"]?#([^'")\s]+)/g;
const LENGTH_PROPS = new Set(['stroke-width', 'stroke-dashoffset', 'stroke-dasharray']);
const TRANSFORM_PROPS = ['transform', 'transform-origin', 'transform-box'];
const TEXT_ELEMENTS = new Set(['text', 'tspan', 'textPath']);

/**
 * Normalize a computed value: hex colors, unitless stroke lengths, bare `url(#id)` fragments.
 * @param {string} prop
 * @param {string} value
 */
export function normalizeValue(prop, value) {
  let out = value
    .trim()
    .replace(/url\(\s*(['"]?)[^'")]*?#([^'")]+)\1\s*\)/g, 'url(#$2)')
    .replace(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/g, (match, r, g, b, a) => {
      if (a !== undefined && Number(a) === 0) return 'transparent';
      if (a !== undefined && Number(a) < 1) return match;
      return '#' + [r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
    });
  if (LENGTH_PROPS.has(prop)) out = out.replace(/(\d)px\b/g, '$1');
  if (prop === 'stroke-dasharray') out = out.replace(/,\s*/g, ' ');
  if ((prop === 'fill' || prop === 'stroke') && out === 'transparent') out = 'none';
  return out;
}

/** @param {Element} el */
function propsFor(el) {
  if (el.localName === 'stop') return STOP_PROPS;
  if (el.localName === 'feFlood' || el.localName === 'feDropShadow') return FLOOD_PROPS;
  if (NO_PAINT.has(el.localName) || el.localName.startsWith('fe')) return [];
  return PAINT_PROPS;
}

/**
 * @typedef {object} BakeContext
 * @property {(el: Element) => CSSStyleDeclaration} computed
 * @property {boolean} inDefs  inside a defs-like container, where inheritance comes from `<use>`
 * @property {boolean} isRoot
 * @property {boolean} asStyle  write inline styles, which beat the SVG's own `<style>` rules
 */

/**
 * A CSS transform as an SVG transform attribute, folding in transform-origin.
 * @param {Element} src
 * @param {CSSStyleDeclaration} style
 */
function cssTransformToAttribute(src, style) {
  const match = /^matrix\(([^)]+)\)$/.exec(style.getPropertyValue('transform'));
  if (!match) return null;
  const values = match[1].split(',').map((n) => Number(n.trim()));
  let [x = 0, y = 0] = style.getPropertyValue('transform-origin').split(' ').map(parseFloat);
  if (style.getPropertyValue('transform-box') === 'fill-box') {
    try {
      const box = /** @type {SVGGraphicsElement} */ (src).getBBox();
      x += box.x;
      y += box.y;
    } catch {
      // No geometry (not rendered); use the origin as is.
    }
  }
  const matrix = `matrix(${values.join(' ')})`;
  return x || y ? `translate(${x} ${y}) ${matrix} translate(${-x} ${-y})` : matrix;
}

/**
 * Write computed presentation properties onto the clone, emitting only values that differ
 * from what the element inherits, so output stays roughly as small as the source.
 * @param {Element} src live element
 * @param {Element} dst its clone
 * @param {BakeContext} ctx
 */
function bakeStyles(src, dst, ctx) {
  const style = ctx.computed(src);
  const parentStyle = !ctx.isRoot && src.parentElement ? ctx.computed(src.parentElement) : null;
  const inline = /** @type {SVGElement} */ (dst).style;

  // Inline declarations are re-emitted from computed style; `var(--x)` would dangle off-page.
  /** @type {Set<string>} */
  const declared = new Set();
  if (ctx.isRoot) {
    dst.removeAttribute('style');
  } else if (inline) {
    for (const name of Array.from({ length: inline.length }, (_, i) => inline.item(i))) {
      if (BAKED_PROPS.has(name) || inline.getPropertyValue(name).includes('var(')) {
        declared.add(name);
        inline.removeProperty(name);
      }
    }
  }

  const write = (/** @type {string} */ prop, /** @type {string} */ value) => {
    if (ctx.asStyle && inline) inline.setProperty(prop, value);
    else dst.setAttribute(prop, value);
  };
  // Classed elements may match the SVG's own stylesheet, so state everything non-default.
  const classed = ctx.asStyle && src.hasAttribute('class');

  for (const [prop, initial, inherited] of propsFor(src)) {
    const raw = style.getPropertyValue(prop);
    if (!raw) continue;
    const value = normalizeValue(prop, raw);
    const initialValue = normalizeValue(prop, initial);
    const parentRaw = inherited && parentStyle ? parentStyle.getPropertyValue(prop) : '';
    const reference = parentRaw ? normalizeValue(prop, parentRaw) : initialValue;

    if (
      value !== reference ||
      declared.has(prop) ||
      (classed && value !== initialValue) ||
      // Outside defs, also overwrite authored attributes that CSS overrides on the page.
      (!ctx.inDefs && dst.hasAttribute(prop))
    ) {
      write(prop, value);
    }
  }

  if (TEXT_ELEMENTS.has(src.localName)) {
    for (const prop of TEXT_PROPS) {
      const raw = style.getPropertyValue(prop).trim();
      const differs =
        src.localName === 'text'
          ? raw !== 'normal' && raw !== 'auto'
          : raw !== parentStyle?.getPropertyValue(prop).trim();
      if (raw && differs) write(prop, raw);
    }
  }

  // CSS transforms (from classes or inline styles) become a transform attribute.
  if (!ctx.isRoot && !dst.hasAttribute('transform')) {
    const transform = cssTransformToAttribute(src, style);
    if (transform) {
      dst.setAttribute('transform', transform);
      for (const prop of TRANSFORM_PROPS) inline?.removeProperty(prop);
    }
  }

  if (inline && inline.length === 0) dst.removeAttribute('style');
}

/**
 * @param {Element} el
 * @param {boolean} keepClasses
 */
function stripNoise(el, keepClasses) {
  for (const { name } of [...el.attributes]) {
    if (NOISE_ATTR_RE.test(name) || NOISE_ATTRS.has(name) || (name === 'class' && !keepClasses)) {
      el.removeAttribute(name);
    }
  }
}

/** @param {Element} el */
function getHref(el) {
  return el.getAttribute('href') ?? el.getAttributeNS(XLINK_NS, 'href');
}

/**
 * @param {Element} el
 * @param {string} value
 */
function setHref(el, value) {
  if (el.hasAttributeNS(XLINK_NS, 'href')) el.setAttributeNS(XLINK_NS, 'xlink:href', value);
  else el.setAttribute('href', value);
}

/**
 * @param {ParentNode} root
 * @param {string} id
 */
function findById(root, id) {
  return [...root.querySelectorAll('[id]')].find((el) => el.id === id) || null;
}

/** @param {Element} root */
function collectReferencedIds(root) {
  const ids = new Set();
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const { name, value } of el.attributes) {
      // `<a href="#…">` is a page link, not a resource reference.
      const isRef = (name === 'href' || name === 'xlink:href') && el.localName !== 'a';
      if (isRef && value.startsWith('#')) ids.add(value.slice(1));
      for (const match of value.matchAll(URL_REF_RE)) ids.add(match[1]);
    }
    if (el.localName === 'style') {
      for (const match of (el.textContent || '').matchAll(URL_REF_RE)) ids.add(match[1]);
    }
  }
  return [...ids].map((id) => {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  });
}

/** @param {Element} clone */
function ensureDefs(clone) {
  let defs = [...clone.children].find((child) => child.localName === 'defs');
  if (!defs) {
    defs = clone.ownerDocument.createElementNS(SVG_NS, 'defs');
    clone.insertBefore(defs, clone.firstChild);
  }
  return defs;
}

/**
 * Copy elements referenced by `#id` (gradients, symbols, clips) into the clone's `<defs>`
 * until every reference resolves.
 * @param {Element} clone
 * @param {(id: string) => Element | null} lookup
 * @param {(el: Element) => Node} copy
 */
function pullInReferences(clone, lookup, copy) {
  for (let pass = 0; pass < 8; pass++) {
    const found = collectReferencedIds(clone)
      .filter((id) => clone.id !== id && !findById(clone, id))
      .map(lookup)
      .filter((el) => el !== null);
    if (found.length === 0) return;
    const defs = ensureDefs(clone);
    for (const el of found) defs.appendChild(copy(/** @type {Element} */ (el)));
  }
}

/**
 * Clone `src`, baking computed styles into every element of the clone.
 * @param {Element} src
 * @param {{ keepClasses: boolean; inDefs: boolean; isRoot: boolean; computed: (el: Element) => CSSStyleDeclaration }} options
 */
function cloneWithStyles(src, { keepClasses, inDefs, isRoot, computed }) {
  const clone = /** @type {Element} */ (src.cloneNode(true));
  const sources = [src, ...src.querySelectorAll('*')];
  const clones = [clone, ...clone.querySelectorAll('*')];
  /** @type {Element[]} */
  const hidden = [];

  sources.forEach((source, index) => {
    const target = clones[index];
    const elementInDefs = inDefs || !!source.closest(DEFS_SELECTOR);
    bakeStyles(source, target, {
      computed,
      inDefs: elementInDefs,
      isRoot: isRoot && index === 0,
      asStyle: keepClasses,
    });
    stripNoise(target, keepClasses);

    // Hidden subtrees with ids may be `<use>` templates; only anonymous ones are dropped.
    const mayBeReferenced = !!source.id || !!source.querySelector('[id]');
    if (index > 0 && !elementInDefs && !mayBeReferenced && computed(source).display === 'none') {
      hidden.push(target);
    }

    const href = (source.localName === 'image' || source.localName === 'a') && getHref(source);
    if (href && !href.startsWith('#') && !href.startsWith('data:')) {
      try {
        setHref(target, new URL(href, source.baseURI).href);
      } catch {
        // Leave unparseable hrefs as authored.
      }
    }
  });

  for (const el of hidden) el.remove();
  return clone;
}

/** @param {Node} root */
function removeComments(root) {
  const walker = /** @type {Document} */ (root.ownerDocument).createTreeWalker(root, 128); // SHOW_COMMENT
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const comment of comments) comment.parentNode?.removeChild(comment);
}

/** @param {number} n */
function round(n) {
  return Math.round(n * 100) / 100;
}

/** @param {string | null} value */
function isAbsoluteLength(value) {
  return !!value && /^\s*[\d.]+\s*(px)?\s*$/i.test(value);
}

/**
 * Give the root an explicit viewBox and pixel size so it renders the same standalone.
 * @param {Element} src
 * @param {Element} dst
 */
function applyRootGeometry(src, dst) {
  const rect = src.getBoundingClientRect();
  const renderedWidth = round(rect.width);
  const renderedHeight = round(rect.height);
  const hasRendered = renderedWidth > 0 && renderedHeight > 0;
  const width = src.getAttribute('width');
  const height = src.getAttribute('height');
  const hasSize = isAbsoluteLength(width) && isAbsoluteLength(height);

  if (!dst.hasAttribute('viewBox')) {
    if (hasSize) dst.setAttribute('viewBox', `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
    else if (hasRendered) dst.setAttribute('viewBox', `0 0 ${renderedWidth} ${renderedHeight}`);
  }
  if (!hasSize && hasRendered) {
    dst.setAttribute('width', String(renderedWidth));
    dst.setAttribute('height', String(renderedHeight));
  }
  dst.removeAttribute('x');
  dst.removeAttribute('y');
}

/**
 * Pull in `<use href="sprite.svg#id">` targets (and what they reference) from external files.
 * @param {Element} clone
 * @param {(url: string) => Promise<string | null>} loadExternal
 */
async function inlineExternalUses(clone, loadExternal) {
  /** @type {Map<string, { use: Element; id: string }[]>} */
  const byFile = new Map();
  for (const use of clone.querySelectorAll('use')) {
    const href = getHref(use);
    if (!href || href.startsWith('#') || !href.includes('#')) continue;
    try {
      const url = new URL(href, clone.ownerDocument.baseURI);
      const id = decodeURIComponent(url.hash.slice(1));
      url.hash = '';
      byFile.set(url.href, [...(byFile.get(url.href) || []), { use, id }]);
    } catch {
      // Unresolvable href; leave the <use> as authored.
    }
  }

  await Promise.all(
    [...byFile].map(async ([url, refs]) => {
      const sprite = parseSvgText((await loadExternal(url).catch(() => null)) || '');
      if (!sprite) return;
      for (const { use, id } of refs) setHref(use, `#${id}`);
      pullInReferences(
        clone,
        (id) => findById(sprite, id),
        (el) => clone.ownerDocument.importNode(el, true)
      );
    })
  );
}

/**
 * Serialize a live `<svg>` into standalone markup that renders the way it does on the page:
 * computed styles baked in, referenced gradients/symbols/clips pulled in, page noise removed.
 * @param {SVGSVGElement} svg
 * @param {{ loadExternal?: (url: string) => Promise<string | null> }} [options]
 * @returns {Promise<string>}
 */
export async function serializeSvgElement(svg, { loadExternal } = {}) {
  const view = svg.ownerDocument.defaultView;
  /** @type {Map<Element, CSSStyleDeclaration>} */
  const cache = new Map();
  const computed = (/** @type {Element} */ el) => {
    let style = cache.get(el);
    if (!style) {
      style = /** @type {Window} */ (view).getComputedStyle(el);
      cache.set(el, style);
    }
    return style;
  };
  const keepClasses = !!svg.querySelector('style');
  const clone = cloneWithStyles(svg, { keepClasses, inDefs: false, isRoot: true, computed });
  applyRootGeometry(svg, clone);

  // `#id` references can live outside this <svg>: shared sprites, gradient defs elsewhere on the page.
  const scope = /** @type {Document | ShadowRoot} */ (svg.getRootNode());
  pullInReferences(
    clone,
    (id) => {
      const el = scope.getElementById?.(id) ?? null;
      return el && el.namespaceURI === SVG_NS && !svg.contains(el) ? el : null;
    },
    (el) => cloneWithStyles(el, { keepClasses, inDefs: true, isRoot: false, computed })
  );

  if (loadExternal) await inlineExternalUses(clone, loadExternal);

  sanitizeSvg(clone);
  removeComments(clone);
  let markup = new XMLSerializer().serializeToString(clone);
  // `color` only matters while something still says currentColor.
  if (!/currentcolor/i.test(markup)) {
    for (const el of [clone, ...clone.querySelectorAll('[color], [style]')]) {
      el.removeAttribute('color');
      const style = /** @type {SVGElement} */ (el).style;
      style?.removeProperty('color');
      if (style && style.length === 0) el.removeAttribute('style');
    }
    markup = new XMLSerializer().serializeToString(clone);
  }
  return markup;
}
