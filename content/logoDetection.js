function getClassNameAsString(element) {
  if (!element) return '';
  
  // Handle different types of className property
  if (typeof element.className === 'string') {
    return element.className.toLowerCase();
  } else if (element.className && element.className.baseVal) {
    // SVG elements often have className.baseVal
    return element.className.baseVal.toLowerCase();
  } else if (element.getAttribute) {
    // Fallback to getAttribute
    const classAttr = element.getAttribute('class');
    return classAttr ? classAttr.toLowerCase() : '';
  }
  
  return '';
}

const STRONG_LOGO_KEYWORDS = ['logo', 'logotype', 'logomark', 'brandmark', 'wordmark'];
const SUPPORTING_LOGO_KEYWORDS = ['brand', 'branding', 'company', 'site-name', 'sitename', 'identity'];
const COMMON_UI_ICON_KEYWORDS = [
  'arrow', 'avatar', 'bell', 'calendar', 'caret', 'cart', 'chevron', 'clock',
  'close', 'copy', 'download', 'email', 'facebook', 'github', 'hamburger',
  'heart', 'instagram', 'linkedin', 'loader', 'mail', 'menu', 'minus',
  'notification', 'pause', 'play', 'plus', 'search', 'settings', 'share',
  'spinner', 'star', 'trash', 'twitter', 'upload', 'user', 'youtube'
];

function getAttributeValue(element, attributeName) {
  if (!element) return '';
  if (element.getAttribute) {
    return element.getAttribute(attributeName) || '';
  }
  return element[attributeName] || '';
}

function hasKeywordSignal(value, keywords) {
  const text = String(value || '').toLowerCase();
  if (!text) return false;

  const compactText = text.replace(/[^a-z0-9]/g, '');
  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean);

  return keywords.some(keyword => {
    const normalizedKeyword = keyword.toLowerCase();
    const compactKeyword = normalizedKeyword.replace(/[^a-z0-9]/g, '');
    return tokens.includes(normalizedKeyword) || compactText.includes(compactKeyword);
  });
}

function getElementSignals(element) {
  return [
    element.id || '',
    getClassNameAsString(element),
    getAttributeValue(element, 'aria-label'),
    getAttributeValue(element, 'alt'),
    getAttributeValue(element, 'title'),
    getAttributeValue(element, 'role')
  ].join(' ');
}

function isSvgSourceElement(element) {
  const src = element.src || getAttributeValue(element, 'src');
  const srcset = element.srcset || getAttributeValue(element, 'srcset');
  const type = element.type || getAttributeValue(element, 'type');
  const normalizedSrc = String(src || '').toLowerCase();
  const normalizedSrcset = String(srcset || '').toLowerCase();

  return normalizedSrc.endsWith('.svg') ||
    normalizedSrc.includes('.svg?') ||
    normalizedSrc.includes('/svg') ||
    normalizedSrc.match(/\.svg/i) ||
    normalizedSrcset.includes('.svg') ||
    type === 'image/svg+xml';
}

function isHomepageHref(href) {
  const trimmedHref = String(href || '').trim();
  if (!trimmedHref || trimmedHref === '#') return false;

  try {
    const targetUrl = new URL(trimmedHref, window.location.href);
    const currentUrl = new URL(window.location.href);
    const normalizedPath = targetUrl.pathname.replace(/\/+$/, '');

    return targetUrl.origin === currentUrl.origin &&
      (normalizedPath === '' || normalizedPath === '/home' || normalizedPath === '/index.html');
  } catch (e) {
    return false;
  }
}

function closestHomepageLink(element) {
  let parent = element.parentElement;
  let depth = 0;
  const maxDepth = 4;

  while (parent && depth < maxDepth) {
    if (parent.tagName && parent.tagName.toLowerCase() === 'a' && isHomepageHref(getAttributeValue(parent, 'href'))) {
      return parent;
    }

    parent = parent.parentElement;
    depth++;
  }

  return null;
}

// Helper function to check if an element is likely a logo
function isLikelyLogo(element) {
  if (!element || !element.tagName) return false;

  const tagName = element.tagName.toLowerCase();
  let score = 0;
  let hasBrandSignal = false;
  let hasHeaderContext = false;
  let hasNegativeSignal = false;
  let isTopOrLeft = false;
  
  if (tagName === 'svg') {
    score += 10;
  } else if (['object', 'img', 'embed'].includes(tagName) && isSvgSourceElement(element)) {
    score += 14;
  } else {
    return false;
  }

  const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
  if (rect && rect.width > 0 && rect.height > 0) {
    if (rect.width < 12 || rect.height < 12) return false;

    if (rect.width <= 500 && rect.height <= 220) {
      score += 8;
    }

    if (rect.width >= 40 && rect.height >= 20) {
      score += 6;
    } else if (rect.width < 32 && rect.height < 32) {
      score -= 12;
    }

    const ratio = rect.width / rect.height;
    if (ratio >= 0.25 && ratio <= 8) {
      score += 4;
    } else {
      score -= 10;
    }

    isTopOrLeft = rect.top < window.innerHeight * 0.35 || rect.left < window.innerWidth * 0.25;
    if (isTopOrLeft) {
      score += 8;
    }
  }

  const elementSignals = getElementSignals(element);
  if (hasKeywordSignal(elementSignals, STRONG_LOGO_KEYWORDS)) {
    score += 32;
    hasBrandSignal = true;
  }

  if (hasKeywordSignal(elementSignals, SUPPORTING_LOGO_KEYWORDS)) {
    score += 16;
    hasBrandSignal = true;
  }

  if (hasKeywordSignal(elementSignals, COMMON_UI_ICON_KEYWORDS)) {
    score -= 36;
    hasNegativeSignal = true;
  }
  
  let parent = element.parentElement;
  let depth = 0;
  const maxDepth = 6;
  
  while (parent && depth < maxDepth) {
    const tagName = parent.tagName.toLowerCase();
    const parentSignals = getElementSignals(parent);
    
    if (tagName === 'header' || tagName === 'nav') {
      score += 14;
      hasHeaderContext = true;
    } else if (tagName === 'footer') {
      score += 4;
    }

    if (hasKeywordSignal(parentSignals, ['header', 'nav', 'navbar', 'masthead'])) {
      score += 10;
      hasHeaderContext = true;
    } else if (hasKeywordSignal(parentSignals, ['footer'])) {
      score += 3;
    }

    if (hasKeywordSignal(parentSignals, STRONG_LOGO_KEYWORDS)) {
      score += 26;
      hasBrandSignal = true;
    }

    if (hasKeywordSignal(parentSignals, SUPPORTING_LOGO_KEYWORDS)) {
      score += 12;
      hasBrandSignal = true;
    }

    if (hasKeywordSignal(parentSignals, COMMON_UI_ICON_KEYWORDS)) {
      score -= 30;
      hasNegativeSignal = true;
    }
    
    parent = parent.parentElement;
    depth++;
  }

  if (closestHomepageLink(element)) {
    score += 28;
    hasBrandSignal = true;
  }
  
  if (hasBrandSignal) {
    return score >= 44;
  }

  return score >= 58 && hasHeaderContext && isTopOrLeft && !hasNegativeSignal;
}

function findSvgElement(element) {
  // If the element itself is an SVG
  if (element.tagName && element.tagName.toLowerCase() === 'svg') {
    return element;
  }
  
  // If it's an image/object/embed with SVG
  if (element.tagName && ['object', 'img', 'embed'].includes(element.tagName.toLowerCase())) {
    const src = element.src || element.getAttribute('src') || '';
    const srcset = element.srcset || element.getAttribute('srcset') || '';
    const type = element.type || element.getAttribute('type') || '';
    
    // Check if src contains .svg or if type is svg
    if (src.toLowerCase().endsWith('.svg') || 
        src.toLowerCase().includes('.svg?') || 
        src.toLowerCase().includes('/svg') || 
        src.match(/\.svg/i) || 
        type === 'image/svg+xml') {
      return element;
    }
    
    // Check if srcset contains svg
    if (srcset.toLowerCase().includes('.svg')) {
      return element;
    }
  }
  
  // Check for SVG children
  const svgChild = element.querySelector('svg');
  if (svgChild) {
    return svgChild;
  }
  
  // Check for SVG parent
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName && parent.tagName.toLowerCase() === 'svg') {
      return parent;
    }
    parent = parent.parentElement;
  }
  
  return null;
}

