(() => {
  // src/lib/svg-url.js
  var CSS_URL_RE = /url\(\s*(['"]?)((?:\\.|.)*?)\1\s*\)/g;
  function isSvgUrl(url) {
    if (!url) return false;
    if (/^data:image\/svg\+xml[;,]/i.test(url)) return true;
    try {
      const { pathname, search } = new URL(url, "https://base.invalid/");
      return /\.svg$/i.test(pathname) || /[?&](format|fm|type|ext)=svg(&|$)/i.test(search);
    } catch {
      return false;
    }
  }
  function extractCssUrls(value) {
    if (!value || value === "none") return [];
    return [...value.matchAll(CSS_URL_RE)].map((match) => match[2].replace(/\\(.)/g, "$1")).filter(Boolean);
  }
  function decodeSvgDataUrl(url) {
    const match = /^data:image\/svg\+xml([^,]*),(.*)$/is.exec(url);
    if (!match) return null;
    const [, params, payload] = match;
    try {
      if (/;base64/i.test(params)) {
        const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      }
      return decodeURIComponent(payload);
    } catch {
      return null;
    }
  }
  function svgToDataUrl(svgText) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  // src/lib/locate.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  var CSS_IMAGE_PROPS = [
    "background-image",
    "mask-image",
    "-webkit-mask-image",
    "content",
    "list-style-image"
  ];
  var PSEUDOS = [null, "::before", "::after"];
  var SKIP_TAGS = /* @__PURE__ */ new Set([
    "script",
    "style",
    "noscript",
    "template",
    "head",
    "link",
    "meta",
    "iframe"
  ]);
  function isSvgRoot(el) {
    return el.localName === "svg" && el.namespaceURI === SVG_NS;
  }
  function outermostSvg(el) {
    let found = null;
    for (let node = (
      /** @type {Element | null} */
      el
    ); node; node = node.parentElement) {
      if (isSvgRoot(node)) found = node;
    }
    return (
      /** @type {SVGSVGElement | null} */
      found
    );
  }
  function svgUrlFromElement(el) {
    const name = el.localName;
    if (name === "img") {
      const img = (
        /** @type {HTMLImageElement} */
        el
      );
      const src = img.currentSrc || img.src;
      return isSvgUrl(src) ? src : null;
    }
    if (name === "object") {
      const object = (
        /** @type {HTMLObjectElement} */
        el
      );
      return object.data && (isSvgUrl(object.data) || object.type === "image/svg+xml") ? object.data : null;
    }
    if (name === "embed") {
      const embed = (
        /** @type {HTMLEmbedElement} */
        el
      );
      return embed.src && (isSvgUrl(embed.src) || embed.type === "image/svg+xml") ? embed.src : null;
    }
    return null;
  }
  function svgFromCss(el) {
    const view = el.ownerDocument.defaultView;
    if (!view) return null;
    for (const pseudo of PSEUDOS) {
      const style = view.getComputedStyle(el, pseudo);
      for (const prop of CSS_IMAGE_PROPS) {
        const url = extractCssUrls(style.getPropertyValue(prop)).find(isSvgUrl);
        if (!url) continue;
        const background = style.getPropertyValue("background-color");
        const isMask = prop.endsWith("mask-image");
        const tint = isMask && background && !/^(transparent|rgba\(.*,\s*0\))$/.test(background);
        return tint ? { url, tint: background } : { url };
      }
    }
    return null;
  }
  function targetFromElement(el) {
    const svg = outermostSvg(el);
    if (svg) return { kind: "inline", element: svg };
    const url = svgUrlFromElement(el);
    if (url) return { kind: "url", element: el, url };
    const css = svgFromCss(el);
    return css ? { kind: "url", element: el, ...css } : null;
  }
  function deepElementsFromPoint(root, x, y, depth = 0) {
    const out = /* @__PURE__ */ new Set();
    for (const el of root.elementsFromPoint?.(x, y) ?? []) {
      if (el.shadowRoot && el.shadowRoot !== root && depth < 4) {
        for (const inner of deepElementsFromPoint(el.shadowRoot, x, y, depth + 1)) out.add(inner);
      }
      out.add(el);
    }
    return [...out];
  }
  function findTargetAtPoint({ path: path2, x, y, doc }) {
    const view = doc.defaultView;
    if (!view) return null;
    const elements = (
      /** @type {Element[]} */
      path2.filter((node) => (
        /** @type {Node} */
        node.nodeType === 1
      ))
    );
    const target = elements[0];
    if (!target) return null;
    const maxArea = view.innerWidth * view.innerHeight * 0.25;
    const isSmall = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.width * rect.height <= maxArea;
    };
    const direct = targetFromElement(target);
    const isCssPainted = direct?.kind === "url" && !svgUrlFromElement(target);
    if (direct && (!isCssPainted || isSmall(target))) return direct;
    const checked = /* @__PURE__ */ new Set([target]);
    const candidates = [...elements.slice(1, 4), ...deepElementsFromPoint(doc, x, y).slice(0, 12)];
    for (const el of candidates) {
      if (checked.has(el) || el === doc.documentElement || el === doc.body) continue;
      checked.add(el);
      if (!isSmall(el)) continue;
      const found = targetFromElement(el);
      if (found) return found;
    }
    return null;
  }
  function isRendered(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    return el.ownerDocument.defaultView?.getComputedStyle(el).visibility !== "hidden";
  }
  function collectPageTargets(doc, { limit = 300, cssBudget = 6e3 } = {}) {
    const targets = [];
    const seenUrls = /* @__PURE__ */ new Set();
    let cssChecks = 0;
    const add = (target) => {
      if (target.kind === "url") {
        if (seenUrls.has(target.url)) return;
        seenUrls.add(target.url);
      }
      targets.push(target);
    };
    const walk = (parent) => {
      for (const el of parent.children) {
        if (targets.length >= limit) return;
        if (SKIP_TAGS.has(el.localName)) continue;
        if (isSvgRoot(el)) {
          if (isRendered(el)) add({ kind: "inline", element: (
            /** @type {SVGSVGElement} */
            el
          ) });
          continue;
        }
        const url = svgUrlFromElement(el);
        const css = !url && cssChecks++ < cssBudget ? svgFromCss(el) : null;
        if ((url || css) && isRendered(el)) {
          add(url ? { kind: "url", element: el, url } : { kind: "url", element: el, ...css });
        }
        if (el.shadowRoot) walk(el.shadowRoot);
        walk(el);
      }
    };
    walk(doc.body ?? doc.documentElement);
    return targets;
  }

  // src/lib/logo-detection.js
  var LOGO_SCORE_THRESHOLD = 45;
  var LOGO_RE = /(^|[^a-z])(logo|logotype|logomark|wordmark|brand)/i;
  var ICON_RE = /(^|[^a-z])(icon|chevron|arrow|caret|close|menu|search|hamburger|spinner)([^a-z]|$)/i;
  var HOME_PATH_RE = /^\/([a-z]{2}([-_][a-z]{2})?\/?)?(index\.html?)?$/i;
  function classOf(el) {
    if (!el) return "";
    const value = el.getAttribute("class");
    return value || "";
  }
  function describe(el) {
    const link = el.closest("a");
    return [
      el.id,
      classOf(el),
      el.getAttribute("aria-label"),
      el.getAttribute("alt"),
      el.getAttribute("title"),
      el.querySelector(":scope > title")?.textContent,
      link?.getAttribute("aria-label"),
      link?.getAttribute("title")
    ].filter(Boolean).join(" ");
  }
  function isHomeLink(href, pageUrl) {
    if (href === null) return false;
    try {
      const url = new URL(href, pageUrl);
      return url.origin === new URL(pageUrl).origin && HOME_PATH_RE.test(url.pathname);
    } catch {
      return false;
    }
  }
  function scoreLogo(el, { pageUrl, viewportWidth, scrollY: scrollY2 }) {
    let score = 0;
    const words = describe(el);
    const hasLogoWord = LOGO_RE.test(words);
    if (hasLogoWord) score += 35;
    else if (ICON_RE.test(words)) score -= 15;
    let ancestorNamed = false;
    let inHeader = false;
    let parent = el.parentElement;
    for (let depth = 0; parent && depth < 6; depth++, parent = parent.parentElement) {
      if (!ancestorNamed && LOGO_RE.test(`${parent.id} ${classOf(parent)}`)) {
        ancestorNamed = true;
        score += 25;
      }
      if (!inHeader && (parent.localName === "header" || parent.getAttribute("role") === "banner")) {
        inHeader = true;
        score += 20;
      }
    }
    if (isHomeLink(el.closest("a")?.getAttribute("href") ?? null, pageUrl)) score += 30;
    const rect = el.getBoundingClientRect();
    const top = rect.top + scrollY2;
    if (top < 160) score += 10;
    if (top < 160 && rect.left < viewportWidth * 0.4) score += 5;
    if (rect.width >= 24 && rect.width <= 400 && rect.height >= 12 && rect.height <= 160) score += 5;
    if (rect.height > 0 && rect.width / rect.height > 1.8) score += 5;
    if (Math.max(rect.width, rect.height) < 20) score -= 20;
    return score;
  }

  // src/lib/naming.js
  var GENERIC_WORDS = new Set(
    "home homepage logo logotype link icon image img svg go to the back main page site website click here navigate return of and a an".split(
      " "
    )
  );
  var ICON_CLASS_RE = /^(?:[a-z]+-)?(?:logo|icon|brand|mark|glyph|symbol|fa|bi|ri|lucide|octicon|ti|mdi|ph)[-_][a-z0-9-_]+$/i;
  var SECOND_LEVEL = /* @__PURE__ */ new Set(["co", "com", "org", "net", "gov", "ac", "edu"]);
  function slugify(text) {
    return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  }
  function siteName(hostname) {
    const parts = hostname.replace(/^www\./, "").split(".").filter(Boolean);
    if (parts.length < 2) return parts[0] || "";
    const candidate = parts[parts.length - 2];
    return SECOND_LEVEL.has(candidate) && parts.length > 2 ? parts[parts.length - 3] : candidate;
  }
  function meaningfulSlug(label) {
    if (!label) return "";
    return slugify(label).split("-").filter(
      (word) => /[a-z]{2}/.test(word) && !GENERIC_WORDS.has(word) && !/\d{3,}|^[a-f0-9]{6,}$/.test(word)
    ).join("-");
  }
  function fileStem(url) {
    if (!url || url.startsWith("data:")) return "";
    try {
      const last = new URL(url).pathname.split("/").pop() || "";
      return decodeURIComponent(last).replace(/\.svg$/i, "");
    } catch {
      return "";
    }
  }
  function suggestName(el, { url, hostname, isLogo }) {
    const site = slugify(siteName(hostname)) || "svg";
    const link = el.closest("a");
    const iconClass = (el.getAttribute("class") || "").split(/\s+/).find((token) => ICON_CLASS_RE.test(token));
    const labels = [
      el.getAttribute("aria-label"),
      el.querySelector(":scope > title")?.textContent,
      el.getAttribute("alt"),
      el.getAttribute("title"),
      link?.getAttribute("aria-label"),
      link?.getAttribute("title"),
      url && fileStem(url),
      iconClass,
      el.id
    ];
    for (const label of labels) {
      const slug = meaningfulSlug(label);
      if (!slug) continue;
      return isLogo && !slug.includes("logo") ? `${slug}-logo` : slug;
    }
    return isLogo ? `${site}-logo` : `${site}-svg`;
  }
  function dedupeNames(names) {
    const used = /* @__PURE__ */ new Set();
    return names.map((name) => {
      let unique = name;
      for (let n = 2; used.has(unique); n++) unique = `${name}-${n}`;
      used.add(unique);
      return unique;
    });
  }

  // src/lib/parse-svg.js
  var SVG_NS2 = "http://www.w3.org/2000/svg";
  var EMBED_RE = /<svg[\s>][\s\S]*<\/svg\s*>/i;
  function sanitizeSvg(root) {
    for (const el of root.querySelectorAll("script, iframe, object, embed, form")) el.remove();
    for (const el of [root, ...root.querySelectorAll("*")]) {
      for (const { name, value } of [...el.attributes]) {
        const compact = value.replace(/[\s\u0000-\u001f]/g, "").toLowerCase();
        const isScriptUrl = /^(javascript|vbscript):/.test(compact);
        if (name.toLowerCase().startsWith("on") || isScriptUrl) el.removeAttribute(name);
      }
    }
    return root;
  }
  function parseSvgText(text) {
    if (!text || typeof text !== "string" || !/<svg[\s>]/i.test(text)) return null;
    const parser = new DOMParser();
    const embedded = EMBED_RE.exec(text)?.[0];
    const namespaced = embedded && !/^<svg[^>]*\sxmlns=/i.test(embedded) && embedded.replace(/^<svg/i, `<svg xmlns="${SVG_NS2}"`);
    for (const candidate of [text, embedded, namespaced]) {
      if (!candidate) continue;
      const doc = parser.parseFromString(candidate, "image/svg+xml");
      const root = doc.documentElement;
      if (!doc.querySelector("parsererror") && root?.localName === "svg" && root.namespaceURI === SVG_NS2) {
        return (
          /** @type {SVGSVGElement} */
          sanitizeSvg(root)
        );
      }
    }
    return null;
  }
  function normalizeSvgText(text) {
    const root = parseSvgText(text);
    return root ? new XMLSerializer().serializeToString(root) : null;
  }
  function toPixels(value) {
    if (!value) return null;
    const match = /^\s*([\d.]+)\s*(px)?\s*$/i.exec(value);
    const number = match ? Number(match[1]) : NaN;
    return Number.isFinite(number) && number > 0 ? number : null;
  }
  function getSvgSize(source) {
    const root = typeof source === "string" ? parseSvgText(source) : source;
    if (!root) return null;
    const box = (root.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    const hasBox = box.length === 4 && box[2] > 0 && box[3] > 0;
    let width = toPixels(root.getAttribute("width"));
    let height = toPixels(root.getAttribute("height"));
    if (hasBox) {
      const ratio = box[2] / box[3];
      if (width && !height) height = width / ratio;
      if (height && !width) width = height * ratio;
      if (!width && !height) [width, height] = [box[2], box[3]];
    }
    return width && height ? { width, height } : null;
  }
  function tintSvg(text, color) {
    const root = parseSvgText(text);
    if (!root) return null;
    const paints = ["fill", "stroke", "stop-color", "flood-color"];
    for (const el of [root, ...root.querySelectorAll("*")]) {
      for (const prop of paints) {
        const value = el.getAttribute(prop);
        if (value && value !== "none" && !value.startsWith("url(")) el.setAttribute(prop, color);
      }
      const style = el.getAttribute("style");
      if (style) {
        el.setAttribute(
          "style",
          style.replace(/(^|;)\s*(fill|stroke|stop-color)\s*:\s*(?!none|url)[^;]+/g, `$1$2:${color}`)
        );
      }
    }
    if (!root.hasAttribute("fill")) root.setAttribute("fill", color);
    return new XMLSerializer().serializeToString(root);
  }

  // src/shared/constants.js
  var STORAGE_KEYS = {
    theme: "svgGrabProTheme",
    allSitesEnabled: "allSitesEnabled",
    /** Light/dark scheme the toolbar icon should match (resolved from "system" by the popup). */
    iconScheme: "iconScheme"
  };
  var MESSAGES = {
    fetchSvg: "fetchSvg"
  };
  var POPUP_PORT = "svg-grab-pro:popup";

  // src/shared/format.js
  function formatBytes(bytes) {
    if (bytes < 1e3) return `${bytes} B`;
    if (bytes < 1e6) return `${(bytes / 1e3).toFixed(bytes < 1e4 ? 1 : 0)} KB`;
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  function formatSize(size) {
    if (!size) return "";
    const round2 = (n) => Number.isInteger(n) ? n : Number(n.toFixed(1));
    return `${round2(size.width)} \xD7 ${round2(size.height)}`;
  }
  function byteLength(text) {
    return new TextEncoder().encode(text).length;
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
  function resolveScheme(theme) {
    if (theme !== "system") return theme;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

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

  // src/lib/serialize-svg.js
  var SVG_NS3 = "http://www.w3.org/2000/svg";
  var XLINK_NS = "http://www.w3.org/1999/xlink";
  var PAINT_PROPS = [
    ["color", "rgb(0, 0, 0)", true],
    ["fill", "rgb(0, 0, 0)", true],
    ["fill-opacity", "1", true],
    ["fill-rule", "nonzero", true],
    ["stroke", "none", true],
    ["stroke-width", "1", true],
    ["stroke-opacity", "1", true],
    ["stroke-linecap", "butt", true],
    ["stroke-linejoin", "miter", true],
    ["stroke-miterlimit", "4", true],
    ["stroke-dasharray", "none", true],
    ["stroke-dashoffset", "0", true],
    ["clip-rule", "nonzero", true],
    ["paint-order", "normal", true],
    ["visibility", "visible", true],
    ["opacity", "1", false],
    ["clip-path", "none", false],
    ["mask", "none", false],
    ["filter", "none", false],
    ["vector-effect", "none", false]
  ];
  var STOP_PROPS = [
    ["stop-color", "rgb(0, 0, 0)", false],
    ["stop-opacity", "1", false]
  ];
  var FLOOD_PROPS = [
    ["flood-color", "rgb(0, 0, 0)", false],
    ["flood-opacity", "1", false]
  ];
  var BAKED_PROPS = new Set([...PAINT_PROPS, ...STOP_PROPS, ...FLOOD_PROPS].map(([prop]) => prop));
  var TEXT_PROPS = [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "text-anchor",
    "dominant-baseline"
  ];
  var DEFS_SELECTOR = "defs,symbol,clipPath,mask,pattern,marker,linearGradient,radialGradient,filter";
  var NO_PAINT = /* @__PURE__ */ new Set([
    "title",
    "desc",
    "metadata",
    "style",
    "linearGradient",
    "radialGradient",
    "filter"
  ]);
  var NOISE_ATTR_RE = /^(data-|aria-|ng-|_ng|on|js)/i;
  var NOISE_ATTRS = /* @__PURE__ */ new Set(["role", "focusable", "tabindex", "part", "slot"]);
  var URL_REF_RE = /url\(\s*['"]?#([^'")\s]+)/g;
  var LENGTH_PROPS = /* @__PURE__ */ new Set(["stroke-width", "stroke-dashoffset", "stroke-dasharray"]);
  var TRANSFORM_PROPS = ["transform", "transform-origin", "transform-box"];
  var TEXT_ELEMENTS = /* @__PURE__ */ new Set(["text", "tspan", "textPath"]);
  function normalizeValue(prop, value) {
    let out = value.trim().replace(/url\(\s*(['"]?)[^'")]*?#([^'")]+)\1\s*\)/g, "url(#$2)").replace(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/g, (match, r, g, b, a) => {
      if (a !== void 0 && Number(a) === 0) return "transparent";
      if (a !== void 0 && Number(a) < 1) return match;
      return "#" + [r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    });
    if (LENGTH_PROPS.has(prop)) out = out.replace(/(\d)px\b/g, "$1");
    if (prop === "stroke-dasharray") out = out.replace(/,\s*/g, " ");
    if ((prop === "fill" || prop === "stroke") && out === "transparent") out = "none";
    return out;
  }
  function propsFor(el) {
    if (el.localName === "stop") return STOP_PROPS;
    if (el.localName === "feFlood" || el.localName === "feDropShadow") return FLOOD_PROPS;
    if (NO_PAINT.has(el.localName) || el.localName.startsWith("fe")) return [];
    return PAINT_PROPS;
  }
  function cssTransformToAttribute(src, style) {
    const match = /^matrix\(([^)]+)\)$/.exec(style.getPropertyValue("transform"));
    if (!match) return null;
    const values = match[1].split(",").map((n) => Number(n.trim()));
    let [x = 0, y = 0] = style.getPropertyValue("transform-origin").split(" ").map(parseFloat);
    if (style.getPropertyValue("transform-box") === "fill-box") {
      try {
        const box = (
          /** @type {SVGGraphicsElement} */
          src.getBBox()
        );
        x += box.x;
        y += box.y;
      } catch {
      }
    }
    const matrix = `matrix(${values.join(" ")})`;
    return x || y ? `translate(${x} ${y}) ${matrix} translate(${-x} ${-y})` : matrix;
  }
  function bakeStyles(src, dst, ctx) {
    const style = ctx.computed(src);
    const parentStyle = !ctx.isRoot && src.parentElement ? ctx.computed(src.parentElement) : null;
    const inline = (
      /** @type {SVGElement} */
      dst.style
    );
    const declared = /* @__PURE__ */ new Set();
    if (ctx.isRoot) {
      dst.removeAttribute("style");
    } else if (inline) {
      for (const name of Array.from({ length: inline.length }, (_, i) => inline.item(i))) {
        if (BAKED_PROPS.has(name) || inline.getPropertyValue(name).includes("var(")) {
          declared.add(name);
          inline.removeProperty(name);
        }
      }
    }
    const write = (prop, value) => {
      if (ctx.asStyle && inline) inline.setProperty(prop, value);
      else dst.setAttribute(prop, value);
    };
    const classed = ctx.asStyle && src.hasAttribute("class");
    for (const [prop, initial, inherited] of propsFor(src)) {
      const raw = style.getPropertyValue(prop);
      if (!raw) continue;
      const value = normalizeValue(prop, raw);
      const initialValue = normalizeValue(prop, initial);
      const parentRaw = inherited && parentStyle ? parentStyle.getPropertyValue(prop) : "";
      const reference = parentRaw ? normalizeValue(prop, parentRaw) : initialValue;
      if (value !== reference || declared.has(prop) || classed && value !== initialValue || // Outside defs, also overwrite authored attributes that CSS overrides on the page.
      !ctx.inDefs && dst.hasAttribute(prop)) {
        write(prop, value);
      }
    }
    if (TEXT_ELEMENTS.has(src.localName)) {
      for (const prop of TEXT_PROPS) {
        const raw = style.getPropertyValue(prop).trim();
        const differs = src.localName === "text" ? raw !== "normal" && raw !== "auto" : raw !== parentStyle?.getPropertyValue(prop).trim();
        if (raw && differs) write(prop, raw);
      }
    }
    if (!ctx.isRoot && !dst.hasAttribute("transform")) {
      const transform = cssTransformToAttribute(src, style);
      if (transform) {
        dst.setAttribute("transform", transform);
        for (const prop of TRANSFORM_PROPS) inline?.removeProperty(prop);
      }
    }
    if (inline && inline.length === 0) dst.removeAttribute("style");
  }
  function stripNoise(el, keepClasses) {
    for (const { name } of [...el.attributes]) {
      if (NOISE_ATTR_RE.test(name) || NOISE_ATTRS.has(name) || name === "class" && !keepClasses) {
        el.removeAttribute(name);
      }
    }
  }
  function getHref(el) {
    return el.getAttribute("href") ?? el.getAttributeNS(XLINK_NS, "href");
  }
  function setHref(el, value) {
    if (el.hasAttributeNS(XLINK_NS, "href")) el.setAttributeNS(XLINK_NS, "xlink:href", value);
    else el.setAttribute("href", value);
  }
  function findById(root, id) {
    return [...root.querySelectorAll("[id]")].find((el) => el.id === id) || null;
  }
  function collectReferencedIds(root) {
    const ids = /* @__PURE__ */ new Set();
    for (const el of [root, ...root.querySelectorAll("*")]) {
      for (const { name, value } of el.attributes) {
        const isRef = (name === "href" || name === "xlink:href") && el.localName !== "a";
        if (isRef && value.startsWith("#")) ids.add(value.slice(1));
        for (const match of value.matchAll(URL_REF_RE)) ids.add(match[1]);
      }
      if (el.localName === "style") {
        for (const match of (el.textContent || "").matchAll(URL_REF_RE)) ids.add(match[1]);
      }
    }
    return [...ids].map((id) => {
      try {
        return decodeURIComponent(id);
      } catch {
        return id;
      }
    });
  }
  function ensureDefs(clone) {
    let defs = [...clone.children].find((child) => child.localName === "defs");
    if (!defs) {
      defs = clone.ownerDocument.createElementNS(SVG_NS3, "defs");
      clone.insertBefore(defs, clone.firstChild);
    }
    return defs;
  }
  function pullInReferences(clone, lookup, copy) {
    for (let pass = 0; pass < 8; pass++) {
      const found = collectReferencedIds(clone).filter((id) => clone.id !== id && !findById(clone, id)).map(lookup).filter((el) => el !== null);
      if (found.length === 0) return;
      const defs = ensureDefs(clone);
      for (const el of found) defs.appendChild(copy(
        /** @type {Element} */
        el
      ));
    }
  }
  function cloneWithStyles(src, { keepClasses, inDefs, isRoot, computed }) {
    const clone = (
      /** @type {Element} */
      src.cloneNode(true)
    );
    const sources = [src, ...src.querySelectorAll("*")];
    const clones = [clone, ...clone.querySelectorAll("*")];
    const hidden = [];
    sources.forEach((source, index) => {
      const target = clones[index];
      const elementInDefs = inDefs || !!source.closest(DEFS_SELECTOR);
      bakeStyles(source, target, {
        computed,
        inDefs: elementInDefs,
        isRoot: isRoot && index === 0,
        asStyle: keepClasses
      });
      stripNoise(target, keepClasses);
      const mayBeReferenced = !!source.id || !!source.querySelector("[id]");
      if (index > 0 && !elementInDefs && !mayBeReferenced && computed(source).display === "none") {
        hidden.push(target);
      }
      const href = (source.localName === "image" || source.localName === "a") && getHref(source);
      if (href && !href.startsWith("#") && !href.startsWith("data:")) {
        try {
          setHref(target, new URL(href, source.baseURI).href);
        } catch {
        }
      }
    });
    for (const el of hidden) el.remove();
    return clone;
  }
  function removeComments(root) {
    const walker = (
      /** @type {Document} */
      root.ownerDocument.createTreeWalker(root, 128)
    );
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    for (const comment of comments) comment.parentNode?.removeChild(comment);
  }
  function round(n) {
    return Math.round(n * 100) / 100;
  }
  function isAbsoluteLength(value) {
    return !!value && /^\s*[\d.]+\s*(px)?\s*$/i.test(value);
  }
  function applyRootGeometry(src, dst) {
    const rect = src.getBoundingClientRect();
    const renderedWidth = round(rect.width);
    const renderedHeight = round(rect.height);
    const hasRendered = renderedWidth > 0 && renderedHeight > 0;
    const width = src.getAttribute("width");
    const height = src.getAttribute("height");
    const hasSize = isAbsoluteLength(width) && isAbsoluteLength(height);
    if (!dst.hasAttribute("viewBox")) {
      if (hasSize) dst.setAttribute("viewBox", `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
      else if (hasRendered) dst.setAttribute("viewBox", `0 0 ${renderedWidth} ${renderedHeight}`);
    }
    if (!hasSize && hasRendered) {
      dst.setAttribute("width", String(renderedWidth));
      dst.setAttribute("height", String(renderedHeight));
    }
    dst.removeAttribute("x");
    dst.removeAttribute("y");
  }
  async function inlineExternalUses(clone, loadExternal) {
    const byFile = /* @__PURE__ */ new Map();
    for (const use of clone.querySelectorAll("use")) {
      const href = getHref(use);
      if (!href || href.startsWith("#") || !href.includes("#")) continue;
      try {
        const url = new URL(href, clone.ownerDocument.baseURI);
        const id = decodeURIComponent(url.hash.slice(1));
        url.hash = "";
        byFile.set(url.href, [...byFile.get(url.href) || [], { use, id }]);
      } catch {
      }
    }
    await Promise.all(
      [...byFile].map(async ([url, refs]) => {
        const sprite = parseSvgText(await loadExternal(url).catch(() => null) || "");
        if (!sprite) return;
        for (const { use, id } of refs) setHref(use, `#${id}`);
        pullInReferences(
          clone,
          (id) => findById(sprite, id),
          (el) => clone.ownerDocument.importNode(el, true)
        );
      })
    );
  }
  async function serializeSvgElement(svg, { loadExternal } = {}) {
    const view = svg.ownerDocument.defaultView;
    const cache = /* @__PURE__ */ new Map();
    const computed = (el) => {
      let style = cache.get(el);
      if (!style) {
        style = /** @type {Window} */
        view.getComputedStyle(el);
        cache.set(el, style);
      }
      return style;
    };
    const keepClasses = !!svg.querySelector("style");
    const clone = cloneWithStyles(svg, { keepClasses, inDefs: false, isRoot: true, computed });
    applyRootGeometry(svg, clone);
    const scope = (
      /** @type {Document | ShadowRoot} */
      svg.getRootNode()
    );
    pullInReferences(
      clone,
      (id) => {
        const el = scope.getElementById?.(id) ?? null;
        return el && el.namespaceURI === SVG_NS3 && !svg.contains(el) ? el : null;
      },
      (el) => cloneWithStyles(el, { keepClasses, inDefs: true, isRoot: false, computed })
    );
    if (loadExternal) await inlineExternalUses(clone, loadExternal);
    sanitizeSvg(clone);
    removeComments(clone);
    let markup = new XMLSerializer().serializeToString(clone);
    if (!/currentcolor/i.test(markup)) {
      for (const el of [clone, ...clone.querySelectorAll("[color], [style]")]) {
        el.removeAttribute("color");
        const style = (
          /** @type {SVGElement} */
          el.style
        );
        style?.removeProperty("color");
        if (style && style.length === 0) el.removeAttribute("style");
      }
      markup = new XMLSerializer().serializeToString(clone);
    }
    return markup;
  }

  // src/content-script/resolve.js
  var GrabError = class extends Error {
    /**
     * @param {string} message
     * @param {'no-access' | 'failed'} [code]
     */
    constructor(message, code = "failed") {
      super(message);
      this.code = code;
    }
  };
  var textCache = /* @__PURE__ */ new Map();
  async function fetchDirect(url) {
    const sameOrigin = new URL(url, location.href).origin === location.origin;
    const response = await fetch(url, { credentials: sameOrigin ? "include" : "omit" });
    if (!response.ok) throw new GrabError(`The site returned ${response.status} for this SVG.`);
    return response.text();
  }
  async function fetchViaBackground(url) {
    const response = await chrome.runtime.sendMessage({ action: MESSAGES.fetchSvg, url });
    if (response?.text) return response.text;
    if (response?.error === "no-access") {
      throw new GrabError(
        "This SVG lives on another domain. Turn on \u201CAll sites\u201D in SVG Grab Pro to grab it.",
        "no-access"
      );
    }
    throw new GrabError(response?.error || "Couldn\u2019t download this SVG.");
  }
  function loadSvgText(url) {
    const cached = textCache.get(url);
    if (cached) return cached;
    const pending = (async () => {
      if (url.startsWith("data:")) return decodeSvgDataUrl(url);
      try {
        return await fetchDirect(url);
      } catch {
        return fetchViaBackground(url);
      }
    })();
    textCache.set(url, pending);
    pending.then(
      (text) => text || textCache.delete(url),
      () => textCache.delete(url)
    );
    return pending;
  }
  async function resolveTarget(target) {
    const options = {
      loadExternal: (url) => loadSvgText(url).catch(() => null)
    };
    if (target.kind === "inline") return serializeSvgElement(target.element, options);
    if (target.element.localName === "object") {
      try {
        const root = (
          /** @type {HTMLObjectElement} */
          target.element.contentDocument?.documentElement
        );
        if (root?.localName === "svg")
          return serializeSvgElement(
            /** @type {SVGSVGElement} */
            root,
            options
          );
      } catch {
      }
    }
    const text = await loadSvgText(target.url);
    const svg = text && (target.tint ? tintSvg(text, target.tint) : normalizeSvgText(text));
    if (!svg) throw new GrabError("That file isn\u2019t a valid SVG.");
    return svg;
  }

  // src/content-script/actions.js
  var FAILURE_MESSAGES = {
    "copy-svg": "Couldn\u2019t copy this SVG.",
    "download-svg": "Couldn\u2019t download this SVG."
  };
  async function runAction(action, { svg, name, ui }) {
    const pendingTimer = setTimeout(() => ui.toast("Fetching SVG\u2026", "pending"), 250);
    try {
      switch (action) {
        case "copy-svg":
          await writeClipboard(
            "text/plain",
            svg.then((text) => new Blob([text], { type: "text/plain" }))
          );
          ui.toast(`Copied ${name}.svg`);
          break;
        case "download-svg":
          downloadBlob(new Blob([await svg], { type: "image/svg+xml" }), `${name}.svg`);
          ui.toast(`Saved ${name}.svg`);
          break;
      }
    } catch (error) {
      const cause = await svg.then(
        () => error,
        (svgError) => svgError
      );
      console.warn("[SVG Grab Pro]", cause);
      ui.toast(cause instanceof GrabError ? cause.message : FAILURE_MESSAGES[action], "error");
    } finally {
      clearTimeout(pendingTimer);
    }
  }

  // src/content-script/scan.js
  var DRAWABLE_RE = /<(path|rect|circle|ellipse|line|polyline|polygon|text|image|use)[\s/>]/i;
  var CONCURRENCY = 6;
  var TIMEOUT_MS = 8e3;
  async function mapWithLimit(items, fn) {
    const results = new Array(items.length);
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
    return results;
  }
  function withTimeout(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS))
    ]);
  }
  async function scanPage() {
    const targets = collectPageTargets(document);
    const context = { pageUrl: location.href, viewportWidth: innerWidth, scrollY };
    let blocked = 0;
    const resolved = await mapWithLimit(
      targets,
      (target) => withTimeout(resolveTarget(target)).catch((error) => {
        if (error instanceof GrabError && error.code === "no-access") blocked++;
        return null;
      })
    );
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    const elements = /* @__PURE__ */ new Map();
    resolved.forEach((svg, order) => {
      if (!svg || !DRAWABLE_RE.test(svg) || seen.has(svg)) return;
      seen.add(svg);
      const target = targets[order];
      const element = target.element;
      const score = scoreLogo(element, context);
      const isLogo = score >= LOGO_SCORE_THRESHOLD;
      const size = getSvgSize(svg);
      const id = `svg-${order}`;
      elements.set(id, element);
      items.push({
        id,
        name: suggestName(element, {
          url: target.kind === "url" ? target.url : void 0,
          hostname: location.hostname,
          isLogo
        }),
        svg,
        isLogo,
        score,
        order,
        width: size?.width ?? null,
        height: size?.height ?? null,
        bytes: byteLength(svg),
        source: target.kind === "inline" ? "inline" : ["img", "object", "embed"].includes(element.localName) ? "file" : "css"
      });
    });
    items.sort(
      (a, b) => Number(b.isLogo) - Number(a.isLogo) || (a.isLogo ? b.score - a.score : 0) || a.order - b.order
    );
    const names = dedupeNames(items.map((item) => item.name));
    return {
      items: items.map(({ score: _score, order: _order, ...item }, index) => ({
        ...item,
        name: names[index]
      })),
      elements,
      blocked
    };
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

  // src/content-script/ui-styles.js
  var UI_STYLES = `
:host {
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --bg: rgba(255, 255, 255, 0.86);
  --bg-solid: #ffffff;
  --text: #18181b;
  --muted: #71717a;
  --faint: #a1a1aa;
  --hover: rgba(24, 24, 27, 0.06);
  --line: rgba(24, 24, 27, 0.08);
  --check: rgba(24, 24, 27, 0.05);
  --accent: #5e5ce6;
  --success: #1f9d55;
  --danger: #e5484d;
  --shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 12px 32px -6px rgba(0, 0, 0, 0.18);
  color-scheme: light;
}
:host([data-scheme="dark"]) {
  --bg: rgba(30, 30, 33, 0.82);
  --bg-solid: #1e1e21;
  --text: #f4f4f5;
  --muted: #a1a1aa;
  --faint: #71717a;
  --hover: rgba(255, 255, 255, 0.08);
  --line: rgba(255, 255, 255, 0.08);
  --check: rgba(255, 255, 255, 0.05);
  --accent: #7d7aff;
  --success: #3dd68c;
  --danger: #ff6369;
  --shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.3),
    0 16px 40px -8px rgba(0, 0, 0, 0.55);
  color-scheme: dark;
}

* { box-sizing: border-box; }

.surface {
  position: fixed;
  pointer-events: auto;
  font: 13px/18px var(--font);
  letter-spacing: -0.005em;
  color: var(--text);
  background: var(--bg);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: var(--shadow);
  -webkit-font-smoothing: antialiased;
}

/* \u2014\u2014\u2014 Menu \u2014\u2014\u2014 */
.menu {
  top: 0;
  left: 0;
  width: 248px;
  padding: 5px;
  border-radius: 12px;
  outline: none;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 100ms ease, transform 150ms var(--ease-out);
}
.menu[data-open] { opacity: 1; transform: none; }
/* Exits are simpler than entries: the choice is made, just get out of the way. */
.menu[data-closing] { opacity: 0; transform: none; transition: opacity 80ms ease; }

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 5px 7px;
}
.thumb {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 6px;
  border-radius: 8px;
  background: conic-gradient(var(--check) 25%, transparent 0 50%, var(--check) 0 75%, transparent 0) 0 0 / 8px 8px;
  box-shadow: inset 0 0 0 0.5px var(--line);
  overflow: hidden;
}
.thumb > img, .thumb > svg { width: 100%; height: 100%; display: block; object-fit: contain; }
.thumb[data-loading]::after {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  border-top-color: var(--muted);
  animation: spin 700ms linear infinite;
}
.meta { min-width: 0; flex: 1; }
.name {
  font-weight: 560;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  margin-top: 1px;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}
.badge {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10px;
  line-height: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  vertical-align: 1px;
}
.sep { height: 1px; margin: 4px 6px; background: var(--line); }

.item {
  all: unset;
  box-sizing: border-box; /* all: unset resets it, so width: 100% plus padding overflowed */
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border-radius: 7px;
  cursor: default;
  color: var(--text);
  font: inherit;
}
.item svg { flex: none; color: var(--muted); }
.item span { flex: 1; }
.item[data-active] { background: var(--hover); }
.item[data-active] svg { color: var(--text); }
.menu[data-error] .item { color: var(--faint); }
.menu[data-error] .thumb { color: var(--danger); }
.item:focus-visible { box-shadow: inset 0 0 0 1.5px var(--accent); }

/* \u2014\u2014\u2014 Highlight \u2014\u2014\u2014 */
.ring {
  position: fixed;
  pointer-events: none;
  border-radius: 6px;
  box-shadow: 0 0 0 1.5px var(--accent), 0 0 0 5px color-mix(in srgb, var(--accent) 22%, transparent);
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  opacity: 0;
  transition: opacity 100ms ease;
}
.ring[data-open] { opacity: 1; transition-duration: 120ms; }
.ring-label {
  position: absolute;
  left: -1.5px;
  bottom: calc(100% + 8px);
  max-width: 240px;
  padding: 2px 7px;
  border-radius: 5px;
  font: 500 11px/16px var(--font);
  color: #fff;
  background: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ring-label:empty { display: none; }
.ring[data-below] .ring-label { bottom: auto; top: calc(100% + 8px); }

/* \u2014\u2014\u2014 Toast \u2014\u2014\u2014 */
.toast {
  left: 50%;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 8px 14px 8px 8px;
  border-radius: 999px;
  font-weight: 500;
  opacity: 0;
  transform: translate(-50%, 8px) scale(0.97);
  transition: opacity 120ms ease, transform 150ms ease;
}
.toast[data-open] {
  opacity: 1;
  transform: translate(-50%, 0);
  transition: opacity 160ms ease, transform 300ms var(--ease-out);
}
.toast-icon[data-pop] { animation: icon-pop 300ms var(--ease-out) both; }
.toast-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
  background: var(--success);
}
.toast-icon svg { width: 14px; height: 14px; stroke-width: 2.5; }
.toast[data-tone="error"] .toast-icon { background: var(--danger); }
/* The dark theme's brighter green needs a dark check for contrast. */
:host([data-scheme="dark"]) .toast[data-tone="success"] .toast-icon { color: #000; }
.toast[data-tone="pending"] .toast-icon { background: var(--hover); }
.toast[data-tone="pending"] .toast-icon::after {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  border-top-color: var(--text);
  animation: spin 700ms linear infinite;
}
.toast-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toast[data-tone="error"] { border-radius: 14px; }
.toast[data-tone="error"] .toast-text { white-space: normal; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes icon-pop { from { transform: scale(0.6); opacity: 0; } }
@keyframes fade-in { from { opacity: 0; } }

/* Reduced motion: gentler, not zero. Fades stay; scaling and sliding go. */
@media (prefers-reduced-motion: reduce) {
  .menu, .menu[data-closing] { transform: none; }
  .toast, .toast[data-open] { transform: translate(-50%, 0); }
  .toast-icon[data-pop] { animation-name: fade-in; }
}
`;

  // src/content-script/ui.js
  var MENU_ITEMS = [
    { id: "copy-svg", label: "Copy SVG", icon: ICONS.copy },
    { id: "download-svg", label: "Download SVG", icon: ICONS.download }
  ];
  var HOST_STYLE = [
    "all: initial",
    "position: fixed",
    "inset: 0 auto auto 0",
    "width: 0",
    "height: 0",
    "margin: 0",
    "padding: 0",
    "border: 0",
    "overflow: visible",
    "background: transparent",
    "display: block",
    "z-index: 2147483647",
    "pointer-events: none"
  ].map((rule) => `${rule} !important`).join(";");
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
  }
  function renderThumbnail(container, svgText) {
    const image = new Image();
    image.alt = "";
    image.onload = () => {
      container.removeAttribute("data-loading");
      container.replaceChildren(image);
    };
    image.onerror = () => {
      container.removeAttribute("data-loading");
      container.innerHTML = ICONS.image;
    };
    image.src = svgToDataUrl(svgText);
  }
  function createUi() {
    const host = document.createElement("svg-grab-pro");
    host.setAttribute("style", HOST_STYLE);
    const supportsPopover = "popover" in HTMLElement.prototype;
    if (supportsPopover) host.setAttribute("popover", "manual");
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>${UI_STYLES}</style>`;
    let destroyed = false;
    function mount() {
      if (destroyed) return;
      if (!host.isConnected) document.documentElement.appendChild(host);
      if (!supportsPopover) return;
      try {
        if (host.matches(":popover-open")) host.hidePopover();
        host.showPopover();
      } catch {
      }
    }
    let menu = null;
    function setActive(index) {
      if (!menu) return;
      menu.active = index;
      menu.items.forEach((item, i) => item.toggleAttribute("data-active", i === index));
      menu.items[index]?.focus({ preventScroll: true });
    }
    function pick(action) {
      const onPick = menu?.onPick;
      hideMenu();
      onPick?.(action);
    }
    function showMenu(x, y, { onPick, onClose }) {
      hideMenu(true);
      const el = document.createElement("div");
      el.className = "surface menu";
      el.setAttribute("role", "menu");
      el.setAttribute("aria-label", "SVG Grab Pro");
      el.tabIndex = -1;
      el.innerHTML = `
      <div class="head">
        <div class="thumb" data-loading></div>
        <div class="meta"><div class="name"></div><div class="sub"></div></div>
      </div>
      <div class="sep"></div>
      ${MENU_ITEMS.map(
        (item) => `<button class="item" role="menuitem" tabindex="-1" data-action="${item.id}">${item.icon}<span>${item.label}</span></button>`
      ).join("")}`;
      const items = (
        /** @type {HTMLElement[]} */
        [...el.querySelectorAll(".item")]
      );
      el.addEventListener("pointermove", (event) => {
        const item = (
          /** @type {Element} */
          event.target.closest(".item")
        );
        if (item) setActive(items.indexOf(
          /** @type {HTMLElement} */
          item
        ));
      });
      el.addEventListener("pointerleave", () => setActive(-1));
      el.addEventListener("click", (event) => {
        const item = (
          /** @type {HTMLElement | null} */
          /** @type {Element} */
          event.target.closest(".item")
        );
        if (item) pick(
          /** @type {MenuAction} */
          item.dataset.action
        );
      });
      el.addEventListener("contextmenu", (event) => event.preventDefault());
      root.appendChild(el);
      mount();
      const { width, height } = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(x, innerWidth - width - 8));
      const flipUp = y + height > innerHeight - 8 && y - height >= 8;
      const top = flipUp ? y - height : Math.max(8, Math.min(y, innerHeight - height - 8));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.transformOrigin = `${x - left}px ${flipUp ? "100%" : `${y - top}px`}`;
      menu = { el, items, active: -1, onPick, onClose, restoreFocus: document.activeElement };
      el.focus({ preventScroll: true });
      requestAnimationFrame(() => el.setAttribute("data-open", ""));
      const current = menu;
      return {
        /** @param {{ name: string; sub: string; badge?: string; svg?: string; error?: boolean }} meta */
        setMeta({ name, sub, badge, svg, error }) {
          if (menu !== current) return;
          const nameEl = (
            /** @type {HTMLElement} */
            el.querySelector(".name")
          );
          const subEl = (
            /** @type {HTMLElement} */
            el.querySelector(".sub")
          );
          const thumb = (
            /** @type {HTMLElement} */
            el.querySelector(".thumb")
          );
          nameEl.textContent = name;
          nameEl.title = name;
          subEl.innerHTML = `${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ""}${escapeHtml(sub)}`;
          subEl.title = sub;
          if (svg) renderThumbnail(thumb, svg);
          if (error) {
            thumb.removeAttribute("data-loading");
            thumb.innerHTML = ICONS.alert;
            el.setAttribute("data-error", "");
          }
        }
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
      el.removeAttribute("data-open");
      el.setAttribute("data-closing", "");
      setTimeout(() => el.remove(), 100);
    }
    function handleMenuKey(event) {
      if (!menu) return false;
      const { items, active } = menu;
      switch (event.key) {
        case "Escape":
          hideMenu();
          return true;
        case "ArrowDown":
        case "Tab":
          setActive(
            event.key === "Tab" && event.shiftKey ? (active - 1 + items.length) % items.length : (active + 1) % items.length
          );
          return true;
        case "ArrowUp":
          setActive(active <= 0 ? items.length - 1 : active - 1);
          return true;
        case "Home":
          setActive(0);
          return true;
        case "End":
          setActive(items.length - 1);
          return true;
        case "Enter":
        case " ":
          if (active >= 0) pick(
            /** @type {MenuAction} */
            items[active].dataset.action
          );
          return true;
      }
      return false;
    }
    let ring = null;
    function highlight(target, label = "") {
      const rect = target.getBoundingClientRect();
      const visible = rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      if (!visible) {
        clearHighlight();
        return;
      }
      if (!ring) {
        ring = document.createElement("div");
        ring.className = "ring";
        ring.innerHTML = '<div class="ring-label"></div>';
        root.appendChild(ring);
      }
      mount();
      const pad = 3;
      Object.assign(ring.style, {
        left: `${rect.left - pad}px`,
        top: `${rect.top - pad}px`,
        width: `${rect.width + pad * 2}px`,
        height: `${rect.height + pad * 2}px`
      });
      ring.toggleAttribute("data-below", rect.top < 36);
      ring.firstElementChild.textContent = label;
      const el = ring;
      requestAnimationFrame(() => el.setAttribute("data-open", ""));
    }
    function clearHighlight() {
      ring?.removeAttribute("data-open");
    }
    let toastEl = null;
    let toastTimer;
    function toast(message, tone = "success") {
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "surface toast";
        toastEl.setAttribute("role", "status");
        toastEl.setAttribute("aria-live", "polite");
        toastEl.innerHTML = '<div class="toast-icon"></div><div class="toast-text"></div>';
        root.appendChild(toastEl);
      }
      mount();
      const el = toastEl;
      el.dataset.tone = tone;
      const icon2 = (
        /** @type {HTMLElement} */
        el.firstElementChild
      );
      icon2.innerHTML = tone === "success" ? ICONS.check : tone === "error" ? ICONS.alert : "";
      icon2.removeAttribute("data-pop");
      if (tone !== "pending") {
        void icon2.offsetWidth;
        icon2.setAttribute("data-pop", "");
      }
      el.lastElementChild.textContent = message;
      requestAnimationFrame(() => el.setAttribute("data-open", ""));
      clearTimeout(toastTimer);
      if (tone !== "pending") {
        toastTimer = setTimeout(
          () => el.removeAttribute("data-open"),
          tone === "error" ? 4500 : 2200
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
      }
    };
  }

  // src/content-script/index.js
  var TEARDOWN_EVENT = "svg-grab-pro:teardown";
  document.dispatchEvent(new Event(TEARDOWN_EVENT));
  start();
  function isEditable(node) {
    const el = (
      /** @type {Element} */
      node
    );
    return !!el.closest?.(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
    );
  }
  function isInSelection(node) {
    const selection = getSelection();
    return !!selection && !selection.isCollapsed && selection.containsNode(node, true);
  }
  function start() {
    const abort = new AbortController();
    const { signal } = abort;
    const ui = createUi();
    let theme = "system";
    let enabled = true;
    let scanned = /* @__PURE__ */ new Map();
    const ports = /* @__PURE__ */ new Set();
    const applyTheme = () => ui.setScheme(resolveScheme(theme));
    getStoredTheme().then((stored) => {
      theme = stored;
      applyTheme();
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme, { signal });
    function onContextMenu(event) {
      if (!chrome.runtime?.id) {
        destroy();
        return;
      }
      if (ui.contains(event.target)) {
        event.preventDefault();
        return;
      }
      const path2 = event.composedPath();
      const origin = (
        /** @type {Node} */
        path2[0]
      );
      if (!enabled || event.shiftKey || !origin || isEditable(origin) || isInSelection(origin)) {
        ui.hideMenu();
        return;
      }
      const target = findTargetAtPoint({ path: path2, x: event.clientX, y: event.clientY, doc: document });
      if (!target) {
        ui.hideMenu();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openMenu(target, event.clientX, event.clientY);
    }
    function openMenu(target, x, y) {
      const { element } = target;
      const isLogo = scoreLogo(element, { pageUrl: location.href, viewportWidth: innerWidth, scrollY }) >= LOGO_SCORE_THRESHOLD;
      const name = suggestName(element, {
        url: target.kind === "url" ? target.url : void 0,
        hostname: location.hostname,
        isLogo
      });
      const badge = isLogo ? "Logo" : "";
      const svg = resolveTarget(target);
      svg.catch(() => {
      });
      ui.highlight(element);
      const menu = ui.showMenu(x, y, {
        onPick: (action) => runAction(action, { svg, name, ui }),
        onClose: () => ui.clearHighlight()
      });
      menu.setMeta({
        name: `${name}.svg`,
        badge,
        sub: target.kind === "url" ? "Fetching\u2026" : "Reading\u2026"
      });
      svg.then(
        (markup) => {
          const details = [formatSize(getSvgSize(markup)), formatBytes(byteLength(markup))].filter(
            Boolean
          );
          menu.setMeta({ name: `${name}.svg`, badge, sub: details.join(" \xB7 "), svg: markup });
        },
        (error) => menu.setMeta({
          name: `${name}.svg`,
          badge,
          sub: error instanceof GrabError && error.code === "no-access" ? "Needs \u201CAll sites\u201D access" : "Couldn\u2019t read this SVG",
          error: true
        })
      );
    }
    const closeMenu = () => ui.hideMenu();
    window.addEventListener("contextmenu", onContextMenu, { capture: true, signal });
    window.addEventListener(
      "pointerdown",
      (event) => {
        if (ui.isMenuOpen && !ui.contains(event.target)) ui.hideMenu();
      },
      { capture: true, signal }
    );
    window.addEventListener(
      "keydown",
      (event) => {
        if (ui.handleMenuKey(event)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true, signal }
    );
    window.addEventListener("scroll", closeMenu, { capture: true, passive: true, signal });
    window.addEventListener("resize", closeMenu, { signal });
    window.addEventListener("blur", closeMenu, { signal });
    function onConnect(port) {
      if (port.name !== POPUP_PORT) return;
      enabled = true;
      ports.add(port);
      const post = (message) => {
        try {
          port.postMessage(message);
        } catch {
        }
      };
      port.onMessage.addListener(async (message) => {
        if (message.type === "scan") {
          const { items, elements, blocked } = await scanPage();
          scanned = elements;
          post({ type: "scan", items, blocked });
        } else if (message.type === "highlight") {
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
    function onStorageChanged(changes, area) {
      if (area !== "local") return;
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
        for (const port of ports) port.disconnect();
        chrome.runtime.onConnect.removeListener(onConnect);
        chrome.storage.onChanged.removeListener(onStorageChanged);
      } catch {
      }
    }
    document.addEventListener(TEARDOWN_EVENT, destroy, { once: true, signal });
  }
})();
