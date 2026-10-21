const GENERIC_WORDS = new Set(
  'home homepage logo logotype link icon image img svg go to the back main page site website click here navigate return of and a an'.split(
    ' '
  )
);
const ICON_CLASS_RE =
  /^(?:[a-z]+-)?(?:logo|icon|brand|mark|glyph|symbol|fa|bi|ri|lucide|octicon|ti|mdi|ph)[-_][a-z0-9-_]+$/i;
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu']);

/** @param {string} text */
export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/**
 * "www.github.com" → "github", "bbc.co.uk" → "bbc".
 * @param {string} hostname
 */
export function siteName(hostname) {
  const parts = hostname
    .replace(/^www\./, '')
    .split('.')
    .filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  const candidate = parts[parts.length - 2];
  return SECOND_LEVEL.has(candidate) && parts.length > 2 ? parts[parts.length - 3] : candidate;
}

/**
 * Meaningful slug from a label: drops filler words and machine-generated tokens.
 * @param {string | null | undefined} label
 */
function meaningfulSlug(label) {
  if (!label) return '';
  return slugify(label)
    .split('-')
    .filter(
      (word) =>
        /[a-z]{2}/.test(word) && !GENERIC_WORDS.has(word) && !/\d{3,}|^[a-f0-9]{6,}$/.test(word)
    )
    .join('-');
}

/** @param {string} url */
function fileStem(url) {
  if (!url || url.startsWith('data:')) return '';
  try {
    const last = new URL(url).pathname.split('/').pop() || '';
    return decodeURIComponent(last).replace(/\.svg$/i, '');
  } catch {
    return '';
  }
}

/**
 * A human file name (without extension) for an SVG, from its labels, link, classes or URL.
 * @param {Element} el
 * @param {{ url?: string; hostname: string; isLogo: boolean }} context
 */
export function suggestName(el, { url, hostname, isLogo }) {
  const site = slugify(siteName(hostname)) || 'svg';
  const link = el.closest('a');
  const iconClass = (el.getAttribute('class') || '')
    .split(/\s+/)
    .find((token) => ICON_CLASS_RE.test(token));
  const labels = [
    el.getAttribute('aria-label'),
    el.querySelector(':scope > title')?.textContent,
    el.getAttribute('alt'),
    el.getAttribute('title'),
    link?.getAttribute('aria-label'),
    link?.getAttribute('title'),
    url && fileStem(url),
    iconClass,
    el.id,
  ];

  for (const label of labels) {
    const slug = meaningfulSlug(label);
    if (!slug) continue;
    return isLogo && !slug.includes('logo') ? `${slug}-logo` : slug;
  }
  return isLogo ? `${site}-logo` : `${site}-svg`;
}

/**
 * Make names unique within a set by suffixing -2, -3, …
 * @param {string[]} names
 */
export function dedupeNames(names) {
  const used = new Set();
  return names.map((name) => {
    let unique = name;
    for (let n = 2; used.has(unique); n++) unique = `${name}-${n}`;
    used.add(unique);
    return unique;
  });
}
