import { hasAllSites, requestAllSites } from '../shared/all-sites.js';
import { fillIcons } from '../shared/icons.js';
import { getStoredTheme, resolveScheme } from '../shared/theme.js';

/** First-run page, opened on install, that asks for the "All sites" grant right-click needs. */
const root = document.documentElement;
const allow = /** @type {HTMLButtonElement} */ (document.querySelector('#allow'));

fillIcons();

/** @type {import('../shared/theme.js').Theme} */
let theme = 'system';
const applyTheme = () => {
  root.dataset.scheme = resolveScheme(theme);
};
applyTheme();
getStoredTheme().then((stored) => {
  theme = stored;
  applyTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/** @param {boolean} granted */
function showAccess(granted) {
  root.dataset.state = granted ? 'done' : 'ask';
}

allow.addEventListener('click', () => requestAllSites().then(showAccess));
// The popup's "All sites" switch can change it too.
const refresh = () => hasAllSites().then(showAccess);
chrome.permissions.onAdded.addListener(refresh);
chrome.permissions.onRemoved.addListener(refresh);
refresh();
