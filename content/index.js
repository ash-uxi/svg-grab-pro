function shouldInitializeExtension() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('allSitesEnabled', (data) => {
        resolve(data.allSitesEnabled === true);
      });
    } else {
      resolve(false);
    }
  });
}

function setExtensionEnabled(enabled) {
  SVGGrabProState.extensionEnabled = enabled;
  if (!enabled) {
    SVGGrabProState.selectedSvgElement = null;
    hideCustomContextMenu();
    return;
  }
  if (!SVGGrabProState.listenersAttached) {
    attachExtensionListeners();
  }
}

function attachExtensionListeners() {
  if (SVGGrabProState.listenersAttached) return;
  SVGGrabProState.listenersAttached = true;

  document.addEventListener('contextmenu', (event) => {
    if (!SVGGrabProState.extensionEnabled) {
      hideCustomContextMenu();
      return;
    }

    const svgElement = findSvgElement(event.target);

    if (svgElement && isLikelyLogo(svgElement)) {
      SVGGrabProState.selectedSvgElement = svgElement;
      event.preventDefault();
      showCustomContextMenu(event.clientX, event.clientY);
    } else {
      SVGGrabProState.selectedSvgElement = null;
      hideCustomContextMenu();
    }
  });

  document.addEventListener('click', (event) => {
    const menu = SVGGrabProState.customContextMenu;
    if (menu && !menu.contains(event.target)) {
      hideCustomContextMenu();
    }
  });

  window.addEventListener('scroll', hideCustomContextMenu);
  window.addEventListener('resize', hideCustomContextMenu);

  createCustomContextMenu();
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.allSitesEnabled !== undefined) {
    setExtensionEnabled(changes.allSitesEnabled.newValue === true);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTheme') {
    sendResponse({ theme: getCurrentTheme() });
    return true;
  }
  if (request.action === 'ping') {
    sendResponse({ status: 'pong' });
    return true;
  }
});

shouldInitializeExtension().then((shouldInit) => {
  setExtensionEnabled(shouldInit);
});
