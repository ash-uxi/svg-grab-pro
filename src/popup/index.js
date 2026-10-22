import { svgToPngBlob } from '../lib/rasterize.js';
import { svgToDataUrl } from '../lib/svg-url.js';
import { artworkTone } from '../lib/tone.js';
import { createZip } from '../lib/zip.js';
import { ALL_SITES, POPUP_PORT, STORAGE_KEYS } from '../shared/constants.js';
import { copyText } from '../shared/clipboard.js';
import { downloadBlob } from '../shared/download.js';
import { formatBytes, formatSize } from '../shared/format.js';
import { BRAND_MARK, ICONS } from '../shared/icons.js';
import { isInjectableUrl } from '../shared/is-injectable-url.js';
import { getStoredTheme, resolveScheme } from '../shared/theme.js';

/** @typedef {import('../content-script/scan.js').ScanItem} ScanItem */

const BACKDROP_KEY = 'svgGrabPro.backdrop';
const SCHEME_KEY = 'svgGrabPro.scheme';
const root = document.documentElement;

// Paint with the last-used scheme before storage answers, so dark mode doesn't flash white.
try {
  root.dataset.scheme = localStorage.getItem(SCHEME_KEY) || resolveScheme('system');
} catch {
  root.dataset.scheme = resolveScheme('system');
}
const $ = (/** @type {string} */ selector) =>
  /** @type {HTMLElement} */ (document.querySelector(selector));
const content = $('#content');
const downloadAll = /** @type {HTMLButtonElement} */ ($('#downloadAll'));
const allSites = /** @type {HTMLInputElement} */ ($('#allSites'));

/** @type {ScanItem[]} */
let items = [];
/** SVG files on other domains the scan couldn't read without site access. */
let blocked = 0;
/** @type {'all' | 'logos'} */
let filter = 'all';
let revealed = false;
/** @type {chrome.runtime.Port | null} */
let port = null;

for (const el of document.querySelectorAll('[data-icon]')) {
  const name = /** @type {HTMLElement} */ (el).dataset.icon;
  el.innerHTML = name === 'brand' ? BRAND_MARK : ICONS[/** @type {keyof typeof ICONS} */ (name)];
}

// ——— Small UI helpers ———

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** @type {ReturnType<typeof setTimeout> | undefined} */
let toastTimer;
/**
 * @param {string} message
 * @param {'success' | 'error'} [tone]
 */
function toast(message, tone = 'success') {
  const el = $('#toast');
  el.textContent = message;
  el.dataset.tone = tone;
  el.setAttribute('data-open', '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.removeAttribute('data-open'), tone === 'error' ? 3600 : 1800);
}

/**
 * Mark one button in a segmented control as current.
 * @param {string} groupSelector
 * @param {HTMLElement} current
 */
function selectSegment(groupSelector, current) {
  for (const button of document.querySelectorAll(groupSelector)) {
    const attr = button.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-checked';
    button.setAttribute(attr, String(button === current));
  }
}

/**
 * @param {{ icon: keyof typeof ICONS; title: string; text: string; grant?: boolean }} state
 */
function showState({ icon, title, text, grant = false }) {
  content.innerHTML = `
    <div class="state">
      <div class="state-icon">${ICONS[icon]}</div>
      <p class="state-title">${escapeHtml(title)}</p>
      <p class="state-text">${escapeHtml(text)}</p>
      ${grant ? '<button type="button" class="notice-action state-action" data-grant>Allow all sites</button>' : ''}
    </div>`;
}

function showSkeleton() {
  content.innerHTML = `<div class="grid">${'<div class="skeleton"></div>'.repeat(9)}</div>`;
}

// ——— Gallery ———

function visibleItems() {
  return filter === 'logos' ? items.filter((item) => item.isLogo) : items;
}

/** @param {ScanItem} item */
function describe(item) {
  const size =
    item.width && item.height ? formatSize({ width: item.width, height: item.height }) : '';
  return [size, formatBytes(item.bytes)].filter(Boolean).join(' · ');
}

function render() {
  const logos = items.filter((item) => item.isLogo).length;
  $('#countAll').textContent = items.length ? String(items.length) : '';
  $('#countLogos').textContent = logos ? String(logos) : '';

  const shown = visibleItems();
  downloadAll.disabled = shown.length === 0;
  $('#downloadAllLabel').textContent =
    filter === 'logos' && shown.length ? 'Download logos' : 'Download all';

  if (items.length === 0 && blocked > 0 && !allSites.checked) {
    showState({
      icon: 'lock',
      title: `${blocked} SVG${blocked === 1 ? '' : 's'} on other domains`,
      text: 'This page loads its SVGs from another domain. Allow access to grab them.',
      grant: true,
    });
    return;
  }
  if (items.length === 0) {
    showState({
      icon: 'grid',
      title: 'No SVGs on this page',
      text: 'Icons drawn with fonts or raster images can’t be grabbed as vectors.',
    });
    return;
  }
  if (shown.length === 0) {
    showState({
      icon: 'sparkle',
      title: 'No logos detected',
      text: 'Everything this page draws with SVG is under All.',
    });
    return;
  }

  const notice =
    blocked > 0 && !allSites.checked
      ? `<div class="notice">
          ${ICONS.lock}
          <p><strong>${blocked} more SVG${blocked === 1 ? ' is' : 's are'}</strong> hosted on other domains.</p>
          <button type="button" class="notice-action" data-grant>Allow</button>
        </div>`
      : '';

  // Tiles stagger in once, when results first arrive; filter switches are instant.
  const reveal = !revealed;
  revealed = true;

  content.innerHTML = `${notice}<ul class="grid"${reveal ? ' data-reveal' : ''}>${shown
    .map(
      (item, index) => `
      <li class="tile" style="--i:${index}" data-id="${item.id}" data-tone="${artworkTone(item.svg)}">
        <button class="preview" type="button" data-action="copy-svg" title="Copy ${escapeHtml(item.name)}.svg">
          <img src="${svgToDataUrl(item.svg)}" alt="" decoding="async" draggable="false" />
        </button>
        ${item.isLogo ? '<span class="badge">Logo</span>' : ''}
        <div class="actions">
          <button type="button" data-action="download-svg" title="Download SVG" aria-label="Download SVG">${ICONS.download}</button>
          <button type="button" data-action="download-png" title="Download PNG" aria-label="Download PNG">${ICONS.image}</button>
        </div>
        <div class="copied" aria-hidden="true"><span>${ICONS.check}Copied</span></div>
        <div class="tile-meta">
          <span class="tile-name" title="${escapeHtml(item.name)}.svg">${escapeHtml(item.name)}</span>
          <span class="tile-sub">${describe(item)}</span>
        </div>
      </li>`
    )
    .join('')}</ul>`;
}

/**
 * @param {string} action
 * @param {ScanItem} item
 * @param {HTMLElement} tile
 */
async function runAction(action, item, tile) {
  try {
    if (action === 'copy-svg') {
      await copyText(item.svg);
      tile.setAttribute('data-copied', '');
      setTimeout(() => tile.removeAttribute('data-copied'), 1100);
    } else if (action === 'download-svg') {
      downloadBlob(new Blob([item.svg], { type: 'image/svg+xml' }), `${item.name}.svg`);
    } else if (action === 'download-png') {
      downloadBlob(await svgToPngBlob(item.svg), `${item.name}.png`);
    }
  } catch (error) {
    console.warn('[SVG Grab Pro]', error);
    toast(
      action === 'download-png'
        ? 'Couldn’t render this SVG as a PNG.'
        : 'Couldn’t copy to the clipboard.',
      'error'
    );
  }
}

content.addEventListener('click', (event) => {
  if (/** @type {Element} */ (event.target).closest('[data-grant]')) {
    grantAllSites();
    return;
  }
  const button = /** @type {HTMLElement | null} */ (
    /** @type {Element} */ (event.target).closest('[data-action]')
  );
  const tile = /** @type {HTMLElement | null} */ (button?.closest('.tile'));
  const item = tile && items.find((candidate) => candidate.id === tile.dataset.id);
  if (button && tile && item) runAction(/** @type {string} */ (button.dataset.action), item, tile);
});

// Hovering a tile outlines that SVG on the page.
let hovered = '';
content.addEventListener('pointerover', (event) => {
  const tile = /** @type {HTMLElement | null} */ (
    /** @type {Element} */ (event.target).closest('.tile')
  );
  const id = tile?.dataset.id || '';
  if (id === hovered) return;
  hovered = id;
  const item = items.find((candidate) => candidate.id === id);
  port?.postMessage({ type: 'highlight', id, label: item ? `${item.name}.svg` : '' });
});
content.addEventListener('pointerleave', () => {
  hovered = '';
  port?.postMessage({ type: 'highlight', id: '' });
});

for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    filter = /** @type {'all' | 'logos'} */ (/** @type {HTMLElement} */ (button).dataset.filter);
    selectSegment('[data-filter]', /** @type {HTMLElement} */ (button));
    render();
  });
}

downloadAll.addEventListener('click', () => {
  const shown = visibleItems();
  const zip = createZip(shown.map((item) => ({ name: `${item.name}.svg`, content: item.svg })));
  const site = ($('#site').textContent || 'svgs').replace(/^www\./, '').trim() || 'svgs';
  downloadBlob(zip, `${site}-${filter === 'logos' ? 'logos' : 'svgs'}.zip`);
  toast(`Saved ${shown.length} SVG${shown.length === 1 ? '' : 's'}`);
});

// ——— Preview backdrop (a per-viewer preference) ———

/** @param {string} backdrop */
function applyBackdrop(backdrop) {
  const value = ['auto', 'light', 'dark'].includes(backdrop) ? backdrop : 'auto';
  root.dataset.backdrop = value;
  selectSegment('[data-backdrop]', $(`[data-backdrop="${value}"]`));
  try {
    localStorage.setItem(BACKDROP_KEY, value);
  } catch {
    // Storage unavailable; the choice just won't persist.
  }
}

try {
  applyBackdrop(localStorage.getItem(BACKDROP_KEY) || 'auto');
} catch {
  applyBackdrop('auto');
}
for (const button of document.querySelectorAll('[data-backdrop]')) {
  button.addEventListener('click', () =>
    applyBackdrop(/** @type {HTMLElement} */ (button).dataset.backdrop || 'auto')
  );
}

// ——— Theme ———

/** @type {import('../shared/theme.js').Theme} */
let theme = 'system';

function applyTheme() {
  const scheme = resolveScheme(theme);
  root.dataset.scheme = scheme;
  selectSegment('[data-theme]', $(`[data-theme="${theme}"]`));
  try {
    localStorage.setItem(SCHEME_KEY, scheme);
  } catch {
    // Storage unavailable; only the first paint is affected.
  }
  chrome.storage.local.set({ [STORAGE_KEYS.iconScheme]: scheme });
}

for (const button of document.querySelectorAll('[data-theme]')) {
  button.addEventListener('click', () => {
    theme = /** @type {import('../shared/theme.js').Theme} */ (
      /** @type {HTMLElement} */ (button).dataset.theme
    );
    chrome.storage.local.set({ [STORAGE_KEYS.theme]: theme });
    applyTheme();
  });
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// ——— All-sites access ———

// The service worker reacts to permission changes and (un)registers the content script.
async function grantAllSites() {
  allSites.checked = await chrome.permissions.request(ALL_SITES);
  if (allSites.checked && blocked > 0) scanActiveTab();
}

allSites.addEventListener('change', () => {
  if (allSites.checked) grantAllSites();
  else chrome.permissions.remove(ALL_SITES);
});

// ——— Startup ———

async function scanActiveTab(retries = 2) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let hostname = '';
  try {
    hostname = tab?.url ? new URL(tab.url).hostname : '';
  } catch {
    // Leave blank for unparseable URLs.
  }
  $('#site').textContent = hostname || 'This page';

  if (!tab?.id || !isInjectableUrl(tab.url)) {
    showState({
      icon: 'lock',
      title: 'This page is off-limits',
      text: 'Chrome doesn’t let extensions read browser pages or the Web Store. Open any website to grab its SVGs.',
    });
    return;
  }

  showSkeleton();
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js'],
    });
  } catch {
    showState({
      icon: 'alert',
      title: 'Couldn’t read this page',
      text: tab.url?.startsWith('file:')
        ? 'Turn on “Allow access to file URLs” for SVG Grab Pro in chrome://extensions.'
        : 'Reload the page and open SVG Grab Pro again.',
    });
    return;
  }

  let answered = false;
  const connection = chrome.tabs.connect(tab.id, { name: POPUP_PORT });
  port = connection;
  connection.onMessage.addListener((message) => {
    if (message.type !== 'scan') return;
    answered = true;
    items = message.items;
    blocked = message.blocked || 0;
    render();
  });
  connection.onDisconnect.addListener(() => {
    if (port === connection) port = null;
    // Another injection (e.g. right after granting access) replaced the script mid-scan.
    if (!answered && retries > 0) setTimeout(() => scanActiveTab(retries - 1), 150);
  });
  connection.postMessage({ type: 'scan' });
}

getStoredTheme().then((stored) => {
  theme = stored;
  applyTheme();
});
chrome.permissions.contains(ALL_SITES).then((granted) => {
  allSites.checked = granted;
});
scanActiveTab();
