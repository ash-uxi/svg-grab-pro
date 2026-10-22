import { normalizeSvgText, tintSvg } from '../lib/parse-svg.js';
import { serializeSvgElement } from '../lib/serialize-svg.js';
import { decodeSvgDataUrl } from '../lib/svg-url.js';
import { MESSAGES } from '../shared/constants.js';

/** An error whose message is written for the person using the extension. */
export class GrabError extends Error {
  /**
   * @param {string} message
   * @param {'no-access' | 'failed'} [code]
   */
  constructor(message, code = 'failed') {
    super(message);
    this.code = code;
  }
}

/** @type {Map<string, Promise<string | null>>} */
const textCache = new Map();

/** @param {string} url */
async function fetchDirect(url) {
  const sameOrigin = new URL(url, location.href).origin === location.origin;
  const response = await fetch(url, { credentials: sameOrigin ? 'include' : 'omit' });
  if (!response.ok) throw new GrabError(`The site returned ${response.status} for this SVG.`);
  return response.text();
}

/**
 * The service worker can read other origins when the user has granted site access.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchViaBackground(url) {
  /** @type {{ text?: string; error?: string } | undefined} */
  const response = await chrome.runtime.sendMessage({ action: MESSAGES.fetchSvg, url });
  if (response?.text) return response.text;
  if (response?.error === 'no-access') {
    throw new GrabError(
      'This SVG lives on another domain. Turn on “All sites” in SVG Grab Pro to grab it.',
      'no-access'
    );
  }
  throw new GrabError(response?.error || 'Couldn’t download this SVG.');
}

/**
 * Raw text of an SVG file, trying the page's own fetch first. Successful loads are cached.
 * @param {string} url
 * @returns {Promise<string | null>}
 */
export function loadSvgText(url) {
  const cached = textCache.get(url);
  if (cached) return cached;

  const pending = (async () => {
    if (url.startsWith('data:')) return decodeSvgDataUrl(url);
    try {
      return await fetchDirect(url);
    } catch {
      return fetchViaBackground(url);
    }
  })();
  textCache.set(url, pending);
  pending.then(
    (text) => text || textCache.delete(url),
    () => textCache.delete(url)
  );
  return pending;
}

/**
 * Standalone SVG markup for a target.
 * @param {import('../lib/locate.js').SvgTarget} target
 * @returns {Promise<string>}
 */
export async function resolveTarget(target) {
  const options = {
    loadExternal: (/** @type {string} */ url) => loadSvgText(url).catch(() => null),
  };
  if (target.kind === 'inline') return serializeSvgElement(target.element, options);

  // Same-origin <object> embeds expose their live document, styles and all.
  if (target.element.localName === 'object') {
    try {
      const root = /** @type {HTMLObjectElement} */ (target.element).contentDocument
        ?.documentElement;
      if (root?.localName === 'svg')
        return serializeSvgElement(/** @type {SVGSVGElement} */ (root), options);
    } catch {
      // Cross-origin embed: fall through to fetching the file.
    }
  }

  const text = await loadSvgText(target.url);
  const svg = text && (target.tint ? tintSvg(text, target.tint) : normalizeSvgText(text));
  if (!svg) throw new GrabError('That file isn’t a valid SVG.');
  return svg;
}
