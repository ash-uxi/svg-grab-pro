// Store the currently selected SVG element
let selectedSvgElement = null;
let customContextMenu = null;

// Create custom context menu element
function createCustomContextMenu() {
  // Only create the menu once
  if (customContextMenu) return;
  
  // Create the menu container
  customContextMenu = document.createElement('div');
  customContextMenu.className = 'svg-grab-pro-context-menu';
  customContextMenu.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    box-shadow: 0 4px 22px rgba(0, 0, 0, 0.12);
    padding: 6px 0;
    min-width: 200px;
    z-index: 2147483647;
    display: none;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 14px;
    font-weight: 400;
    color: #333;
    overflow: hidden;
    animation: svgGrabProFadeIn 0.15s ease-out;
    transform-origin: top left;
  `;
  
  // Add animation styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes svgGrabProFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes svgGrabProFadeOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.98); }
    }
    @media (prefers-color-scheme: dark) {
      .svg-grab-pro-context-menu {
        background: #2a2a2a;
        color: #f5f5f7;
        border-color: rgba(255, 255, 255, 0.1);
      }
      .svg-grab-pro-menu-header {
        color: rgba(255, 255, 255, 0.8) !important;
        border-bottom-color: rgba(255, 255, 255, 0.1) !important;
      }
      .svg-grab-pro-menu-option:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
      #svg-grab-pro-notification {
        background: #2a2a2a !important;
        color: #f5f5f7 !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Create menu header
  const header = document.createElement('div');
  header.className = 'svg-grab-pro-menu-header';
  header.textContent = 'SVG Grab Pro';
  header.style.cssText = `
    padding: 10px 16px;
    font-weight: 600;
    color: #2c3e50;
    border-bottom: 1px solid #f1f1f1;
    margin-bottom: 6px;
    font-size: 15px;
  `;
  customContextMenu.appendChild(header);

  // Create Copy SVG option
  const copyOption = document.createElement('div');
  copyOption.className = 'svg-grab-pro-menu-option';
  copyOption.style.cssText = `
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background-color 0.1s ease;
  `;
  
  const copyIcon = document.createElement('div');
  copyIcon.style.cssText = `
    width: 16px;
    height: 16px;
    margin-right: 12px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>');
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.8;
  `;
  copyOption.appendChild(copyIcon);
  
  const copyText = document.createElement('span');
  copyText.textContent = 'Copy SVG';
  copyOption.appendChild(copyText);
  
  copyOption.addEventListener('click', function() {
    hideCustomContextMenu();
    copySvgToClipboard();
  });
  copyOption.addEventListener('mouseover', function() {
    this.style.backgroundColor = '#f5f5f7';
  });
  copyOption.addEventListener('mouseout', function() {
    this.style.backgroundColor = 'transparent';
  });
  customContextMenu.appendChild(copyOption);

  // Create Download SVG option
  const downloadOption = document.createElement('div');
  downloadOption.className = 'svg-grab-pro-menu-option';
  downloadOption.style.cssText = `
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background-color 0.1s ease;
  `;
  
  const downloadIcon = document.createElement('div');
  downloadIcon.style.cssText = `
    width: 16px;
    height: 16px;
    margin-right: 12px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>');
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.8;
  `;
  downloadOption.appendChild(downloadIcon);
  
  const downloadText = document.createElement('span');
  downloadText.textContent = 'Download SVG';
  downloadOption.appendChild(downloadText);
  
  downloadOption.addEventListener('click', function() {
    hideCustomContextMenu();
    downloadSvg();
  });
  downloadOption.addEventListener('mouseover', function() {
    this.style.backgroundColor = '#f5f5f7';
  });
  downloadOption.addEventListener('mouseout', function() {
    this.style.backgroundColor = 'transparent';
  });
  customContextMenu.appendChild(downloadOption);

  // Add to DOM
  document.body.appendChild(customContextMenu);
}

// Show custom context menu at specified position
function showCustomContextMenu(x, y) {
  if (!customContextMenu) createCustomContextMenu();
  
  // Position the menu
  customContextMenu.style.left = `${x}px`;
  customContextMenu.style.top = `${y}px`;
  customContextMenu.style.display = 'block';
  customContextMenu.style.animation = 'svgGrabProFadeIn 0.15s ease-out';
  
  // Check if menu goes beyond right edge
  const menuRect = customContextMenu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (menuRect.right > viewportWidth) {
    customContextMenu.style.left = `${viewportWidth - menuRect.width - 5}px`;
  }
  
  // Check if menu goes beyond bottom edge
  if (menuRect.bottom > viewportHeight) {
    customContextMenu.style.top = `${viewportHeight - menuRect.height - 5}px`;
  }
}

// Hide custom context menu
function hideCustomContextMenu() {
  if (customContextMenu) {
    customContextMenu.style.animation = 'svgGrabProFadeOut 0.1s ease-out';
    setTimeout(() => {
      customContextMenu.style.display = 'none';
    }, 100);
  }
}

// Helper function to safely get class name as string
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

// Helper function to check if an element is likely a logo
function isLikelyLogo(element) {
  if (!element || !element.tagName) return false;
  
  // Initialize score
  let score = 0;
  
  // Check for SVG element
  if (element.tagName.toLowerCase() === 'svg') {
    score += 15; // Base score for being an SVG
    
    // Look at size - logos tend to be compact
    const rect = element.getBoundingClientRect();
    if (rect.width > 20 && rect.width < 400 && rect.height > 20 && rect.height < 200) {
      score += 10;
    }
    
    // Check aspect ratio - logos tend to be somewhat square-ish
    const ratio = rect.width / rect.height;
    if (ratio > 0.5 && ratio < 3) {
      score += 10;
    }
    
    // Check position - logos tend to be in the top or left of the page
    if (rect.top < window.innerHeight * 0.3 || rect.left < window.innerWidth * 0.2) {
      score += 15;
    }
    
    // Check if it's in header/nav/footer areas
    let parent = element.parentElement;
    let depth = 0;
    const maxDepth = 6; // Only check up to 6 levels up
    
    while (parent && depth < maxDepth) {
      const tagName = parent.tagName.toLowerCase();
      const id = parent.id ? parent.id.toLowerCase() : '';
      const className = getClassNameAsString(parent);
      
      // Check for common header/nav/footer elements
      if (tagName === 'header' || tagName === 'nav' || tagName === 'footer') {
        score += 20;
        break;
      }
      
      // Check for common ID/class patterns
      if (id.includes('header') || id.includes('nav') || id.includes('footer') || 
          id.includes('logo') || id.includes('brand')) {
        score += 15;
      }
      
      if (className.includes('header') || className.includes('nav') || className.includes('footer') || 
          className.includes('logo') || className.includes('brand')) {
        score += 15;
      }
      
      parent = parent.parentElement;
      depth++;
    }
    
    // Check if it's wrapped in a link to the homepage
    parent = element.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'a') {
      const href = parent.getAttribute('href');
      if (href === '/' || href === '#' || href.includes('home')) {
        score += 20;
      }
    }
    
    // Check for common logo/brand-related attributes
    const id = element.id ? element.id.toLowerCase() : '';
    const className = getClassNameAsString(element);
    const ariaLabel = element.getAttribute('aria-label') ? element.getAttribute('aria-label').toLowerCase() : '';
    const alt = element.getAttribute('alt') ? element.getAttribute('alt').toLowerCase() : '';
    const title = element.getAttribute('title') ? element.getAttribute('title').toLowerCase() : '';
    
    const logoKeywords = ['logo', 'brand', 'company', 'site', 'icon', 'emblem'];
    
    for (const keyword of logoKeywords) {
      if (id.includes(keyword)) score += 15;
      if (className.includes(keyword)) score += 15;
      if (ariaLabel.includes(keyword)) score += 15;
      if (alt.includes(keyword)) score += 15;
      if (title.includes(keyword)) score += 15;
    }
  }
  
  console.log('Logo detection score:', score, element);
  
  // Check threshold score - adjust this based on testing
  return score >= 40; // Minimum score to consider it a logo
}

// Find the SVG element at or near the clicked element
function findSvgElement(element) {
  // If the element itself is an SVG
  if (element.tagName && element.tagName.toLowerCase() === 'svg') {
    return element;
  }
  
  // If it's an image/object/embed with SVG
  if (element.tagName && ['object', 'img', 'embed'].includes(element.tagName.toLowerCase())) {
    if (element.src?.endsWith('.svg') || element.type === 'image/svg+xml') {
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

// Listen for contextmenu (right-click) events
document.addEventListener('contextmenu', function(event) {
  // Check if we right-clicked on or near an SVG
  const svgElement = findSvgElement(event.target);
  
  if (svgElement && isLikelyLogo(svgElement)) {
    // Store the SVG for later use
    selectedSvgElement = svgElement;
    
    // Prevent the default context menu
    event.preventDefault();
    
    // Show our custom context menu
    showCustomContextMenu(event.clientX, event.clientY);
  } else {
    // Not a logo SVG, let the default context menu show
    selectedSvgElement = null;
    hideCustomContextMenu();
  }
});

// Handle clicks outside the menu
document.addEventListener('click', function(event) {
  // Hide the menu if clicked outside
  if (customContextMenu && !customContextMenu.contains(event.target)) {
    hideCustomContextMenu();
  }
});

// Also hide on scroll and window resize
window.addEventListener('scroll', hideCustomContextMenu);
window.addEventListener('resize', hideCustomContextMenu);

// Function to copy SVG to clipboard
function copySvgToClipboard() {
  try {
    const svgContent = getSvgContent(selectedSvgElement);
    
    if (!svgContent) {
      showNotification('Failed to get SVG content');
      return;
    }
    
    // Use the Clipboard API to write the SVG
    navigator.clipboard.writeText(svgContent)
      .then(() => {
        showNotification('SVG copied to clipboard');
      })
      .catch(err => {
        showNotification('Failed to copy SVG: ' + err.message);
      });
  } catch (error) {
    showNotification('Error copying SVG: ' + error.message);
  }
}

// Function to download SVG as a file
function downloadSvg() {
  try {
    const svgContent = getSvgContent(selectedSvgElement);
    
    if (!svgContent) {
      showNotification('Failed to get SVG content');
      return;
    }
    
    // Create a blob from the SVG content
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logo.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Cleanup
    URL.revokeObjectURL(url);
    showNotification('SVG downloaded successfully');
  } catch (error) {
    showNotification('Error downloading SVG: ' + error.message);
  }
}

// Function to get SVG content (handles different SVG formats)
function getSvgContent(element) {
  // If it's an actual SVG element
  if (element.tagName.toLowerCase() === 'svg') {
    // Clone the node to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Make sure all styles are included
    const computedStyle = window.getComputedStyle(element);
    const styleAttributes = [
      'fill', 'stroke', 'stroke-width', 'opacity', 'filter'
    ];
    
    // Apply computed styles if they're not already set as attributes
    styleAttributes.forEach(attr => {
      if (computedStyle[attr] && !clone.hasAttribute(attr)) {
        clone.setAttribute(attr, computedStyle[attr]);
      }
    });
    
    return clone.outerHTML;
  }
  
  // If it's an SVG in an img, object, or embed
  if (['object', 'img', 'embed'].includes(element.tagName.toLowerCase())) {
    if (element.src?.endsWith('.svg')) {
      // We need fetch but that would require async
      // For now, we'll return a placeholder message
      showNotification('Direct SVG extraction not supported for this element type yet');
      return null;
    }
  }
  
  return null;
}

// Create and show a notification
let notificationTimeout;
function showNotification(message) {
  // Clear any existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  // Create or find notification element
  let notification = document.getElementById('svg-grab-pro-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'svg-grab-pro-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      color: #333;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      transform: translateY(10px);
      border: 1px solid rgba(0, 0, 0, 0.05);
    `;
    document.body.appendChild(notification);
  }
  
  // Update message and show notification
  notification.textContent = message;
  notification.style.opacity = '1';
  notification.style.transform = 'translateY(0)';
  
  // Hide after 3 seconds
  notificationTimeout = setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(10px)';
  }, 3000);
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  createCustomContextMenu();
});

// Setup to match system dark/light mode
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

// Function to update UI based on color scheme
function updateColorScheme(isDark) {
  // Theme is updated through the CSS media query
  console.log(`Color scheme changed to ${isDark ? 'dark' : 'light'} mode`);
}

// Initial check
updateColorScheme(darkModeMediaQuery.matches);

// Listen for changes in color scheme
darkModeMediaQuery.addEventListener('change', (e) => {
  updateColorScheme(e.matches);
});