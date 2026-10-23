# SVG Grab Pro

One codebase ships to Chrome and Firefox from the same zip. Develop and test in Chrome; CI checks Firefox.

## Cross-browser rules

- Call `chrome.*` with promises, never `browser.*`, and add no polyfill. Firefox MV3 supports `chrome.*`.
- Detect features (`chrome.foo?.bar`), not browsers. No `navigator.userAgent` checks.
- Avoid Chrome-only APIs (`offscreen`, `sidePanel`, `tabGroups`, …). ESLint blocks the common ones.
- Don't add install-time permissions. A new one disables the extension for existing Chrome users until they approve it.
- `manifest.json` serves both browsers: keep both `background.service_worker` and `background.scripts`, and `browser_specific_settings.gecko`.
- Before pushing, run `npm run verify` (includes Mozilla's `web-ext lint`) and `npm run e2e` (smoke test in Chrome and Firefox).

## Releasing

Run the **Release** workflow in GitHub Actions. It stamps a date version (e.g. `26.10.23`) into the packaged manifest only, creates a GitHub Release, and submits to both stores. Never bump `version` in `manifest.json` by hand.
