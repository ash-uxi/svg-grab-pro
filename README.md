<div align="center">
  
# ✨ SVG Grab Pro ✨

**The easiest way to extract SVG logos from any website**

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/placeholder.svg?style=flat-square)](https://chrome.google.com/webstore/detail/placeholder)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/placeholder.svg?style=flat-square)](https://chrome.google.com/webstore/detail/placeholder)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

<img src="https://raw.githubusercontent.com/ash-uxi/svg-grab-pro/main/images/icon128.png" width="128" height="128" alt="SVG Grab Pro Logo">

**Copy and download SVG logos with a simple right-click**

[✨ Install](#installation) • [🚀 Features](#features) • [🔍 How It Works](#how-it-works) • [🛠️ Tech Stack](#tech-stack)

</div>

---

## 🌟 Overview

**SVG Grab Pro** is a lightweight Chrome extension that makes it incredibly easy to extract SVG logos and icons from any website. Simply right-click on an SVG element, and a sleek custom menu appears, allowing you to copy or download the SVG with a single click.

<div align="center">
  <img src="https://raw.githubusercontent.com/ash-uxi/svg-grab-pro/main/images/screenshot.png" width="600" alt="SVG Grab Pro in action">
</div>

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Smart Logo Detection** | Automatically identifies logos and icons on websites |
| 🔍 **Right-Click Menu** | Elegant custom context menu for SVG elements |
| 📋 **Copy to Clipboard** | Instantly copy complete SVG code with all styles preserved |
| 💾 **One-Click Download** | Save SVGs directly to your computer with proper formatting |
| 🌓 **Dark & Light Themes** | Adapts to your preferred browser theme |
| 📱 **Touch-Friendly** | Works great on touch-enabled devices |

## 🚀 Installation

<details>
<summary>📦 From Chrome Web Store (Recommended)</summary>

1. Visit the [SVG Grab Pro page](https://chrome.google.com/webstore/detail/placeholder) on Chrome Web Store
2. Click "Add to Chrome"
3. Confirm by clicking "Add extension"

</details>

<details>
<summary>💻 Manual Installation (Developer Mode)</summary>

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked" and select the extension directory
5. SVG Grab Pro is now installed and ready to use!

</details>

## 🔍 How It Works

SVG Grab Pro uses a sophisticated scoring system to identify SVG logos on websites:

1. **Find an SVG**: Browse to any website with SVG logos or icons
2. **Right-click**: When you right-click on an SVG, our extension analyzes it 
3. **Use the menu**: If it's detected as a logo, our custom menu appears
4. **Copy or Download**: Choose your preferred action
5. **Instant results**: The SVG is ready to use in your projects!

```js
// SVG detection example (simplified)
function isLikelyLogo(element) {
  let score = 0;
  
  // Base score for being an SVG
  if (element.tagName.toLowerCase() === 'svg') {
    score += 15;
    
    // Check size, position, parent elements, etc.
    // ... more detection logic ...
    
    // Consider it a logo if score is high enough
    return score >= 40;
  }
  
  return false;
}
```

## 🛠️ Tech Stack

- **JavaScript**: Vanilla JS for maximum performance
- **Chrome Extension API**: Built on Manifest V3
- **Modern CSS**: Clean, adaptive styling with CSS variables
- **SVG Processing**: Smart extraction with style preservation

## 🔮 Future Enhancements

<details>
<summary>Click to see what's coming next!</summary>

- [ ] Background image SVG extraction
- [ ] Preview before copying/downloading
- [ ] Custom filename for downloads
- [ ] SVG to PNG conversion option
- [ ] Batch extraction of multiple SVGs
- [ ] Extension settings page
- [ ] Keyboard shortcuts

</details>

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs 🐛
- Suggest features ✨
- Submit pull requests 🚀

Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a PR.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- Beautiful icons from [Pika Icons](https://pikaicons.com/) 
- Built with ❤️ by [Ashish Kashyap](https://github.com/ash-uxi)

---

<div align="center">
  <p>If you find SVG Grab Pro useful, please consider giving it a ⭐ on GitHub!</p>
  <p>
    <a href="https://twitter.com/Ash_uxi">Twitter</a> •
    <a href="https://github.com/ash-uxi">GitHub</a> •
    <a href="https://x.com/Ash_uxi">X (Twitter)</a>
  </p>
</div>