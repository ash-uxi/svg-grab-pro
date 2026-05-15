const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeElement {
  constructor(tagName, attributes = {}, rect = { width: 100, height: 40, top: 20, left: 20 }) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.id = attributes.id || '';
    this.className = attributes.class || attributes.className || '';
    this.alt = attributes.alt || '';
    this.src = attributes.src || '';
    this.srcset = attributes.srcset || '';
    this.type = attributes.type || '';
    this.parentElement = null;
    this.children = [];
    this.rect = rect;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  querySelector(selector) {
    if (selector !== 'svg') return null;
    return this.children.find(child => child.tagName.toLowerCase() === 'svg') || null;
  }
}

function createContext() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'contentScript.js'), 'utf8');
  const context = {
    URL,
    console: {
      log() {},
      error() {}
    },
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    window: {
      innerHeight: 800,
      innerWidth: 1200,
      location: {
        href: 'https://example.com/products',
        origin: 'https://example.com'
      },
      addEventListener() {}
    },
    document: {
      readyState: 'complete',
      addEventListener() {},
      documentElement: { style: { setProperty() {} } }
    },
    chrome: {
      storage: {
        local: {
          get(key, callback) {
            callback({ allSitesEnabled: false });
          },
          set() {}
        },
        onChanged: {
          addListener() {}
        }
      },
      runtime: {
        onMessage: {
          addListener() {}
        }
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function wrap(element, ancestors) {
  let child = element;
  for (const ancestor of ancestors) {
    ancestor.appendChild(child);
    child = ancestor;
  }
  return element;
}

const { isLikelyLogo } = createContext();

const header = new FakeElement('header', { class: 'site-header' });
const homeLink = new FakeElement('a', { href: '/' });
const unlabeledHeaderLogo = wrap(
  new FakeElement('svg', {}, { width: 120, height: 36, top: 18, left: 24 }),
  [homeLink, header]
);
assert.strictEqual(isLikelyLogo(unlabeledHeaderLogo), true, 'homepage-linked header SVG should be treated as a logo');

const namedImgLogo = new FakeElement(
  'img',
  { src: '/assets/acme.svg', alt: 'Acme logo' },
  { width: 160, height: 48, top: 40, left: 60 }
);
assert.strictEqual(isLikelyLogo(namedImgLogo), true, 'SVG image with logo alt text should be treated as a logo');

const menuIcon = wrap(
  new FakeElement('svg', { class: 'menu icon', 'aria-label': 'Open menu' }, { width: 24, height: 24, top: 20, left: 20 }),
  [new FakeElement('button', { 'aria-label': 'Open menu' }), new FakeElement('header', { class: 'site-header' })]
);
assert.strictEqual(isLikelyLogo(menuIcon), false, 'menu icon in a header should not be treated as a logo');

const searchIcon = wrap(
  new FakeElement('svg', { class: 'search icon', 'aria-label': 'Search' }, { width: 24, height: 24, top: 24, left: 240 }),
  [new FakeElement('nav', { class: 'main-navigation' })]
);
assert.strictEqual(isLikelyLogo(searchIcon), false, 'search icon in navigation should not be treated as a logo');

const socialIcon = wrap(
  new FakeElement('svg', { class: 'twitter icon', 'aria-label': 'Twitter' }, { width: 24, height: 24, top: 720, left: 80 }),
  [new FakeElement('a', { href: 'https://twitter.com/acme' }), new FakeElement('footer', { class: 'site-footer' })]
);
assert.strictEqual(isLikelyLogo(socialIcon), false, 'social icon in a footer should not be treated as a logo');

const downloadImage = new FakeElement(
  'img',
  { src: '/assets/download.svg', alt: 'Download icon' },
  { width: 24, height: 24, top: 80, left: 80 }
);
assert.strictEqual(isLikelyLogo(downloadImage), false, 'generic SVG icon image should not be treated as a logo');

const tinyLogo = new FakeElement(
  'svg',
  { class: 'brand-logo' },
  { width: 8, height: 8, top: 20, left: 20 }
);
assert.strictEqual(isLikelyLogo(tinyLogo), false, 'tiny SVGs should be ignored even with logo naming');

console.log('Logo detection accuracy tests passed');
