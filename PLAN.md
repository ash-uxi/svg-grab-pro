# SVG Grab Pro - Improvement Plan

## Overview
After a thorough review of the codebase, here are the identified issues and proposed improvements, organized by priority.

---

## P0: Bugs & Correctness

### 1. `action.onClicked` listener is dead code
**File:** `background.js:136`
**Problem:** `chrome.action.onClicked` never fires because `manifest.json` defines `default_popup`. When a popup is configured, Chrome opens the popup on click and swallows the `onClicked` event.
**Fix:** Remove the dead `onClicked` listener entirely.

### 2. `web_accessible_resources` unnecessarily exposes `popup.js`
**File:** `manifest.json:32-36`
**Problem:** `popup.js` is exposed to `<all_urls>`, but it's only used inside the popup — never accessed by web pages. This is a minor security surface (any website can load and inspect `popup.js`).
**Fix:** Remove the `web_accessible_resources` block entirely.

### 3. Content script pollutes host page's `localStorage`
**Files:** `contentScript.js:93, 97, 113, 124`
**Problem:** The content script writes `svgGrabProTheme` and `svgGrabProAllSitesEnabled` into the visited website's `localStorage`. This pollutes the site's storage and is visible to the site's own JavaScript.
**Fix:** Remove all `localStorage` reads/writes from `contentScript.js`. Use only `chrome.storage.local` for cross-context state, which is already available and used.

### 4. Missing LICENSE file
**File:** `README.md:84`
**Problem:** README links to a `LICENSE` file that doesn't exist.
**Fix:** Add an MIT LICENSE file.

### 5. Broken manual install URL in README
**File:** `README.md:40`
**Problem:** Points to `https://github.com/yourusername/svg-grab-pro/releases` — a template URL.
**Fix:** Update to `https://github.com/ash-uxi/svg-grab-pro/releases`.

---

## P1: Code Quality & Maintainability

### 6. Remove `console.log` statements from production code
**Files:** `contentScript.js:585`, `popup.js:59,172,173,183`
**Problem:** Debug logging left in production code. The logo detection score log on every right-click is especially noisy.
**Fix:** Remove all `console.log` calls (keep `console.error` for actual errors).

### 7. Remove unnecessary 60-second polling interval
**File:** `background.js:222`
**Problem:** `setInterval(syncPermissionState, 60000)` polls permission state every minute. This is redundant because permission changes are already handled via `chrome.runtime.onMessage` and `chrome.storage.onChanged` listeners.
**Fix:** Remove the `setInterval` call. Keep the `syncPermissionState()` calls on install and on explicit permission change messages.

### 8. Eliminate massive CSS duplication between `popup.html` and `styles.css`
**Files:** `popup.html:9-246`, `styles.css`
**Problem:** ~246 lines of inline `<style>` in `popup.html` duplicate nearly everything in `styles.css` (slider, layout, theme toggle, footer, instructions). The inline styles override the external stylesheet, making `styles.css` partially dead code.
**Fix:** Remove the inline `<style>` block from `popup.html` and consolidate all styles into `styles.css`. Keep only truly critical sizing (body width/height) inline if needed for popup rendering.

### 9. Fix duplicate `--card-shadow` CSS variable definition
**File:** `styles.css:33-36, 45-46`
**Problem:** `--card-shadow` is defined twice in `:root` — the second definition silently overrides the first.
**Fix:** Remove the first definition (lines 33-36) and keep only the intended one.

### 10. Simplify theme storage — remove triple-storage redundancy
**Files:** `contentScript.js`, `popup.js`, `background.js`
**Problem:** Theme is stored in three places simultaneously: `chrome.storage.local`, `localStorage`, and communicated via runtime messages. This creates sync complexity and bugs.
**Fix:** Use `chrome.storage.local` as the single source of truth. Remove all `localStorage` usage for theme. The `chrome.storage.onChanged` listener already propagates changes to all contexts.

### 11. Reduce code duplication in `copySvgToClipboard()` and `downloadSvg()`
**File:** `contentScript.js:685-800`
**Problem:** Both functions have nearly identical promise-handling boilerplate (`instanceof Promise` check, duplicate error handling). The synchronous path in `downloadSvg` also doesn't attempt to derive a filename.
**Fix:** Refactor `getSvgContent()` to always return a Promise (wrap sync return in `Promise.resolve()`). Then both consumers can use a single `.then()` chain without the `instanceof Promise` branching.

### 12. Event listener leak in `applyThemeToContextMenu()`
**File:** `contentScript.js:191-196`
**Problem:** Every call to `applyThemeToContextMenu()` adds new `mouseover`/`mouseout` event listeners to menu options without removing old ones. This accumulates listeners on every theme change.
**Fix:** Use CSS `:hover` rules (already partially done) instead of JS event listeners, or add listeners only once during menu creation.

---

## P2: Security

### 13. Add SVG sanitization before copy/download
**File:** `contentScript.js:803-906`
**Problem:** Extracted SVGs are passed through without sanitization. A malicious SVG could contain `<script>` tags, `onload` handlers, or external entity references.
**Fix:** Strip `<script>` elements, event handler attributes (`on*`), and `<foreignObject>` elements from SVG content before copying/downloading. This can be done with a simple DOM-based sanitizer (parse into a temporary DOM, remove dangerous nodes, serialize back).

---

## P3: Feature Improvements

### 14. Support SVGs inside Shadow DOM
**File:** `contentScript.js:592-635`
**Problem:** `findSvgElement()` uses `element.querySelector('svg')` which doesn't pierce Shadow DOM boundaries. Many modern web components (e.g., Lit, Stencil) render SVG logos inside shadow roots.
**Fix:** Add shadow root traversal in `findSvgElement()` — check `element.shadowRoot` and recurse into it.

### 15. Support `background-image: url(*.svg)` detection
**File:** `contentScript.js:592-635`
**Problem:** SVG logos rendered via CSS `background-image` are invisible to the current detection logic, which only checks element tags and `src` attributes.
**Fix:** In `findSvgElement()`, check `getComputedStyle(element).backgroundImage` for `.svg` URLs and treat them as fetchable SVG sources.

### 16. Add keyboard shortcut support
**Problem:** The extension only works via right-click. Power users would benefit from a keyboard shortcut (e.g., `Ctrl+Shift+S`) to activate SVG detection mode.
**Fix:** Add a `commands` entry in `manifest.json` and handle it in `background.js`.

---

## Implementation Order

I recommend implementing in this order:
1. **P0 items (1-5)** — Fix bugs and correctness issues first
2. **P1 items (6-12)** — Clean up code quality
3. **P2 item (13)** — Add security hardening
4. **P3 items (14-16)** — Feature improvements

Each priority group would be a separate PR for easier review.
