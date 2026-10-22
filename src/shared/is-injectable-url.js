const WEB_STORE_RE = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)\//;

/**
 * Whether Chrome lets extensions run scripts on this URL.
 * @param {string | undefined} url
 */
export function isInjectableUrl(url) {
  if (!url) return false;
  return /^(https?|file):/.test(url) && !WEB_STORE_RE.test(url);
}
