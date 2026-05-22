function isCrossOriginURL(url) {
  try {
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return false;
    }
    const parsed = new URL(url, window.location.href);
    return parsed.origin !== window.location.origin;
  } catch (e) {
    return true;
  }
}

function isSvgSourceUrl(src) {
  return (
    src.toLowerCase().endsWith('.svg') ||
    src.toLowerCase().includes('.svg?') ||
    !!src.match(/\.svg/i)
  );
}

function getSvgContent(element) {
  if (!element) return Promise.resolve(null);

  const tag = element.tagName.toLowerCase();

  if (tag === 'svg') {
    const clone = element.cloneNode(true);
    const computedStyle = window.getComputedStyle(element);
    const styleAttributes = ['fill', 'stroke', 'stroke-width', 'opacity', 'filter'];

    styleAttributes.forEach((attr) => {
      if (computedStyle[attr] && !clone.hasAttribute(attr)) {
        clone.setAttribute(attr, computedStyle[attr]);
      }
    });

    return Promise.resolve(clone.outerHTML);
  }

  if (['object', 'img', 'embed'].includes(tag)) {
    const src = element.src || element.getAttribute('src') || '';
    if (!isSvgSourceUrl(src)) {
      return Promise.resolve(null);
    }

    if (isCrossOriginURL(src)) {
      return Promise.reject(
        new Error('Cannot access SVG from a different domain (CORS restriction)')
      );
    }

    showNotification('Fetching SVG from source...');

    return fetch(src, {
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 403 || response.status === 401) {
            throw new Error(`Access denied (${response.status}). This SVG is protected.`);
          }
          if (response.status === 404) {
            throw new Error('SVG not found (404).');
          }
          throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then((svgContent) => {
        if (svgContent.includes('<svg') && svgContent.includes('</svg>')) {
          const svgMatch = svgContent.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
          return svgMatch ? svgMatch[0] : svgContent;
        }
        showNotification('The source does not contain valid SVG');
        return null;
      })
      .catch((err) => {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          showNotification('Cannot access SVG (network error)');
        } else {
          showNotification(err.message || 'Could not fetch SVG');
        }
        throw err;
      });
  }

  return Promise.resolve(null);
}

function resolveDownloadFilename(element) {
  let filename = 'logo.svg';
  if (!element) return filename;

  if (element.alt) {
    return element.alt.replace(/\s+/g, '-').toLowerCase() + '.svg';
  }
  if (element.id) {
    return element.id.replace(/\s+/g, '-').toLowerCase() + '.svg';
  }
  if (element.src) {
    const urlParts = element.src.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart.includes('.svg')) {
      return lastPart;
    }
  }
  return filename;
}

function copySvgToClipboard() {
  getSvgContent(SVGGrabProState.selectedSvgElement)
    .then((svgContent) => {
      if (!svgContent) {
        showNotification('Failed to get SVG content');
        return;
      }
      return navigator.clipboard.writeText(svgContent).then(() =>
        showNotification('SVG copied to clipboard')
      );
    })
    .catch((err) => {
      if (err && err.message) {
        showNotification(err.message);
      }
    });
}

function downloadSvg() {
  getSvgContent(SVGGrabProState.selectedSvgElement)
    .then((svgContent) => {
      if (!svgContent) {
        showNotification('Failed to get SVG content');
        return;
      }

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resolveDownloadFilename(SVGGrabProState.selectedSvgElement);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('SVG downloaded successfully');
    })
    .catch((err) => {
      if (err && err.message) {
        showNotification(err.message);
      }
    });
}
