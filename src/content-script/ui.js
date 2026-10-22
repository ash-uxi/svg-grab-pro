import { svgToDataUrl } from '../lib/svg-url.js';
import { ICONS } from '../shared/icons.js';
import { UI_STYLES } from './ui-styles.js';

/** @typedef {'copy-svg' | 'download-svg'} MenuAction */

/** @type {{ id: MenuAction; label: string; icon: string }[]} */
const MENU_ITEMS = [
  { id: 'copy-svg', label: 'Copy SVG', icon: ICONS.copy },
  { id: 'download-svg', label: 'Download SVG', icon: ICONS.download },
];

const HOST_STYLE = [
  'all: initial',
  'position: fixed',
  'inset: 0 auto auto 0',
  'width: 0',
  'height: 0',
  'margin: 0',
  'padding: 0',
  'border: 0',
  'overflow: visible',
  'background: transparent',
  'display: block',
  'z-index: 2147483647',
  'pointer-events: none',
]
  .map((rule) => `${rule} !important`)
  .join(';');

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Show untrusted SVG markup as an image: SVG-as-image can't run script, follow links or load
 * anything, unlike inline SVG in the page's DOM. A page CSP that blocks data: images gets a
 * generic icon instead.
 * @param {HTMLElement} container
 * @param {string} svgText
 */
function renderThumbnail(container, svgText) {
  const image = new Image();
  image.alt = '';
  image.onload = () => {
    container.removeAttribute('data-loading');
    container.replaceChildren(image);
  };
  image.onerror = () => {
    container.removeAttribute('data-loading');
    container.innerHTML = ICONS.image;
  };
  image.src = svgToDataUrl(svgText);
}

/**
 * The in-page UI: context menu, element highlight and toast, in a closed shadow root.
 */
export function createUi() {
  const host = document.createElement('svg-grab-pro');
  host.setAttribute('style', HOST_STYLE);
  const supportsPopover = 'popover' in HTMLElement.prototype;
  if (supportsPopover) host.setAttribute('popover', 'manual');
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>${UI_STYLES}</style>`;

  let destroyed = false;

  /** Attach to the page and float above everything, including modal dialogs (top layer). */
  function mount() {
    if (destroyed) return;
    if (!host.isConnected) document.documentElement.appendChild(host);
    if (!supportsPopover) return;
    try {
      if (host.matches(':popover-open')) host.hidePopover();
      host.showPopover();
    } catch {
      // Not fatal: the max z-index still covers almost everything.
    }
  }

  // ——— Menu ———

  /** @type {{ el: HTMLElement; items: HTMLElement[]; active: number; onPick: (action: MenuAction) => void; onClose: () => void; restoreFocus: Element | null } | null} */
  let menu = null;

  /** @param {number} index */
  function setActive(index) {
    if (!menu) return;
    menu.active = index;
    menu.items.forEach((item, i) => item.toggleAttribute('data-active', i === index));
    menu.items[index]?.focus({ preventScroll: true });
  }

  /** @param {MenuAction} action */
  function pick(action) {
    const onPick = menu?.onPick;
    hideMenu();
    onPick?.(action);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {{ onPick: (action: MenuAction) => void; onClose: () => void }} handlers
   */
  function showMenu(x, y, { onPick, onClose }) {
    hideMenu(true);

    const el = document.createElement('div');
    el.className = 'surface menu';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', 'SVG Grab Pro');
    el.tabIndex = -1;
    el.innerHTML = `
      <div class="head">
        <div class="thumb" data-loading></div>
        <div class="meta"><div class="name"></div><div class="sub"></div></div>
      </div>
      <div class="sep"></div>
      ${MENU_ITEMS.map(
        (item) =>
          `<button class="item" role="menuitem" tabindex="-1" data-action="${item.id}">${item.icon}<span>${item.label}</span></button>`
      ).join('')}`;

    const items = /** @type {HTMLElement[]} */ ([...el.querySelectorAll('.item')]);
    el.addEventListener('pointermove', (event) => {
      const item = /** @type {Element} */ (event.target).closest('.item');
      if (item) setActive(items.indexOf(/** @type {HTMLElement} */ (item)));
    });
    el.addEventListener('pointerleave', () => setActive(-1));
    el.addEventListener('click', (event) => {
      const item = /** @type {HTMLElement | null} */ (
        /** @type {Element} */ (event.target).closest('.item')
      );
      if (item) pick(/** @type {MenuAction} */ (item.dataset.action));
    });
    el.addEventListener('contextmenu', (event) => event.preventDefault());

    root.appendChild(el);
    mount();

    const { width, height } = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, innerWidth - width - 8));
    const flipUp = y + height > innerHeight - 8 && y - height >= 8;
    const top = flipUp ? y - height : Math.max(8, Math.min(y, innerHeight - height - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.transformOrigin = `${x - left}px ${flipUp ? '100%' : `${y - top}px`}`;

    menu = { el, items, active: -1, onPick, onClose, restoreFocus: document.activeElement };
    el.focus({ preventScroll: true });
    requestAnimationFrame(() => el.setAttribute('data-open', ''));

    const current = menu;
    return {
      /** @param {{ name: string; sub: string; badge?: string; svg?: string; error?: boolean }} meta */
      setMeta({ name, sub, badge, svg, error }) {
        if (menu !== current) return;
        const nameEl = /** @type {HTMLElement} */ (el.querySelector('.name'));
        const subEl = /** @type {HTMLElement} */ (el.querySelector('.sub'));
        const thumb = /** @type {HTMLElement} */ (el.querySelector('.thumb'));
        nameEl.textContent = name;
        nameEl.title = name;
        subEl.innerHTML = `${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ''}${escapeHtml(sub)}`;
        subEl.title = sub;
        if (svg) renderThumbnail(thumb, svg);
        if (error) {
          thumb.removeAttribute('data-loading');
          thumb.innerHTML = ICONS.alert;
          el.setAttribute('data-error', '');
        }
      },
    };
  }

  function hideMenu(immediate = false) {
    if (!menu) return;
    const { el, onClose, restoreFocus } = menu;
    menu = null;
    onClose();
    if (restoreFocus instanceof HTMLElement || restoreFocus instanceof SVGElement) {
      restoreFocus.focus({ preventScroll: true });
    }
    if (immediate) {
      el.remove();
      return;
    }
    el.removeAttribute('data-open');
    el.setAttribute('data-closing', '');
    setTimeout(() => el.remove(), 100);
  }

  /**
   * Keyboard handling while the menu is open. Returns true when the key was used.
   * @param {KeyboardEvent} event
   */
  function handleMenuKey(event) {
    if (!menu) return false;
    const { items, active } = menu;
    switch (event.key) {
      case 'Escape':
        hideMenu();
        return true;
      case 'ArrowDown':
      case 'Tab':
        setActive(
          event.key === 'Tab' && event.shiftKey
            ? (active - 1 + items.length) % items.length
            : (active + 1) % items.length
        );
        return true;
      case 'ArrowUp':
        setActive(active <= 0 ? items.length - 1 : active - 1);
        return true;
      case 'Home':
        setActive(0);
        return true;
      case 'End':
        setActive(items.length - 1);
        return true;
      case 'Enter':
      case ' ':
        if (active >= 0) pick(/** @type {MenuAction} */ (items[active].dataset.action));
        return true;
    }
    return false;
  }

  // ——— Highlight ———

  /** @type {HTMLElement | null} */
  let ring = null;

  /**
   * Outline the element that will be grabbed.
   * @param {Element} target
   * @param {string} [label]
   */
  function highlight(target, label = '') {
    const rect = target.getBoundingClientRect();
    const visible =
      rect.width > 0 &&
      rect.bottom > 0 &&
      rect.top < innerHeight &&
      rect.right > 0 &&
      rect.left < innerWidth;
    if (!visible) {
      clearHighlight();
      return;
    }
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'ring';
      ring.innerHTML = '<div class="ring-label"></div>';
      root.appendChild(ring);
    }
    mount();
    const pad = 3;
    Object.assign(ring.style, {
      left: `${rect.left - pad}px`,
      top: `${rect.top - pad}px`,
      width: `${rect.width + pad * 2}px`,
      height: `${rect.height + pad * 2}px`,
    });
    ring.toggleAttribute('data-below', rect.top < 36);
    /** @type {HTMLElement} */ (ring.firstElementChild).textContent = label;
    const el = ring;
    requestAnimationFrame(() => el.setAttribute('data-open', ''));
  }

  function clearHighlight() {
    ring?.removeAttribute('data-open');
  }

  // ——— Toast ———

  /** @type {HTMLElement | null} */
  let toastEl = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let toastTimer;

  /**
   * @param {string} message
   * @param {'success' | 'error' | 'pending'} [tone]
   */
  function toast(message, tone = 'success') {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'surface toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      toastEl.innerHTML = '<div class="toast-icon"></div><div class="toast-text"></div>';
      root.appendChild(toastEl);
    }
    mount();
    const el = toastEl;
    el.dataset.tone = tone;
    const icon = /** @type {HTMLElement} */ (el.firstElementChild);
    icon.innerHTML = tone === 'success' ? ICONS.check : tone === 'error' ? ICONS.alert : '';
    // Replay the pop each time a result lands (keyframes restart once the attribute is re-added).
    icon.removeAttribute('data-pop');
    if (tone !== 'pending') {
      void icon.offsetWidth;
      icon.setAttribute('data-pop', '');
    }
    /** @type {HTMLElement} */ (el.lastElementChild).textContent = message;
    requestAnimationFrame(() => el.setAttribute('data-open', ''));

    clearTimeout(toastTimer);
    if (tone !== 'pending') {
      toastTimer = setTimeout(
        () => el.removeAttribute('data-open'),
        tone === 'error' ? 4500 : 2200
      );
    }
  }

  return {
    showMenu,
    hideMenu,
    handleMenuKey,
    get isMenuOpen() {
      return menu !== null;
    },
    highlight,
    clearHighlight,
    toast,
    /** @param {'light' | 'dark'} scheme */
    setScheme(scheme) {
      host.dataset.scheme = scheme;
    },
    /** @param {EventTarget | null} node */
    contains(node) {
      return node === host;
    },
    destroy() {
      destroyed = true;
      hideMenu(true);
      clearTimeout(toastTimer);
      host.remove();
    },
  };
}
