<p align="center">
  <img src="images/dark/icon128.png" alt="SVG Grab Pro Logo" width="80" height="80">
</p>

<h1 align="center">SVG Grab Pro</h1>

<p align="center">
  <strong>Extract SVG logos from any website with a right-click</strong>
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

- **Right-click extraction** — copy or download SVG logos from any website
- **Logo detection** — scores elements by size, position, parent context, and class/ID keywords to identify logos
- **Clipboard support** — copy SVG markup for use in design tools
- **File download** — save SVGs directly to disk
- **Dark/Light mode** — choose your preferred theme
- **Privacy-first** — runs locally with minimal permissions by default

## Installation

### Chrome Web Store
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/dcojkoaanbhlnealhdcdjbcoaokkngch?utm_source=item-share-cb)
3. Confirm the installation

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/yourusername/svg-grab-pro/releases)
2. Unzip the downloaded file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the unzipped folder

## Usage

1. **Find any SVG logo** on a website
2. **Right-click** on the logo
3. **Choose "Copy" or "Download"** from the context menu

### Privacy Mode

By default, SVG Grab Pro only activates when you click the extension icon. You can enable "Run on all websites" in the popup so the extension is always active.

## How it Works

SVG Grab Pro assigns a heuristic score to each element you right-click. It checks whether the element is an `<svg>` or an `<img>` with an `.svg` source, then factors in size, aspect ratio, viewport position, parent tag (`<header>`, `<nav>`, link to `/`), and class/ID keywords like `logo` or `brand`. Elements scoring above the threshold trigger the custom context menu.

The extension works entirely locally on your machine and doesn't send any data to external servers.

## Privacy

- No tracking or analytics
- No data collection
- No external servers
- Minimal permissions by default
- All processing happens locally on your device

## Contributing

Contributions welcome — open a Pull Request.

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
