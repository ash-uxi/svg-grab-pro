(() => {
  // src/shared/constants.js
  var STORAGE_KEYS = {
    theme: "svgGrabProTheme",
    allSitesEnabled: "allSitesEnabled",
    /** Light/dark scheme the toolbar icon should match (resolved from "system" by the popup). */
    iconScheme: "iconScheme"
  };
  var MESSAGES = {
    fetchSvg: "fetchSvg"
  };
  var ALL_SITES = { origins: ["<all_urls>"] };
  var CONTENT_SCRIPT_ID = "svg-grab-pro";

  // src/shared/is-injectable-url.js
  var WEB_STORE_RE = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)\//;
  var FIREFOX_RESTRICTED_HOSTS = /* @__PURE__ */ new Set([
    "accounts-static.cdn.mozilla.net",
    "accounts.firefox.com",
    "addons.cdn.mozilla.net",
    "addons.mozilla.org",
    "api.accounts.firefox.com",
    "content.cdn.mozilla.net",
    "discovery.addons.mozilla.org",
    "install.mozilla.org",
    "oauth.accounts.firefox.com",
    "profile.accounts.firefox.com",
    "support.mozilla.org",
    "sync.services.mozilla.com"
  ]);
  function isInjectableUrl(url) {
    if (!url || !/^(https?|file):/.test(url) || WEB_STORE_RE.test(url)) return false;
    try {
      return !FIREFOX_RESTRICTED_HOSTS.has(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  // src/background/index.js
  var MAX_SVG_BYTES = 5e6;
  function setIcon(scheme) {
    const path = Object.fromEntries(
      [16, 48, 128].map((size) => [size, `images/${scheme}/icon${size}.png`])
    );
    return chrome.action.setIcon({ path }).catch(() => {
    });
  }
  async function restoreIcon() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.iconScheme);
    setIcon(data[STORAGE_KEYS.iconScheme] === "light" ? "light" : "dark");
  }
  function injectInto(tabId) {
    return chrome.scripting.executeScript({ target: { tabId }, files: ["contentScript.js"] }).catch(() => {
    });
  }
  async function syncAllSitesAccess() {
    const granted = await chrome.permissions.contains(ALL_SITES);
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT_ID]
    });
    if (granted && registered.length === 0) {
      await chrome.scripting.registerContentScripts([
        {
          id: CONTENT_SCRIPT_ID,
          matches: ["<all_urls>"],
          js: ["contentScript.js"],
          runAt: "document_idle"
        }
      ]);
      const tabs = await chrome.tabs.query({});
      await Promise.all(
        tabs.filter((tab) => tab.id && isInjectableUrl(tab.url)).map((tab) => injectInto(
          /** @type {number} */
          tab.id
        ))
      );
    } else if (!granted && registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.allSitesEnabled]: granted });
  }
  async function fetchSvg(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return { error: "That SVG address isn\u2019t valid." };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return { error: "Unsupported address." };
    if (!await chrome.permissions.contains({ origins: [`${parsed.origin}/*`] }))
      return { error: "no-access" };
    try {
      const response = await fetch(parsed.href, { credentials: "omit", redirect: "follow" });
      if (!response.ok) return { error: `The site returned ${response.status} for this SVG.` };
      if (Number(response.headers.get("content-length")) > MAX_SVG_BYTES) {
        return { error: "This SVG is too large to grab." };
      }
      const text = await response.text();
      if (text.length > MAX_SVG_BYTES) return { error: "This SVG is too large to grab." };
      if (!/<svg[\s>]/i.test(text)) return { error: "That file isn\u2019t a valid SVG." };
      return { text };
    } catch {
      return { error: "Couldn\u2019t reach the server hosting this SVG." };
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
    if (area === "local" && (scheme === "light" || scheme === "dark")) setIcon(scheme);
  });
  chrome.runtime.onInstalled.addListener(() => {
    syncAllSitesAccess();
    restoreIcon();
  });
  chrome.runtime.onStartup.addListener(() => {
    syncAllSitesAccess();
    restoreIcon();
  });
})();
