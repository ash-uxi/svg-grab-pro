// Shared mutable state for content script modules (loaded first).
const SVGGrabProState = {
  selectedSvgElement: null,
  customContextMenu: null,
  currentTheme: 'dark',
  extensionEnabled: false,
  listenersAttached: false
};
