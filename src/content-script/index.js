import { findTargetAtPoint } from '../lib/locate.js';
import { LOGO_SCORE_THRESHOLD, scoreLogo } from '../lib/logo-detection.js';
import { suggestName } from '../lib/naming.js';
import { getSvgSize } from '../lib/parse-svg.js';
import { POPUP_PORT, STORAGE_KEYS } from '../shared/constants.js';
import { byteLength, formatBytes, formatSize } from '../shared/format.js';
import { getStoredTheme, isValidTheme, resolveScheme } from '../shared/theme.js';
import { runAction } from './actions.js';
import { GrabError, resolveTarget } from './resolve.js';
import { scanPage } from './scan.js';
import { createUi } from './ui.js';

/**
 * Re-injection (popup opens, extension updates) replaces any earlier instance. A DOM event
 * reaches instances in stale isolated worlds that a global flag would miss.
 */
const TEARDOWN_EVENT = 'svg-grab-pro:teardown';
document.dispatchEvent(new Event(TEARDOWN_EVENT));
start();

/** @param {EventTarget} node */
function isEditable(node) {
  const el = /** @type {Element} */ (node);
  return !!el.closest?.(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
  );
}

/** The user right-clicked inside a text selection, so they probably want to copy text. */
function isInSelection(/** @type {Node} */ node) {
  const selection = getSelection();
  return !!selection && !selection.isCollapsed && selection.containsNode(node, true);
}

function start() {
  const abort = new AbortController();
  const { signal } = abort;
  const ui = createUi();
  /** @type {import('../shared/theme.js').Theme} */
  let theme = 'system';
  let enabled = true;
  /** @type {Map<string, Element>} */
  let scanned = new Map();
  /** @type {Set<chrome.runtime.Port>} */
  const ports = new Set();

  const applyTheme = () => ui.setScheme(resolveScheme(theme));
  getStoredTheme().then((stored) => {
    theme = stored;
    applyTheme();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme, { signal });

  /** @param {MouseEvent} event */
  function onContextMenu(event) {
    // The extension was reloaded, disabled or removed: this copy is orphaned, so step aside.
    if (!chrome.runtime?.id) {
      destroy();
      return;
    }
    if (ui.contains(event.target)) {
      event.preventDefault();
      return;
    }
    const path = event.composedPath();
    const origin = /** @type {Node} */ (path[0]);
    if (!enabled || event.shiftKey || !origin || isEditable(origin) || isInSelection(origin)) {
      ui.hideMenu();
      return;
    }
    const target = findTargetAtPoint({ path, x: event.clientX, y: event.clientY, doc: document });
    if (!target) {
      ui.hideMenu();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    openMenu(target, event.clientX, event.clientY);
  }

  /**
   * @param {import('../lib/locate.js').SvgTarget} target
   * @param {number} x
   * @param {number} y
   */
  function openMenu(target, x, y) {
    const { element } = target;
    const isLogo =
      scoreLogo(element, { pageUrl: location.href, viewportWidth: innerWidth, scrollY }) >=
      LOGO_SCORE_THRESHOLD;
    const name = suggestName(element, {
      url: target.kind === 'url' ? target.url : undefined,
      hostname: location.hostname,
      isLogo,
    });
    const badge = isLogo ? 'Logo' : '';
    const svg = resolveTarget(target);
    svg.catch(() => {}); // Reported when an action runs.

    ui.highlight(element);
    const menu = ui.showMenu(x, y, {
      onPick: (action) => runAction(action, { svg, name, ui }),
      onClose: () => ui.clearHighlight(),
    });
    menu.setMeta({
      name: `${name}.svg`,
      badge,
      sub: target.kind === 'url' ? 'Fetching…' : 'Reading…',
    });
    svg.then(
      (markup) => {
        const details = [formatSize(getSvgSize(markup)), formatBytes(byteLength(markup))].filter(
          Boolean
        );
        menu.setMeta({ name: `${name}.svg`, badge, sub: details.join(' · '), svg: markup });
      },
      (error) =>
        menu.setMeta({
          name: `${name}.svg`,
          badge,
          sub:
            error instanceof GrabError && error.code === 'no-access'
              ? 'Needs “All sites” access'
              : 'Couldn’t read this SVG',
          error: true,
        })
    );
  }

  const closeMenu = () => ui.hideMenu();
  window.addEventListener('contextmenu', onContextMenu, { capture: true, signal });
  window.addEventListener(
    'pointerdown',
    (event) => {
      if (ui.isMenuOpen && !ui.contains(event.target)) ui.hideMenu();
    },
    { capture: true, signal }
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (ui.handleMenuKey(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { capture: true, signal }
  );
  window.addEventListener('scroll', closeMenu, { capture: true, passive: true, signal });
  window.addEventListener('resize', closeMenu, { signal });
  window.addEventListener('blur', closeMenu, { signal });

  /** @param {chrome.runtime.Port} port */
  function onConnect(port) {
    if (port.name !== POPUP_PORT) return;
    enabled = true;
    ports.add(port);
    const post = (/** @type {unknown} */ message) => {
      try {
        port.postMessage(message);
      } catch {
        // Popup closed mid-scan.
      }
    };
    port.onMessage.addListener(async (message) => {
      if (message.type === 'scan') {
        const { items, elements, blocked } = await scanPage();
        scanned = elements;
        post({ type: 'scan', items, blocked });
      } else if (message.type === 'highlight') {
        const element = scanned.get(message.id);
        if (element) ui.highlight(element, message.label);
        else ui.clearHighlight();
      }
    });
    port.onDisconnect.addListener(() => {
      ports.delete(port);
      ui.clearHighlight();
    });
  }

  /** @param {{ [key: string]: chrome.storage.StorageChange }} changes */
  function onStorageChanged(changes, /** @type {string} */ area) {
    if (area !== 'local') return;
    const themeChange = changes[STORAGE_KEYS.theme];
    if (themeChange && isValidTheme(themeChange.newValue)) {
      theme = themeChange.newValue;
      applyTheme();
    }
    const allSites = changes[STORAGE_KEYS.allSitesEnabled];
    if (allSites) {
      enabled = allSites.newValue === true;
      if (!enabled) ui.hideMenu();
    }
  }

  chrome.runtime.onConnect.addListener(onConnect);
  chrome.storage.onChanged.addListener(onStorageChanged);

  function destroy() {
    abort.abort();
    ui.destroy();
    try {
      // Closing ports tells an open popup to reconnect to the replacement instance.
      for (const port of ports) port.disconnect();
      chrome.runtime.onConnect.removeListener(onConnect);
      chrome.storage.onChanged.removeListener(onStorageChanged);
    } catch {
      // The extension context is already gone (extension reloaded).
    }
  }

  document.addEventListener(TEARDOWN_EVENT, destroy, { once: true, signal });
}
