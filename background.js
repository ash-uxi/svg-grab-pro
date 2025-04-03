// Background script handles icon switching based on theme and basic message handling

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

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle theme changes
  if (message.action === "themeChanged" && message.theme) {
    setIconForTheme(message.theme);
  }
  
  // Handle status messages
  if (message.status) {
    console.log(`[SVG Grab Pro] ${message.status}`);
  }
  
  return true;
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
});

// Initialize theme when background script runs
initializeTheme();