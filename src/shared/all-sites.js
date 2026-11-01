import { ALL_SITES } from './constants.js';

/**
 * The optional "All sites" grant (`<all_urls>`). The service worker watches permission changes
 * and registers or removes the content script to match.
 */
export const hasAllSites = () => chrome.permissions.contains(ALL_SITES);

/** Call straight from a click handler: Firefox drops the user gesture after an `await`. */
export const requestAllSites = () => chrome.permissions.request(ALL_SITES);
