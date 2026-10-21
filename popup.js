(() => {
  // src/lib/parse-svg.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  var EMBED_RE = /<svg[\s>][\s\S]*<\/svg\s*>/i;
  function sanitizeSvg(root2) {
    for (const el of root2.querySelectorAll("script, iframe, object, embed, form")) el.remove();
    for (const el of [root2, ...root2.querySelectorAll("*")]) {
      for (const { name, value } of [...el.attributes]) {
        const compact = value.replace(/[\s\u0000-\u001f]/g, "").toLowerCase();
        const isScriptUrl = /^(javascript|vbscript):/.test(compact);
        if (name.toLowerCase().startsWith("on") || isScriptUrl) el.removeAttribute(name);
      }
    }
    return root2;
  }
  function parseSvgText(text) {
    if (!text || typeof text !== "string" || !/<svg[\s>]/i.test(text)) return null;
    const parser = new DOMParser();
    const embedded = EMBED_RE.exec(text)?.[0];
    const namespaced = embedded && !/^<svg[^>]*\sxmlns=/i.test(embedded) && embedded.replace(/^<svg/i, `<svg xmlns="${SVG_NS}"`);
    for (const candidate of [text, embedded, namespaced]) {
      if (!candidate) continue;
      const doc = parser.parseFromString(candidate, "image/svg+xml");
      const root2 = doc.documentElement;
      if (!doc.querySelector("parsererror") && root2?.localName === "svg" && root2.namespaceURI === SVG_NS) {
        return (
          /** @type {SVGSVGElement} */
          sanitizeSvg(root2)
        );
      }
    }
    return null;
  }
  function toPixels(value) {
    if (!value) return null;
    const match = /^\s*([\d.]+)\s*(px)?\s*$/i.exec(value);
    const number = match ? Number(match[1]) : NaN;
    return Number.isFinite(number) && number > 0 ? number : null;
  }
  function getSvgSize(source) {
    const root2 = typeof source === "string" ? parseSvgText(source) : source;
    if (!root2) return null;
    const box = (root2.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    const hasBox = box.length === 4 && box[2] > 0 && box[3] > 0;
    let width = toPixels(root2.getAttribute("width"));
    let height = toPixels(root2.getAttribute("height"));
    if (hasBox) {
      const ratio = box[2] / box[3];
      if (width && !height) height = width / ratio;
      if (height && !width) width = height * ratio;
      if (!width && !height) [width, height] = [box[2], box[3]];
    }
    return width && height ? { width, height } : null;
  }

  // src/lib/svg-url.js
  function svgToDataUrl(svgText) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  // src/lib/rasterize.js
  var MIN_LONG_SIDE = 512;
  var MAX_LONG_SIDE = 4096;
  async function svgToPngBlob(svgText) {
    const size = getSvgSize(svgText) ?? { width: 300, height: 150 };
    const longSide = Math.max(size.width, size.height);
    const scale = Math.min(MAX_LONG_SIDE, Math.max(MIN_LONG_SIDE, longSide * 2)) / longSide;
    const width = Math.max(1, Math.round(size.width * scale));
    const height = Math.max(1, Math.round(size.height * scale));
    const image = new Image(width, height);
    image.src = svgToDataUrl(svgText);
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(image, 0, 0, width, height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")),
        "image/png"
      );
    });
  }

  // src/lib/tone.js
  var COLOR_RE = /(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|white|black)/gi;
  function luminance(color) {
    let rgb;
    const value = color.toLowerCase();
    if (value === "white") rgb = [255, 255, 255];
    else if (value === "black") rgb = [0, 0, 0];
    else if (value.startsWith("#")) {
      const hex = value.length <= 5 ? [...value.slice(1, 4)].map((c) => c + c).join("") : value.slice(1, 7);
      if (value.length === 5 || value.length === 9) {
        const alpha = parseInt(value.length === 5 ? value[4] + value[4] : value.slice(7, 9), 16);
        if (alpha < 32) return null;
      }
      rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    } else {
      const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
      if (parts.length < 3 || parts.length > 3 && parts[3] < 0.125) return null;
      rgb = parts.slice(0, 3);
    }
    const [r, g, b] = rgb.map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function artworkTone(svgText) {
    const values = [...svgText.matchAll(COLOR_RE)].map((match) => luminance(match[1])).filter((value) => value !== null);
    if (values.length === 0) return "dark";
    if (values.every((value) => value > 0.7)) return "light";
    if (values.every((value) => value < 0.06)) return "dark";
    return "mixed";
  }

  // src/lib/zip.js
  var CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();
  function crc32(bytes) {
    let crc = 4294967295;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
    return (crc ^ 4294967295) >>> 0;
  }
  function createZip(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const directory = [];
    let offset = 0;
    const now = /* @__PURE__ */ new Date();
    const dosTime = now.getHours() << 11 | now.getMinutes() << 5 | now.getSeconds() >> 1;
    const dosDate = now.getFullYear() - 1980 << 9 | now.getMonth() + 1 << 5 | now.getDate();
    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = encoder.encode(file.content);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 67324752, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 2048, true);
      local.setUint16(10, dosTime, true);
      local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      chunks.push(new Uint8Array(local.buffer), name, data);
      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 33639248, true);
      central.setUint16(4, 20, true);
      central.setUint16(6, 20, true);
      central.setUint16(8, 2048, true);
      central.setUint16(12, dosTime, true);
      central.setUint16(14, dosDate, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, data.length, true);
      central.setUint32(24, data.length, true);
      central.setUint16(28, name.length, true);
      central.setUint32(42, offset, true);
      directory.push(new Uint8Array(central.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const directorySize = directory.reduce((sum, chunk) => sum + chunk.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 101010256, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, directorySize, true);
    end.setUint32(16, offset, true);
    return new Blob([...chunks, ...directory, new Uint8Array(end.buffer)], {
      type: "application/zip"
    });
  }

  // src/shared/constants.js
  var STORAGE_KEYS = {
    theme: "svgGrabProTheme",
    allSitesEnabled: "allSitesEnabled",
    /** Light/dark scheme the toolbar icon should match (resolved from "system" by the popup). */
    iconScheme: "iconScheme"
  };
  var POPUP_PORT = "svg-grab-pro:popup";
  var ALL_SITES = { origins: ["<all_urls>"] };

  // src/shared/clipboard.js
  function legacyCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.documentElement.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
  async function writeClipboard(type, blob) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    } catch (error) {
      if (type !== "text/plain" || !legacyCopy(await (await blob).text())) throw error;
    }
  }
  function copyText(text) {
    return writeClipboard("text/plain", Promise.resolve(new Blob([text], { type: "text/plain" })));
  }

  // src/shared/download.js
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    link.addEventListener("click", (event) => event.stopPropagation());
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
  }

  // src/shared/format.js
  function formatBytes(bytes) {
    if (bytes < 1e3) return `${bytes} B`;
    if (bytes < 1e6) return `${(bytes / 1e3).toFixed(bytes < 1e4 ? 1 : 0)} KB`;
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  function formatSize(size) {
    if (!size) return "";
    const round = (n) => Number.isInteger(n) ? n : Number(n.toFixed(1));
    return `${round(size.width)} \xD7 ${round(size.height)}`;
  }

  // src/shared/icons.js
  var icon = (paths) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  var path = (d) => `<path d="${d}"/>`;
  var ICONS = {
    // copy/copy-default
    copy: icon(
      path(
        "M16.9018 16.9018C17.1375 16.8669 17.3474 16.8195 17.5451 16.7553C19.0673 16.2607 20.2607 15.0673 20.7553 13.5451C21 12.7919 21 11.8613 21 10C21 8.13872 21 7.20808 20.7553 6.45492C20.2607 4.93273 19.0673 3.73931 17.5451 3.24472C16.7919 3 15.8613 3 14 3C12.1387 3 11.2081 3 10.4549 3.24472C8.93273 3.73931 7.73931 4.93273 7.24472 6.45492C7.18049 6.65258 7.13312 6.86246 7.09819 7.09819M7.09819 7.09819C6.86246 7.13312 6.65258 7.18049 6.45492 7.24472C4.93273 7.73931 3.73931 8.93273 3.24472 10.4549C3 11.2081 3 12.1387 3 14C3 15.8613 3 16.7919 3.24472 17.5451C3.73931 19.0673 4.93273 20.2607 6.45492 20.7553C7.20808 21 8.13872 21 10 21C11.8613 21 12.7919 21 13.5451 20.7553C15.0673 20.2607 16.2607 19.0673 16.7553 17.5451C16.8195 17.3474 16.8669 17.1375 16.9018 16.9018C17 16.2393 17 15.3728 17 14C17 12.1387 17 11.2081 16.7553 10.4549C16.2607 8.93273 15.0673 7.73931 13.5451 7.24472C12.7919 7 11.8613 7 10 7C8.6272 7 7.76066 7 7.09819 7.09819Z"
      )
    ),
    // download/download-down
    download: icon(
      path(
        "M3 15C3 17.7614 5.23858 20 8 20H16C18.7614 20 21 17.7614 21 15M9 12.1885C9.74024 13.1755 10.599 14.0668 11.5564 14.8426C11.6859 14.9475 11.843 15 12 15M15 12.1885C14.2598 13.1755 13.401 14.0668 12.4436 14.8426C12.3141 14.9475 12.157 15 12 15M12 15V4"
      )
    ),
    // photo-image/photo-image-default
    image: icon(
      path(
        "M21.9989 10H21C19.607 10 18.9104 10 18.324 10.0603C12.9031 10.6176 8.61758 14.9031 8.06029 20.324C8.03963 20.5249 8.02605 20.7388 8.01712 20.9893M8.01712 20.9893C6.46784 20.9603 5.51086 20.8529 4.73005 20.455C3.78924 19.9757 3.02433 19.2108 2.54497 18.27C2 17.2004 2 15.8003 2 13V11C2 8.19974 2 6.79961 2.54497 5.73005C3.02433 4.78924 3.78924 4.02433 4.73005 3.54497C5.79961 3 7.19974 3 10 3H14C16.8003 3 18.2004 3 19.27 3.54497C20.2108 4.02433 20.9757 4.78924 21.455 5.73005C21.9309 6.66397 21.9912 7.84993 21.9989 10C22 10.3123 22 10.6449 22 11V13C22 15.8003 22 17.2004 21.455 18.27C20.9757 19.2108 20.2108 19.9757 19.27 20.455C18.2004 21 16.8003 21 14 21H10C9.24401 21 8.59006 21 8.01712 20.9893ZM7.5 9.5C6.94772 9.5 6.5 9.05228 6.5 8.5C6.5 7.94772 6.94772 7.5 7.5 7.5C8.05228 7.5 8.5 7.94772 8.5 8.5C8.5 9.05228 8.05228 9.5 7.5 9.5Z"
      )
    ),
    // check tick/check-tick-single
    check: icon(
      path(
        "M5.5 12.5L10.0168 17.7247L10.4177 17.0238C12.5668 13.2658 15.541 10.0448 19.1161 7.60354L20 7"
      )
    ),
    // alert/alert-circle
    alert: icon(
      path(
        "M12 12.6241V8.62412M12 15.9991V16.0002M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      )
    ),
    // archive/archive-arrow-down
    archive: icon(
      path(
        "M4 8H20M4 8V17C4 18.0609 4.42143 19.0783 5.17157 19.8284C5.92172 20.5786 6.93913 21 8 21H16C17.0609 21 18.0783 20.5786 18.8284 19.8284C19.5786 19.0783 20 18.0609 20 17V8M4 8C3.46957 8 2.96086 7.78929 2.58579 7.41421C2.21071 7.03914 2 6.53043 2 6V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H20C20.5304 3 21.0391 3.21071 21.4142 3.58579C21.7893 3.96086 22 4.46957 22 5V6C22 6.53043 21.7893 7.03914 21.4142 7.41421C21.0391 7.78929 20.5304 8 20 8"
      ) + path(
        "M9.4292 15.09C10.0632 15.936 10.7992 16.7 11.6192 17.365C11.7312 17.455 11.8652 17.5 12.0002 17.5M12.0002 17.5C12.1389 17.5002 12.2735 17.4525 12.3812 17.365C13.2019 16.6995 13.9374 15.9354 14.5712 15.09M12.0002 17.5V11.5"
      )
    ),
    // sun
    sun: icon(
      path(
        "M12 23V22M4.22183 19.7782L4.92893 19.0711M1 12H2M4.22183 4.22183L4.92893 4.92893M12 2V1M19.0711 4.92893L19.7782 4.22183M22 12H23M19.0711 19.0711L19.7782 19.7782M18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12Z"
      )
    ),
    // moon
    moon: icon(
      path(
        "M20.9999 11.9659C19.8486 13.7891 17.8157 15.0001 15.5 15.0001C11.9101 15.0001 9 12.09 9 8.50012C9 6.18432 10.2111 4.15137 12.0344 3.00006C12.0229 3.00002 12.0115 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 11.9886 21 11.9773 20.9999 11.9659Z"
      )
    ),
    // monitor/monitor-01
    monitor: icon(
      path(
        "M17 22H7M12 17V22M4.4 17H19.6C20.4401 17 20.8601 17 21.181 16.8365C21.4632 16.6927 21.6927 16.4632 21.8365 16.181C22 15.8601 22 15.4401 22 14.6V4.4C22 3.55992 22 3.13988 21.8365 2.81901C21.6927 2.53677 21.4632 2.3073 21.181 2.16349C20.8601 2 20.4401 2 19.6 2H4.4C3.55992 2 3.13988 2 2.81901 2.16349C2.53677 2.3073 2.3073 2.53677 2.16349 2.81901C2 3.13988 2 3.55992 2 4.4V14.6C2 15.4401 2 15.8601 2.16349 16.181C2.3073 16.4632 2.53677 16.6927 2.81901 16.8365C3.13988 17 3.55992 17 4.4 17Z"
      )
    ),
    // grid/grid-01
    grid: icon(
      path(
        "M12 21L12 3M21 12L3 12M9.4 21H14.6C16.8402 21 17.9603 21 18.816 20.564C19.5686 20.1805 20.1805 19.5686 20.564 18.816C21 17.9603 21 16.8402 21 14.6V9.4C21 7.15979 21 6.03968 20.564 5.18404C20.1805 4.43139 19.5686 3.81947 18.816 3.43597C17.9603 3 16.8402 3 14.6 3H9.4C7.15979 3 6.03968 3 5.18404 3.43597C4.43139 3.81947 3.81947 4.43139 3.43597 5.18404C3 6.03968 3 7.15979 3 9.4V14.6C3 16.8402 3 17.9603 3.43597 18.816C3.81947 19.5686 4.43139 20.1805 5.18404 20.564C6.03968 21 7.15979 21 9.4 21Z"
      )
    ),
    // lock/lock-close
    lock: icon(
      path(
        "M12 17V15M12 15C12.513 15 12.9288 14.5523 12.9288 14C12.9288 13.4477 12.513 13 12 13C11.487 13 11.0712 13.4477 11.0712 14C11.0712 14.5523 11.487 15 12 15ZM17.573 9.23864V9C17.573 5.68629 15.0779 3 12 3C8.92209 3 6.42696 5.68629 6.42696 9V9.23864M17.573 9.23864C16.8871 9 15.9654 9 14.3028 9H9.69722C8.03464 9 7.11294 9 6.42696 9.23864M17.573 9.23864C17.6567 9.26776 17.7369 9.30043 17.8146 9.33709C18.766 9.78655 19.4992 10.6444 19.8362 11.7025C20.089 12.4961 20.0115 13.4968 19.8566 15.4983C19.7232 17.2208 19.6566 18.0821 19.3494 18.758C18.9398 19.6593 18.2305 20.3619 17.3623 20.7265C16.7111 21 15.9083 21 14.3028 21H9.69722C8.09169 21 7.28893 21 6.63775 20.7265C5.7695 20.3619 5.06024 19.6593 4.65063 18.758C4.34342 18.0821 4.27676 17.2208 4.14343 15.4983C3.98851 13.4968 3.91105 12.4961 4.16381 11.7025C4.50083 10.6444 5.234 9.78655 6.18545 9.33709C6.26305 9.30043 6.34325 9.26776 6.42696 9.23864"
      )
    ),
    // sparkle/sparkle-ai-01
    sparkle: icon(
      path(
        "M5 17.65V19M5 19V20.35M5 19H6.35M5 19H3.65M12.9 3C13.5401 8.03653 15.5305 11.1418 21 12C15.8102 12.8143 13.5701 15.7277 12.9 21C12.2299 15.7277 9.98984 12.8143 4.8 12C9.98984 11.1857 12.2299 8.2723 12.9 3ZM5.7 3C5.94808 4.50612 6.8515 5.44494 8.4 5.7C6.8515 5.95506 5.94808 6.89388 5.7 8.4C5.45192 6.89388 4.5485 5.95506 3 5.7C4.50612 5.45192 5.44494 4.5485 5.7 3Z"
      )
    )
  };
  var BRAND_MARK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path opacity=".45" d="M12 5v14M5 12h14M7.05 7.05l9.9 9.9M7.05 16.95l9.9-9.9"/><circle cx="12" cy="4" r="1"/><circle cx="12" cy="20" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="20" cy="12" r="1"/><circle cx="6.34" cy="6.34" r="1"/><circle cx="17.66" cy="17.66" r="1"/><circle cx="6.34" cy="17.66" r="1"/><circle cx="17.66" cy="6.34" r="1"/></svg>`;

  // src/shared/is-injectable-url.js
  var WEB_STORE_RE = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)\//;
  function isInjectableUrl(url) {
    if (!url) return false;
    return /^(https?|file):/.test(url) && !WEB_STORE_RE.test(url);
  }

  // src/shared/theme.js
  function isValidTheme(value) {
    return value === "system" || value === "light" || value === "dark";
  }
  async function getStoredTheme() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.theme);
    const stored = data[STORAGE_KEYS.theme];
    return isValidTheme(stored) ? stored : "system";
  }
  function resolveScheme(theme2) {
    if (theme2 !== "system") return theme2;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // src/popup/index.js
  var BACKDROP_KEY = "svgGrabPro.backdrop";
  var SCHEME_KEY = "svgGrabPro.scheme";
  var root = document.documentElement;
  try {
    root.dataset.scheme = localStorage.getItem(SCHEME_KEY) || resolveScheme("system");
  } catch {
    root.dataset.scheme = resolveScheme("system");
  }
  var $ = (selector) => (
    /** @type {HTMLElement} */
    document.querySelector(selector)
  );
  var content = $("#content");
  var downloadAll = (
    /** @type {HTMLButtonElement} */
    $("#downloadAll")
  );
  var allSites = (
    /** @type {HTMLInputElement} */
    $("#allSites")
  );
  var items = [];
  var blocked = 0;
  var filter = "all";
  var revealed = false;
  var port = null;
  for (const el of document.querySelectorAll("[data-icon]")) {
    const name = (
      /** @type {HTMLElement} */
      el.dataset.icon
    );
    el.innerHTML = name === "brand" ? BRAND_MARK : ICONS[
      /** @type {keyof typeof ICONS} */
      name
    ];
  }
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
  }
  var toastTimer;
  function toast(message, tone = "success") {
    const el = $("#toast");
    el.textContent = message;
    el.dataset.tone = tone;
    el.setAttribute("data-open", "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.removeAttribute("data-open"), tone === "error" ? 3600 : 1800);
  }
  function selectSegment(groupSelector, current) {
    for (const button of document.querySelectorAll(groupSelector)) {
      const attr = button.getAttribute("role") === "tab" ? "aria-selected" : "aria-checked";
      button.setAttribute(attr, String(button === current));
    }
  }
  function showState({ icon: icon2, title, text, grant = false }) {
    content.innerHTML = `
    <div class="state">
      <div class="state-icon">${ICONS[icon2]}</div>
      <p class="state-title">${escapeHtml(title)}</p>
      <p class="state-text">${escapeHtml(text)}</p>
      ${grant ? '<button type="button" class="notice-action state-action" data-grant>Allow all sites</button>' : ""}
    </div>`;
  }
  function showSkeleton() {
    content.innerHTML = `<div class="grid">${'<div class="skeleton"></div>'.repeat(9)}</div>`;
  }
  function visibleItems() {
    return filter === "logos" ? items.filter((item) => item.isLogo) : items;
  }
  function describe(item) {
    const size = item.width && item.height ? formatSize({ width: item.width, height: item.height }) : "";
    return [size, formatBytes(item.bytes)].filter(Boolean).join(" \xB7 ");
  }
  function render() {
    const logos = items.filter((item) => item.isLogo).length;
    $("#countAll").textContent = items.length ? String(items.length) : "";
    $("#countLogos").textContent = logos ? String(logos) : "";
    const shown = visibleItems();
    downloadAll.disabled = shown.length === 0;
    $("#downloadAllLabel").textContent = filter === "logos" && shown.length ? "Download logos" : "Download all";
    if (items.length === 0 && blocked > 0 && !allSites.checked) {
      showState({
        icon: "lock",
        title: `${blocked} SVG${blocked === 1 ? "" : "s"} on other domains`,
        text: "This page loads its SVGs from another domain. Allow access to grab them.",
        grant: true
      });
      return;
    }
    if (items.length === 0) {
      showState({
        icon: "grid",
        title: "No SVGs on this page",
        text: "Icons drawn with fonts or raster images can\u2019t be grabbed as vectors."
      });
      return;
    }
    if (shown.length === 0) {
      showState({
        icon: "sparkle",
        title: "No logos detected",
        text: "Everything this page draws with SVG is under All."
      });
      return;
    }
    const notice = blocked > 0 && !allSites.checked ? `<div class="notice">
          ${ICONS.lock}
          <p><strong>${blocked} more SVG${blocked === 1 ? " is" : "s are"}</strong> hosted on other domains.</p>
          <button type="button" class="notice-action" data-grant>Allow</button>
        </div>` : "";
    const reveal = !revealed;
    revealed = true;
    content.innerHTML = `${notice}<ul class="grid"${reveal ? " data-reveal" : ""}>${shown.map(
      (item, index) => `
      <li class="tile" style="--i:${index}" data-id="${item.id}" data-tone="${artworkTone(item.svg)}">
        <button class="preview" type="button" data-action="copy-svg" title="Copy ${escapeHtml(item.name)}.svg">
          <img src="${svgToDataUrl(item.svg)}" alt="" decoding="async" draggable="false" />
        </button>
        ${item.isLogo ? '<span class="badge">Logo</span>' : ""}
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
    ).join("")}</ul>`;
  }
  async function runAction(action, item, tile) {
    try {
      if (action === "copy-svg") {
        await copyText(item.svg);
        tile.setAttribute("data-copied", "");
        setTimeout(() => tile.removeAttribute("data-copied"), 1100);
      } else if (action === "download-svg") {
        downloadBlob(new Blob([item.svg], { type: "image/svg+xml" }), `${item.name}.svg`);
      } else if (action === "download-png") {
        downloadBlob(await svgToPngBlob(item.svg), `${item.name}.png`);
      }
    } catch (error) {
      console.warn("[SVG Grab Pro]", error);
      toast(
        action === "download-png" ? "Couldn\u2019t render this SVG as a PNG." : "Couldn\u2019t copy to the clipboard.",
        "error"
      );
    }
  }
  content.addEventListener("click", (event) => {
    if (
      /** @type {Element} */
      event.target.closest("[data-grant]")
    ) {
      grantAllSites();
      return;
    }
    const button = (
      /** @type {HTMLElement | null} */
      /** @type {Element} */
      event.target.closest("[data-action]")
    );
    const tile = (
      /** @type {HTMLElement | null} */
      button?.closest(".tile")
    );
    const item = tile && items.find((candidate) => candidate.id === tile.dataset.id);
    if (button && tile && item) runAction(
      /** @type {string} */
      button.dataset.action,
      item,
      tile
    );
  });
  var hovered = "";
  content.addEventListener("pointerover", (event) => {
    const tile = (
      /** @type {HTMLElement | null} */
      /** @type {Element} */
      event.target.closest(".tile")
    );
    const id = tile?.dataset.id || "";
    if (id === hovered) return;
    hovered = id;
    const item = items.find((candidate) => candidate.id === id);
    port?.postMessage({ type: "highlight", id, label: item ? `${item.name}.svg` : "" });
  });
  content.addEventListener("pointerleave", () => {
    hovered = "";
    port?.postMessage({ type: "highlight", id: "" });
  });
  for (const button of document.querySelectorAll("[data-filter]")) {
    button.addEventListener("click", () => {
      filter = /** @type {'all' | 'logos'} */
      /** @type {HTMLElement} */
      button.dataset.filter;
      selectSegment(
        "[data-filter]",
        /** @type {HTMLElement} */
        button
      );
      render();
    });
  }
  downloadAll.addEventListener("click", () => {
    const shown = visibleItems();
    const zip = createZip(shown.map((item) => ({ name: `${item.name}.svg`, content: item.svg })));
    const site = ($("#site").textContent || "svgs").replace(/^www\./, "").trim() || "svgs";
    downloadBlob(zip, `${site}-${filter === "logos" ? "logos" : "svgs"}.zip`);
    toast(`Saved ${shown.length} SVG${shown.length === 1 ? "" : "s"}`);
  });
  function applyBackdrop(backdrop) {
    const value = ["auto", "light", "dark"].includes(backdrop) ? backdrop : "auto";
    root.dataset.backdrop = value;
    selectSegment("[data-backdrop]", $(`[data-backdrop="${value}"]`));
    try {
      localStorage.setItem(BACKDROP_KEY, value);
    } catch {
    }
  }
  try {
    applyBackdrop(localStorage.getItem(BACKDROP_KEY) || "auto");
  } catch {
    applyBackdrop("auto");
  }
  for (const button of document.querySelectorAll("[data-backdrop]")) {
    button.addEventListener(
      "click",
      () => applyBackdrop(
        /** @type {HTMLElement} */
        button.dataset.backdrop || "auto"
      )
    );
  }
  var theme = "system";
  function applyTheme() {
    const scheme = resolveScheme(theme);
    root.dataset.scheme = scheme;
    selectSegment("[data-theme]", $(`[data-theme="${theme}"]`));
    try {
      localStorage.setItem(SCHEME_KEY, scheme);
    } catch {
    }
    chrome.storage.local.set({ [STORAGE_KEYS.iconScheme]: scheme });
  }
  for (const button of document.querySelectorAll("[data-theme]")) {
    button.addEventListener("click", () => {
      theme = /** @type {import('../shared/theme.js').Theme} */
      /** @type {HTMLElement} */
      button.dataset.theme;
      chrome.storage.local.set({ [STORAGE_KEYS.theme]: theme });
      applyTheme();
    });
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  async function grantAllSites() {
    allSites.checked = await chrome.permissions.request(ALL_SITES);
    if (allSites.checked && blocked > 0) scanActiveTab();
  }
  allSites.addEventListener("change", () => {
    if (allSites.checked) grantAllSites();
    else chrome.permissions.remove(ALL_SITES);
  });
  async function scanActiveTab(retries = 2) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let hostname = "";
    try {
      hostname = tab?.url ? new URL(tab.url).hostname : "";
    } catch {
    }
    $("#site").textContent = hostname || "This page";
    if (!tab?.id || !isInjectableUrl(tab.url)) {
      showState({
        icon: "lock",
        title: "This page is off-limits",
        text: "Chrome doesn\u2019t let extensions read browser pages or the Web Store. Open any website to grab its SVGs."
      });
      return;
    }
    showSkeleton();
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["contentScript.js"]
      });
    } catch {
      showState({
        icon: "alert",
        title: "Couldn\u2019t read this page",
        text: tab.url?.startsWith("file:") ? "Turn on \u201CAllow access to file URLs\u201D for SVG Grab Pro in chrome://extensions." : "Reload the page and open SVG Grab Pro again."
      });
      return;
    }
    let answered = false;
    const connection = chrome.tabs.connect(tab.id, { name: POPUP_PORT });
    port = connection;
    connection.onMessage.addListener((message) => {
      if (message.type !== "scan") return;
      answered = true;
      items = message.items;
      blocked = message.blocked || 0;
      render();
    });
    connection.onDisconnect.addListener(() => {
      if (port === connection) port = null;
      if (!answered && retries > 0) setTimeout(() => scanActiveTab(retries - 1), 150);
    });
    connection.postMessage({ type: "scan" });
  }
  getStoredTheme().then((stored) => {
    theme = stored;
    applyTheme();
  });
  chrome.permissions.contains(ALL_SITES).then((granted) => {
    allSites.checked = granted;
  });
  scanActiveTab();
})();
