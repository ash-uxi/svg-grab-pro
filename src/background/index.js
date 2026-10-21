import { ALL_SITES, CONTENT_SCRIPT_ID, MESSAGES, STORAGE_KEYS } from '../shared/constants.js';
import { isInjectableUrl } from '../shared/is-injectable-url.js';

const MAX_SVG_BYTES = 5_000_000;

/** @param {'light' | 'dark'} scheme */
function setIcon(scheme) {
  const path = Object.fromEntries(
    [16, 48, 128].map((size) => [size, `images/${scheme}/icon${size}.png`])
  );
  return chrome.action.setIcon({ path }).catch(() => {});
}

async function restoreIcon() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.iconScheme);
  setIcon(data[STORAGE_KEYS.iconScheme] === 'light' ? 'light' : 'dark');
}

/** @param {number} tabId */
function injectInto(tabId) {
  return chrome.scripting
    .executeScript({ target: { tabId }, files: ['contentScript.js'] })
    .catch(() => {}); // Tabs we can't script (web store, PDFs, crashed) are fine to skip.
}

/**
 * "All sites" is the optional `<all_urls>` grant. Mirror it into a registered content script
 * (so new pages get it at load) and into storage (so open tabs can react).
 */
async function syncAllSitesAccess() {
  const granted = await chrome.permissions.contains(ALL_SITES);
  const registered = await chrome.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_ID],
  });

  if (granted && registered.length === 0) {
    await chrome.scripting.registerContentScripts([
      {
        id: CONTENT_SCRIPT_ID,
        matches: ['<all_urls>'],
        js: ['contentScript.js'],
        runAt: 'document_idle',
      },
    ]);
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs
        .filter((tab) => tab.id && isInjectableUrl(tab.url))
        .map((tab) => injectInto(/** @type {number} */ (tab.id)))
    );
  } else if (!granted && registered.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.allSitesEnabled]: granted });
}

/**
 * Fetch an SVG on behalf of a content script whose page CORS blocked it. Only public files:
 * no cookies, http(s) only, size-capped, and only returned if it looks like SVG.
 * @param {string} url
 * @returns {Promise<{ text?: string; error?: string }>}
 */
async function fetchSvg(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'That SVG address isn’t valid.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
    return { error: 'Unsupported address.' };
  if (!(await chrome.permissions.contains({ origins: [`${parsed.origin}/*`] })))
    return { error: 'no-access' };

  try {
    const response = await fetch(parsed.href, { credentials: 'omit', redirect: 'follow' });
    if (!response.ok) return { error: `The site returned ${response.status} for this SVG.` };
    if (Number(response.headers.get('content-length')) > MAX_SVG_BYTES) {
      return { error: 'This SVG is too large to grab.' };
    }
    const text = await response.text();
    if (text.length > MAX_SVG_BYTES) return { error: 'This SVG is too large to grab.' };
    if (!/<svg[\s>]/i.test(text)) return { error: 'That file isn’t a valid SVG.' };
    return { text };
  } catch {
    return { error: 'Couldn’t reach the server hosting this SVG.' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === MESSAGES.fetchSvg && sender.id === chrome.runtime.id && sender.tab) {
    fetchSvg(String(message.url)).then(sendResponse);
    return true;
  }
  return false;
});

chrome.permissions.onAdded.addListener(syncAllSitesAccess);
chrome.permissions.onRemoved.addListener(syncAllSitesAccess);

chrome.storage.onChanged.addListener((changes, area) => {
  const scheme = changes[STORAGE_KEYS.iconScheme]?.newValue;
  if (area === 'local' && (scheme === 'light' || scheme === 'dark')) setIcon(scheme);
});

chrome.runtime.onInstalled.addListener(() => {
  syncAllSitesAccess();
  restoreIcon();
});
chrome.runtime.onStartup.addListener(() => {
  syncAllSitesAccess();
  restoreIcon();
});
