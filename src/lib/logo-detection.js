/** Score at or above which an SVG is treated as the site's logo. */
export const LOGO_SCORE_THRESHOLD = 45;

const LOGO_RE = /(^|[^a-z])(logo|logotype|logomark|wordmark|brand)/i;
const ICON_RE =
  /(^|[^a-z])(icon|chevron|arrow|caret|close|menu|search|hamburger|spinner)([^a-z]|$)/i;
const HOME_PATH_RE = /^\/([a-z]{2}([-_][a-z]{2})?\/?)?(index\.html?)?$/i;

/** @param {Element | null} el */
function classOf(el) {
  if (!el) return '';
  const value = el.getAttribute('class');
  return value || '';
}

/**
 * Words that describe an element: its id, classes, labels, `<title>` and its link's label.
 * @param {Element} el
 */
export function describe(el) {
  const link = el.closest('a');
  return [
    el.id,
    classOf(el),
    el.getAttribute('aria-label'),
    el.getAttribute('alt'),
    el.getAttribute('title'),
    el.querySelector(':scope > title')?.textContent,
    link?.getAttribute('aria-label'),
    link?.getAttribute('title'),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * @param {string | null} href
 * @param {string} pageUrl
 */
export function isHomeLink(href, pageUrl) {
  if (href === null) return false;
  try {
    const url = new URL(href, pageUrl);
    return url.origin === new URL(pageUrl).origin && HOME_PATH_RE.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Heuristic logo-likeness: higher means more likely to be the site's brand mark.
 * @param {Element} el
 * @param {{ pageUrl: string; viewportWidth: number; scrollY: number }} context
 */
export function scoreLogo(el, { pageUrl, viewportWidth, scrollY }) {
  let score = 0;
  const words = describe(el);
  const hasLogoWord = LOGO_RE.test(words);

  if (hasLogoWord) score += 35;
  else if (ICON_RE.test(words)) score -= 15;

  let ancestorNamed = false;
  let inHeader = false;
  let parent = el.parentElement;
  for (let depth = 0; parent && depth < 6; depth++, parent = parent.parentElement) {
    if (!ancestorNamed && LOGO_RE.test(`${parent.id} ${classOf(parent)}`)) {
      ancestorNamed = true;
      score += 25;
    }
    if (!inHeader && (parent.localName === 'header' || parent.getAttribute('role') === 'banner')) {
      inHeader = true;
      score += 20;
    }
  }

  if (isHomeLink(el.closest('a')?.getAttribute('href') ?? null, pageUrl)) score += 30;

  const rect = el.getBoundingClientRect();
  const top = rect.top + scrollY;
  if (top < 160) score += 10;
  if (top < 160 && rect.left < viewportWidth * 0.4) score += 5;
  if (rect.width >= 24 && rect.width <= 400 && rect.height >= 12 && rect.height <= 160) score += 5;
  if (rect.height > 0 && rect.width / rect.height > 1.8) score += 5;
  if (Math.max(rect.width, rect.height) < 20) score -= 20;

  return score;
}
