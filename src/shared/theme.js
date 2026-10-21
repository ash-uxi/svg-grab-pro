import { STORAGE_KEYS } from './constants.js';

/** @typedef {'system' | 'light' | 'dark'} Theme */

/**
 * @param {unknown} value
 * @returns {value is Theme}
 */
export function isValidTheme(value) {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** @returns {Promise<Theme>} */
export async function getStoredTheme() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.theme);
  const stored = data[STORAGE_KEYS.theme];
  return isValidTheme(stored) ? stored : 'system';
}

/**
 * @param {Theme} theme
 * @returns {'light' | 'dark'}
 */
export function resolveScheme(theme) {
  if (theme !== 'system') return theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
