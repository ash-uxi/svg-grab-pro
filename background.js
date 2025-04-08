// Background script handles icon switching based on theme and basic message handling
// Also manages content script injection based on permissions

// Function to set icon based on theme
function setIconForTheme(theme) {
  const iconPath = theme === 'light' 
    ? {
        16: "images/light/icon16.png",
        48: "images/light/icon48.png",
        128: "images/light/icon128.png"
      }
    : {
        16: "images/dark/icon16.png",
        48: "images/dark/icon48.png",
        128: "images/dark/icon128.png"
      };
  
  chrome.action.setIcon({ path: iconPath });
  console.log(`[SVG Grab Pro] Icon updated to ${theme} theme`);
}

// Initialize icon based on saved theme
function initializeTheme() {
  // First check localStorage through content script messaging
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getTheme" }, function(response) {
        if (response && response.theme) {
          setIconForTheme(response.theme);
          return;
        } else {
          // If no response from content script, check chrome.storage
          checkStorageTheme();
        }
      });
    } else {
      // No active tab, check chrome.storage
      checkStorageTheme();
    }
  });
}

function checkStorageTheme() {
  // Check chrome.storage.local (used by popup.js)
  chrome.storage.local.get('svgGrabProTheme', function(data) {
    if (data.svgGrabProTheme && (data.svgGrabProTheme === 'dark' || data.svgGrabProTheme === 'light')) {
      setIconForTheme(data.svgGrabProTheme);
    } else {
      // Default to dark theme if no saved preference
      setIconForTheme('dark');
    }
  });
}

// Verify that permissions and storage state are in sync
function syncPermissionState() {
  chrome.permissions.contains({
    origins: ["<all_urls>"]
  }, function(hasPermission) {
    chrome.storage.local.get('allSitesEnabled', function(data) {
      // If there's a mismatch, update storage to match actual permission state
      if (hasPermission !== !!data.allSitesEnabled) {
        chrome.storage.local.set({ 'allSitesEnabled': hasPermission });
        console.log(`[SVG Grab Pro] Synchronized permission state: ${hasPermission}`);
      }
    });
  });
}

// Check if all-sites mode is enabled and inject content script if needed
function checkAndInjectContentScript(tabId, frameId = 0) {
  // First verify permission sync state
  syncPermissionState();
  
  // Now check if we should inject
  chrome.storage.local.get('allSitesEnabled', function(data) {
    if (data.allSitesEnabled === true) {
      // Double-check we have permission before attempting injection
      chrome.permissions.contains({
        origins: ["<all_urls>"]
      }, function(hasPermission) {
        if (hasPermission) {
          // Check if the script is already injected to avoid duplicates
          chrome.tabs.sendMessage(tabId, { action: "ping" }, function(response) {
            if (chrome.runtime.lastError || !response) {
              // Only proceed if the tab is still valid
              chrome.tabs.get(tabId, function(tab) {
                if (chrome.runtime.lastError) {
                  return; // Tab doesn't exist anymore
                }
                
                // Skip chrome:// and other restricted URLs
                if (tab.url && !tab.url.startsWith("chrome://") && 
                    !tab.url.startsWith("chrome-extension://") && 
                    !tab.url.startsWith("about:")) {
                  // Script not injected, inject it now
                  chrome.scripting.executeScript({
                    target: { tabId: tabId, frameIds: [frameId] },
                    files: ["contentScript.js"]
                  }).catch(error => {
                    console.error("[SVG Grab Pro] Script injection error:", error);
                  });
                }
              });
            }
          });
        } else {
          // We don't have permission, make sure storage reflects this
          chrome.storage.local.set({ 'allSitesEnabled': false });
        }
      });
    }
  });
}

// Handle active tab changes (for toolbar button usage)
chrome.action.onClicked.addListener((tab) => {
  // When user clicks the extension icon in toolbar, inject the script to the active tab
  if (tab.url && !tab.url.startsWith("chrome://") && 
      !tab.url.startsWith("chrome-extension://") && 
      !tab.url.startsWith("about:")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"]
    }).catch(error => {
      console.error("[SVG Grab Pro] Script injection error:", error);
    });
  }
});

// Listen for tab updates to inject content script when needed (if all-sites mode enabled)
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && 
      !tab.url.startsWith("chrome://") && 
      !tab.url.startsWith("chrome-extension://") && 
      !tab.url.startsWith("about:")) {
    checkAndInjectContentScript(tabId);
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle theme changes
  if (message.action === "themeChanged" && message.theme) {
    setIconForTheme(message.theme);
  }
  
  // Handle permission changes
  if (message.action === "permissionChanged") {
    // Synchronize permission state
    syncPermissionState();
    
    if (message.allSitesEnabled === true) {
      // When permissions are granted, inject content script into all current tabs
      chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
          if (tab.url && !tab.url.startsWith("chrome://") && 
              !tab.url.startsWith("chrome-extension://") && 
              !tab.url.startsWith("about:")) {
            checkAndInjectContentScript(tab.id);
          }
        }
      });
    }
  }
  
  // Handle status messages
  if (message.status) {
    console.log(`[SVG Grab Pro] ${message.status}`);
  }
  
  // Handle ping to check if content script is loaded
  if (message.action === "ping") {
    sendResponse({ status: "pong" });
  }
  
  return true; // Keep the message channel open for async responses
});

// Listen for storage changes to update icon
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.svgGrabProTheme && 
      (changes.svgGrabProTheme.newValue === 'dark' || changes.svgGrabProTheme.newValue === 'light')) {
    setIconForTheme(changes.svgGrabProTheme.newValue);
  }
});

// Log when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('SVG Grab Pro extension installed successfully');
  // Initialize theme when extension is installed
  initializeTheme();
  
  // Default to all-sites mode disabled
  chrome.storage.local.set({ 'allSitesEnabled': false });
  
  // Ensure permissions are synchronized
  syncPermissionState();
});

// Periodically check permission state to ensure consistency
setInterval(syncPermissionState, 60000); // Check every minute

// Initialize theme when background script runs
initializeTheme();

// Initial permission sync
syncPermissionState();