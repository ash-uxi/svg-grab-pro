const WEB_STORE_RE = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)\//;

/** Firefox's default `extensions.webextensions.restrictedDomains`. */
const FIREFOX_RESTRICTED_HOSTS = new Set([
  'accounts-static.cdn.mozilla.net',
  'accounts.firefox.com',
  'addons.cdn.mozilla.net',
  'addons.mozilla.org',
  'api.accounts.firefox.com',
  'content.cdn.mozilla.net',
  'discovery.addons.mozilla.org',
  'install.mozilla.org',
  'oauth.accounts.firefox.com',
  'profile.accounts.firefox.com',
  'support.mozilla.org',
  'sync.services.mozilla.com',
]);

/**
 * Whether the browser (Chrome or Firefox) lets extensions run scripts on this URL.
 * @param {string | undefined} url
 */
export function isInjectableUrl(url) {
  if (!url || !/^(https?|file):/.test(url) || WEB_STORE_RE.test(url)) return false;
  try {
    return !FIREFOX_RESTRICTED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
