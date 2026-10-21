import { collectPageTargets } from '../lib/locate.js';
import { LOGO_SCORE_THRESHOLD, scoreLogo } from '../lib/logo-detection.js';
import { dedupeNames, suggestName } from '../lib/naming.js';
import { getSvgSize } from '../lib/parse-svg.js';
import { byteLength } from '../shared/format.js';
import { GrabError, resolveTarget } from './resolve.js';

const DRAWABLE_RE = /<(path|rect|circle|ellipse|line|polyline|polygon|text|image|use)[\s/>]/i;
const CONCURRENCY = 6;
const TIMEOUT_MS = 8000;

/**
 * @typedef {object} ScanItem
 * @property {string} id
 * @property {string} name  file name without extension
 * @property {string} svg
 * @property {boolean} isLogo
 * @property {number | null} width
 * @property {number | null} height
 * @property {number} bytes
 * @property {'inline' | 'file' | 'css'} source
 */

/**
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} fn
 */
async function mapWithLimit(items, fn) {
  /** @type {R[]} */
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return results;
}

/**
 * @template T
 * @param {Promise<T>} promise
 */
function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
  ]);
}

/**
 * Every distinct, drawable SVG on the page, logos first. `blocked` counts SVG files on other
 * domains that need site access to read.
 * @returns {Promise<{ items: ScanItem[]; elements: Map<string, Element>; blocked: number }>}
 */
export async function scanPage() {
  const targets = collectPageTargets(document);
  const context = { pageUrl: location.href, viewportWidth: innerWidth, scrollY };
  let blocked = 0;
  const resolved = await mapWithLimit(targets, (target) =>
    withTimeout(resolveTarget(target)).catch((error) => {
      if (error instanceof GrabError && error.code === 'no-access') blocked++;
      return null;
    })
  );

  const seen = new Set();
  /** @type {(ScanItem & { score: number; order: number })[]} */
  const items = [];
  /** @type {Map<string, Element>} */
  const elements = new Map();

  resolved.forEach((svg, order) => {
    if (!svg || !DRAWABLE_RE.test(svg) || seen.has(svg)) return;
    seen.add(svg);
    const target = targets[order];
    const element = target.element;
    const score = scoreLogo(element, context);
    const isLogo = score >= LOGO_SCORE_THRESHOLD;
    const size = getSvgSize(svg);
    const id = `svg-${order}`;
    elements.set(id, element);
    items.push({
      id,
      name: suggestName(element, {
        url: target.kind === 'url' ? target.url : undefined,
        hostname: location.hostname,
        isLogo,
      }),
      svg,
      isLogo,
      score,
      order,
      width: size?.width ?? null,
      height: size?.height ?? null,
      bytes: byteLength(svg),
      source:
        target.kind === 'inline'
          ? 'inline'
          : ['img', 'object', 'embed'].includes(element.localName)
            ? 'file'
            : 'css',
    });
  });

  items.sort(
    (a, b) =>
      Number(b.isLogo) - Number(a.isLogo) || (a.isLogo ? b.score - a.score : 0) || a.order - b.order
  );
  const names = dedupeNames(items.map((item) => item.name));
  return {
    items: items.map(({ score: _score, order: _order, ...item }, index) => ({
      ...item,
      name: names[index],
    })),
    elements,
    blocked,
  };
}
