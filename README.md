<p align="center">
  <img src="images/dark/icon128.png" alt="SVG Grab Pro Logo" width="80" height="80">
</p>

<h1 align="center">SVG Grab Pro</h1>

<p align="center">
  <strong>Easily extract SVG logos from any website with just a right-click</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#how-it-works">How it Works</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://camo.githubusercontent.com/6763601a2819682ca26903c249ac2a63384820a914914de232bd6a390dbcad46/68747470733a2f2f3178316a7774623062782e7566732e73682f662f5639344a41566d47634935504645373463495a4e7172616963485168343067707a46546f364f426256386c5078326d37" alt="SVG Grab Pro Screenshot" width="400">
</p>

## Features

✨ **Right-click any SVG** - Copy or download it straight from the page  
🖼️ **Every SVG on the page** - Open the popup to browse them all, logos first, and download everything as a .zip  
🔍 **Finds what others miss** - Inline SVGs, SVG images, CSS backgrounds and masks, sprites, shadow DOM, and SVGs hidden under overlays  
🎯 **Copies that actually work** - Styles from the page's CSS, `currentColor`, and shared gradients/sprites are baked in, so pastes render the same in Figma or your editor  
🌓 **System, light or dark** - Follows your OS by default  
🔒 **Privacy-focused** - Runs locally, no tracking, no remote fonts, minimal permissions by default

## Installation

### Chrome Web Store

1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/dcojkoaanbhlnealhdcdjbcoaokkngch?utm_source=item-share-cb)
2. Confirm the installation

### Firefox Add-ons

Firefox 140 or later. Install it from Firefox Add-ons (link coming with the first listed release).

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/yourusername/svg-grab-pro/releases)
2. Unzip the downloaded file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the unzipped folder

## Usage

### Right-click

1. **Right-click any SVG** on a website (logos, icons, illustrations)
2. **Choose** Copy SVG or Download SVG

Hold **Shift** while right-clicking to get the browser's normal menu.

### Popup

Click the toolbar icon (or press `Alt+Shift+S`) to see every SVG on the current page. Click a tile to copy it, hover for SVG/PNG downloads, and hover any tile to outline it on the page. **Download all** saves a .zip.

### All sites

By default SVG Grab Pro only runs on a tab after you open its popup there. Turn on **All sites** to right-click SVGs on any page without opening the popup first; this also lets it fetch SVG files hosted on other domains (CDNs) that the page's own CORS rules would block.

## How it Works

- **Finding the SVG**: right-clicks look at the element under the cursor, small wrappers that paint an SVG with CSS (`background-image`, `mask-image`, `::before`), and elements stacked beneath transparent overlays, including inside open shadow roots. Big containers and text selections are left to the browser's menu.
- **Making it standalone**: inline SVGs are cloned with their computed styles written back as attributes (only where they differ from what's inherited), `<use>` sprites and `url(#…)` gradients, clips and masks from elsewhere on the page (or from external sprite files) are pulled into `<defs>`, and page noise (`class`, `data-*`, `aria-*`, event handlers) is stripped. The root gets an explicit `viewBox` and size.
- **Logos**: a heuristic scores elements by labels, header placement, home links and size, so the popup can rank logos first and files get names like `github-logo.svg`.

## Privacy

We take your privacy seriously:

- No tracking or analytics
- No data collection
- No external servers
- Minimal permissions by default
- All processing happens locally on your device

## Development

```bash
npm install
npm test             # unit tests (vitest + jsdom)
npm run build        # bundles src/ into contentScript.js, background.js and popup.js
npm run package      # stages dist/extension, zips it for both stores, plus a sources zip for AMO
npm run lint:firefox # Mozilla's add-on linter on dist/extension (run package first)
npm run e2e          # smoke test in real Chrome and Firefox (npx puppeteer browsers install firefox once)
npm run firefox      # open the extension in a temporary Firefox profile
npm run verify       # everything CI runs except e2e
```

Load the folder as an unpacked extension in `chrome://extensions` after building.

### One codebase, Chrome and Firefox

The same zip ships to both stores. `manifest.json` lists both `background.service_worker` (Chrome) and `background.scripts` (Firefox) plus `browser_specific_settings.gecko`, and the code only calls `chrome.*`. See the cross-browser rules in [CLAUDE.md](CLAUDE.md); ESLint enforces the common ones. Every pull request runs lint, unit tests, Mozilla's linter and the smoke test in both browsers.

### Releasing

Run **Actions → Release → Run workflow**. It re-runs CI, tags a date version such as `26.10.23` (only if there are new commits), stamps it into the packaged manifest, creates a GitHub Release with the zips, and submits to the Chrome Web Store and Firefox Add-ons. Tick **Dry run** to check store credentials without releasing.

The workflow needs these secrets in a `stores` environment: `CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`, `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`, `FIREFOX_JWT_ISSUER` and `FIREFOX_JWT_SECRET`. `npx publish-extension init` walks through creating them.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Built with ♥ by [Ashuxi](https://x.com/Ash_uxi)

---

<p align="center">
  <sub>SVG Grab Pro is not affiliated with any website or company whose logos you may extract.</sub>
</p>
