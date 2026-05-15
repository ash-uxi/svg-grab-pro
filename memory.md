# Project Memory

- This repo is a Chrome MV3 extension named SVG Grab Pro.
- The main extraction behavior lives in `contentScript.js`; popup settings live in `popup.html`, `popup.js`, and `styles.css`.
- Logo detection should prefer explicit logo/brand signals, homepage links, and header context while avoiding common UI/social icons.
