export const STORAGE_KEYS = {
  theme: 'svgGrabProTheme',
  allSitesEnabled: 'allSitesEnabled',
  /** Light/dark scheme the toolbar icon should match (resolved from "system" by the popup). */
  iconScheme: 'iconScheme',
};

export const MESSAGES = {
  fetchSvg: 'fetchSvg',
};

/** Long-lived connection from the popup to the active tab's content script. */
export const POPUP_PORT = 'svg-grab-pro:popup';

export const ALL_SITES = { origins: ['<all_urls>'] };

export const CONTENT_SCRIPT_ID = 'svg-grab-pro';
