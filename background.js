// Background script is now minimal since we're handling everything in the content script
// We'll keep basic message handling for potential future functionality

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.status) {
    console.log(`[SVG Grab Pro] ${message.status}`);
  }
  return true;
});

// Log when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('SVG Grab Pro extension installed successfully');
});