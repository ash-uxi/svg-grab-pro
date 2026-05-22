// Background: theme icons, permission sync, content script injection

const CONTENT_SCRIPT_FILES = [
  'content/state.js',
  'content/theme.js',
  'content/notifications.js',
  'content/logoDetection.js',
  'content/svgExport.js',
  'content/contextMenu.js',
  'content/index.js'
];

function setIconForTheme(theme) {
  const iconPath =
    theme === 'light'
      ? {
          16: 'images/light/icon16.png',
          48: 'images/light/icon48.png',
          128: 'images/light/icon128.png'
        }
      : {
          16: 'images/dark/icon16.png',
          48: 'images/dark/icon48.png',
          128: 'images/dark/icon128.png'
        };

  chrome.action.setIcon({ path: iconPath });
}

function checkStorageTheme() {
  chrome.storage.local.get('svgGrabProTheme', (data) => {
    if (
      data.svgGrabProTheme === 'dark' ||
      data.svgGrabProTheme === 'light'
    ) {
      setIconForTheme(data.svgGrabProTheme);
    } else {
      setIconForTheme('dark');
    }
  });
}

function isInjectableUrl(url) {
  if (!url) return false;
  return (
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('about:')
  );
}

function syncPermissionState() {
  chrome.permissions.contains({ origins: ['<all_urls>'] }, (hasPermission) => {
    chrome.storage.local.get('allSitesEnabled', (data) => {
      if (hasPermission !== !!data.allSitesEnabled) {
        chrome.storage.local.set({ allSitesEnabled: hasPermission });
      }
    });
  });
}

function injectContentScripts(tabId, frameId = 0) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    if (!isInjectableUrl(tab.url)) return;

    chrome.scripting
      .executeScript({
        target: { tabId, frameIds: [frameId] },
        files: CONTENT_SCRIPT_FILES
      })
      .catch((error) => {
        console.error('[SVG Grab Pro] Script injection error:', error);
      });
  });
}

function checkAndInjectContentScript(tabId, frameId = 0) {
  chrome.storage.local.get('allSitesEnabled', (data) => {
    if (data.allSitesEnabled !== true) return;

    chrome.permissions.contains({ origins: ['<all_urls>'] }, (hasPermission) => {
      if (!hasPermission) {
        chrome.storage.local.set({ allSitesEnabled: false });
        return;
      }

      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          injectContentScripts(tabId, frameId);
        }
      });
    });
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isInjectableUrl(tab.url)) {
    checkAndInjectContentScript(tabId);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'themeChanged' && message.theme) {
    setIconForTheme(message.theme);
    return false;
  }

  if (message.action === 'permissionChanged') {
    syncPermissionState();

    if (message.allSitesEnabled === true) {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (isInjectableUrl(tab.url)) {
            checkAndInjectContentScript(tab.id);
          }
        }
      });
    }
    return false;
  }

  if (message.action === 'ping') {
    sendResponse({ status: 'pong' });
    return true;
  }

  return false;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (
    namespace === 'local' &&
    changes.svgGrabProTheme &&
    (changes.svgGrabProTheme.newValue === 'dark' ||
      changes.svgGrabProTheme.newValue === 'light')
  ) {
    setIconForTheme(changes.svgGrabProTheme.newValue);
  }

  if (namespace === 'local' && changes.allSitesEnabled !== undefined) {
    syncPermissionState();
  }
});

if (chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(syncPermissionState);
}
if (chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener(syncPermissionState);
}

chrome.runtime.onInstalled.addListener(() => {
  checkStorageTheme();
  chrome.storage.local.set({ allSitesEnabled: false });
  syncPermissionState();
});

checkStorageTheme();
syncPermissionState();
