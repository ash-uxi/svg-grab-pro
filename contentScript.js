// Store the currently selected SVG element
let selectedSvgElement = null;
let customContextMenu = null;
let currentTheme = 'light'; // Default theme

// Create CSS variables for theming
const themeVariables = `
  :root {
    /* Light theme variables (default) */
    --svg-grab-pro-bg-light: #FFFFFF;
    --svg-grab-pro-text-primary-light: #1A1C1F;
    --svg-grab-pro-text-secondary-light: #2c3e50;
    --svg-grab-pro-border-light: rgba(15, 16, 18, 0.12);
    --svg-grab-pro-shadow-light: 0px 24px 24px -12px rgba(9, 10, 11, 0.06);
    --svg-grab-pro-hover-light: rgba(15, 16, 18, 0.04);
    --svg-grab-pro-menu-border-light: #f1f1f1;
    --svg-grab-pro-stroke-light: #1A1C1F;
    --svg-grab-pro-opacity-light: 0.28;
    
    /* Dark theme variables */
    --svg-grab-pro-bg-dark: #212226;
    --svg-grab-pro-text-primary-dark: #F5F5F7;
    --svg-grab-pro-text-secondary-dark: rgba(255, 255, 255, 0.8);
    --svg-grab-pro-border-dark: rgba(255, 255, 255, 0.08);
    --svg-grab-pro-shadow-dark: 0px 24px 24px -12px rgba(0, 0, 0, 0.2);
    --svg-grab-pro-hover-dark: rgba(255, 255, 255, 0.04);
    --svg-grab-pro-menu-border-dark: rgba(255, 255, 255, 0.1);
    --svg-grab-pro-stroke-dark: #F5F5F7;
    --svg-grab-pro-opacity-dark: 0.2;
    
    /* Active theme variables (will be updated by JavaScript) */
    --svg-grab-pro-bg: var(--svg-grab-pro-bg-light);
    --svg-grab-pro-text-primary: var(--svg-grab-pro-text-primary-light);
    --svg-grab-pro-text-secondary: var(--svg-grab-pro-text-secondary-light);
    --svg-grab-pro-border: var(--svg-grab-pro-border-light);
    --svg-grab-pro-shadow: var(--svg-grab-pro-shadow-light);
    --svg-grab-pro-hover: var(--svg-grab-pro-hover-light);
    --svg-grab-pro-menu-border: var(--svg-grab-pro-menu-border-light);
    --svg-grab-pro-stroke: var(--svg-grab-pro-stroke-light);
    --svg-grab-pro-opacity: var(--svg-grab-pro-opacity-light);
  }
`;

// Initialize theme from storage
function initializeTheme() {
  chrome.storage.sync.get('theme', function(data) {
    if (data.theme) {
      currentTheme = data.theme;
    } else {
      // If no saved preference, check system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme = prefersDarkMode ? 'dark' : 'light';
    }
    updateThemeVariables();
    if (customContextMenu) {
      applyThemeToContextMenu();
    }
  });
}

// Listen for theme changes from the popup
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.theme) {
    currentTheme = changes.theme.newValue;
    updateThemeVariables();
    if (customContextMenu) {
      applyThemeToContextMenu();
    }
  }
});

// Update CSS custom properties based on current theme
function updateThemeVariables() {
  const root = document.documentElement;
  if (currentTheme === 'dark') {
    root.style.setProperty('--svg-grab-pro-bg', 'var(--svg-grab-pro-bg-dark)');
    root.style.setProperty('--svg-grab-pro-text-primary', 'var(--svg-grab-pro-text-primary-dark)');
    root.style.setProperty('--svg-grab-pro-text-secondary', 'var(--svg-grab-pro-text-secondary-dark)');
    root.style.setProperty('--svg-grab-pro-border', 'var(--svg-grab-pro-border-dark)');
    root.style.setProperty('--svg-grab-pro-shadow', 'var(--svg-grab-pro-shadow-dark)');
    root.style.setProperty('--svg-grab-pro-hover', 'var(--svg-grab-pro-hover-dark)');
    root.style.setProperty('--svg-grab-pro-menu-border', 'var(--svg-grab-pro-menu-border-dark)');
    root.style.setProperty('--svg-grab-pro-stroke', 'var(--svg-grab-pro-stroke-dark)');
    root.style.setProperty('--svg-grab-pro-opacity', 'var(--svg-grab-pro-opacity-dark)');
  } else {
    root.style.setProperty('--svg-grab-pro-bg', 'var(--svg-grab-pro-bg-light)');
    root.style.setProperty('--svg-grab-pro-text-primary', 'var(--svg-grab-pro-text-primary-light)');
    root.style.setProperty('--svg-grab-pro-text-secondary', 'var(--svg-grab-pro-text-secondary-light)');
    root.style.setProperty('--svg-grab-pro-border', 'var(--svg-grab-pro-border-light)');
    root.style.setProperty('--svg-grab-pro-shadow', 'var(--svg-grab-pro-shadow-light)');
    root.style.setProperty('--svg-grab-pro-hover', 'var(--svg-grab-pro-hover-light)');
    root.style.setProperty('--svg-grab-pro-menu-border', 'var(--svg-grab-pro-menu-border-light)');
    root.style.setProperty('--svg-grab-pro-stroke', 'var(--svg-grab-pro-stroke-light)');
    root.style.setProperty('--svg-grab-pro-opacity', 'var(--svg-grab-pro-opacity-light)');
  }
}

// Apply theme to context menu
function applyThemeToContextMenu() {
  if (!customContextMenu) return;
  
  // Update context menu styles
  customContextMenu.style.backgroundColor = 'var(--svg-grab-pro-bg)';
  customContextMenu.style.boxShadow = 'var(--svg-grab-pro-shadow)';
  
  // Update SVG stroke colors for icons
  const svgElements = customContextMenu.querySelectorAll('svg path');
  svgElements.forEach(path => {
    if (path.hasAttribute('stroke')) {
      path.setAttribute('stroke', 'var(--svg-grab-pro-stroke)');
    }
    if (path.hasAttribute('fill') && path.getAttribute('fill') !== 'none') {
      path.setAttribute('fill', 'var(--svg-grab-pro-stroke)');
    }
    if (path.style.opacity) {
      path.style.opacity = 'var(--svg-grab-pro-opacity)';
    }
    if (path.hasAttribute('opacity')) {
      path.setAttribute('opacity', 'var(--svg-grab-pro-opacity)');
    }
  });
  
  // Update text colors
  const textElements = customContextMenu.querySelectorAll('.menu-text');
  textElements.forEach(text => {
    text.style.color = 'var(--svg-grab-pro-text-primary)';
  });
}

// Create custom context menu element
function createCustomContextMenu() {
  // Only create the menu once
  if (customContextMenu) return;
  
  // Inject theme variables
  const styleEl = document.createElement('style');
  styleEl.textContent = themeVariables;
  document.head.appendChild(styleEl);
  
  // Initialize theme
  initializeTheme();
  
  // Create the menu container
  customContextMenu = document.createElement('div');
  customContextMenu.className = 'svg-grab-pro-context-menu';
  customContextMenu.style.cssText = `
    position: fixed;
    width: 100%;
    height: 100%;
    padding: 4px;
    background: var(--svg-grab-pro-bg);
    box-shadow: var(--svg-grab-pro-shadow);
    overflow: hidden;
    border-radius: 8px;
    z-index: 2147483647;
    display: none;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 2px;
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Arial, sans-serif;
    transition: opacity 0.15s ease-out, transform 0.15s ease-out;
  `;
  
  // Add animation styles
  const animationStyleEl = document.createElement('style');
  animationStyleEl.textContent = `
    @keyframes svgGrabProFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes svgGrabProFadeOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.98); }
    }
    
    .menu-option {
      align-self: stretch;
      padding: 6px;
      overflow: hidden;
      border-radius: 4px;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.1s ease;
    }
    
    .menu-option:hover {
      background-color: var(--svg-grab-pro-hover);
    }
    
    .menu-text {
      color: var(--svg-grab-pro-text-primary);
      font-size: 13px;
      font-weight: 500;
      line-height: 18px;
      word-wrap: break-word;
    }
    
    .menu-text-container {
      padding-left: 8px;
      padding-right: 8px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;
  document.head.appendChild(animationStyleEl);

  // Create Copy SVG option
  const copyOption = document.createElement('div');
  copyOption.className = 'menu-option';
  
  // Add the copy SVG icon
  const copyIconContainer = document.createElement('div');
  copyIconContainer.style.cssText = `
    width: 16px;
    height: 16px;
    position: relative;
  `;
  
  copyIconContainer.innerHTML = `
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity="0.28" d="M8.5 3.33333V7.99999M8.5 7.99999V12.6667M8.5 7.99999L13.1667 8M8.5 7.99999L3.83333 7.99999M8.5 7.99999L12.0284 11.5287M8.5 7.99999L4.9714 4.4714M8.5 7.99999L4.97157 11.5288M8.5 7.99999L12.0288 4.47156" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.16667 2.66667C9.16667 3.03486 8.86819 3.33333 8.5 3.33333C8.13181 3.33333 7.83333 3.03486 7.83333 2.66667C7.83333 2.29848 8.13181 2 8.5 2C8.86819 2 9.16667 2.29848 9.16667 2.66667Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.16667 13.3333C9.16667 13.7015 8.86819 14 8.5 14C8.13181 14 7.83333 13.7015 7.83333 13.3333C7.83333 12.9651 8.13181 12.6667 8.5 12.6667C8.86819 12.6667 9.16667 12.9651 9.16667 13.3333Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14.5 8C14.5 8.36819 14.2015 8.66667 13.8333 8.66667C13.4651 8.66667 13.1667 8.36819 13.1667 8C13.1667 7.63181 13.4651 7.33333 13.8333 7.33333C14.2015 7.33333 14.5 7.63181 14.5 8Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13.1667 4C13.1667 4.36819 12.8682 4.66667 12.5 4.66667C12.316 4.66667 12.1494 4.59211 12.0288 4.47157C11.908 4.35091 11.8333 4.18418 11.8333 4C11.8333 3.63181 12.1318 3.33333 12.5 3.33333C12.8682 3.33333 13.1667 3.63181 13.1667 4Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13.1667 12C13.1667 12.3682 12.8682 12.6667 12.5 12.6667C12.1318 12.6667 11.8333 12.3682 11.8333 12C11.8333 11.816 11.9079 11.6494 12.0284 11.5288C12.1491 11.408 12.3158 11.3333 12.5 11.3333C12.8682 11.3333 13.1667 11.6318 13.1667 12Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.83333 8C3.83333 8.36819 3.53486 8.66667 3.16667 8.66667C2.79848 8.66667 2.5 8.36819 2.5 8C2.5 7.63181 2.79848 7.33333 3.16667 7.33333C3.53486 7.33333 3.83333 7.63181 3.83333 8Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5.16667 4C5.16667 4.1841 5.09205 4.35076 4.9714 4.47141C4.85076 4.59205 4.68409 4.66667 4.5 4.66667C4.13181 4.66667 3.83333 4.36819 3.83333 4C3.83333 3.63181 4.13181 3.33333 4.5 3.33333C4.86819 3.33333 5.16667 3.63181 5.16667 4Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5.16667 12C5.16667 12.3682 4.86819 12.6667 4.5 12.6667C4.13181 12.6667 3.83333 12.3682 3.83333 12C3.83333 11.6318 4.13181 11.3333 4.5 11.3333C4.68418 11.3333 4.85091 11.408 4.97157 11.5288C5.09211 11.6494 5.16667 11.816 5.16667 12Z" stroke="var(--svg-grab-pro-stroke)" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  // Add text container
  const copyTextContainer = document.createElement('div');
  copyTextContainer.className = 'menu-text-container';
  
  const copyText = document.createElement('div');
  copyText.className = 'menu-text';
  copyText.textContent = 'Copy as SVG';
  
  copyTextContainer.appendChild(copyText);
  copyOption.appendChild(copyIconContainer);
  copyOption.appendChild(copyTextContainer);
  
  copyOption.addEventListener('click', function() {
    hideCustomContextMenu();
    copySvgToClipboard();
  });
  
  customContextMenu.appendChild(copyOption);

  // Create Download SVG option
  const downloadOption = document.createElement('div');
  downloadOption.className = 'menu-option';
  
  // Add the download SVG icon
  const downloadIconContainer = document.createElement('div');
  downloadIconContainer.style.cssText = `
    width: 16px;
    height: 16px;
    position: relative;
  `;
  
  downloadIconContainer.innerHTML = `
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity="0.28" d="M3.83333 12.6667C3.46514 12.6667 3.16667 12.9651 3.16667 13.3333C3.16667 13.7015 3.46514 14 3.83333 14H13.1667C13.5349 14 13.8333 13.7015 13.8333 13.3333C13.8333 12.9651 13.5349 12.6667 13.1667 12.6667H3.83333Z" fill="var(--svg-grab-pro-stroke)"/>
    <path d="M9.16667 6.38076C10.2502 6.35542 11.3326 6.26828 12.4086 6.11936C12.6744 6.08258 12.9363 6.2087 13.0733 6.4394C13.2102 6.6701 13.1955 6.96042 13.036 7.17614C11.9649 8.62454 10.7133 9.92567 9.31299 11.0473C9.07601 11.2371 8.78831 11.3333 8.5 11.3333C8.21169 11.3333 7.92399 11.2371 7.68701 11.0473C6.28667 9.92567 5.03515 8.62454 3.96399 7.17614C3.80446 6.96042 3.78978 6.6701 3.92675 6.4394C4.06372 6.2087 4.32563 6.08258 4.5914 6.11936C5.66742 6.26828 6.74984 6.35542 7.83333 6.38076V2.66667C7.83333 2.29848 8.13181 2 8.5 2C8.86819 2 9.16667 2.29848 9.16667 2.66667V6.38076Z" fill="var(--svg-grab-pro-stroke)"/>
    </svg>
  `;
  
  // Add text container
  const downloadTextContainer = document.createElement('div');
  downloadTextContainer.className = 'menu-text-container';
  
  const downloadText = document.createElement('div');
  downloadText.className = 'menu-text';
  downloadText.textContent = 'Download SVG';
  
  downloadTextContainer.appendChild(downloadText);
  downloadOption.appendChild(downloadIconContainer);
  downloadOption.appendChild(downloadTextContainer);
  
  downloadOption.addEventListener('click', function() {
    hideCustomContextMenu();
    downloadSvg();
  });
  
  customContextMenu.appendChild(downloadOption);

  // Add to DOM
  document.body.appendChild(customContextMenu);
}

// Show custom context menu at specified position
function showCustomContextMenu(x, y) {
  if (!customContextMenu) createCustomContextMenu();
  
  // Ensure theme is applied
  applyThemeToContextMenu();
  
  // Position the menu
  customContextMenu.style.left = `${x}px`;
  customContextMenu.style.top = `${y}px`;
  customContextMenu.style.display = 'flex';
  customContextMenu.style.animation = 'svgGrabProFadeIn 0.15s ease-out';
  
  // Set dimensions based on content
  customContextMenu.style.width = 'auto';
  customContextMenu.style.height = 'auto';
  
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
      background-color: var(--svg-grab-pro-bg);
      color: var(--svg-grab-pro-text-primary);
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: var(--svg-grab-pro-shadow);
      z-index: 2147483647;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      transform: translateY(10px);
      border: 1px solid var(--svg-grab-pro-border);
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
  // No need to create the menu immediately, we'll create it on demand
  // But we can initialize the theme system
  initializeTheme();
});

// Listen for theme changes (from system)
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkModeMediaQuery.addEventListener('change', (e) => {
  // Only update if we don't have a saved preference
  chrome.storage.sync.get('theme', function(data) {
    if (!data.theme) {
      currentTheme = e.matches ? 'dark' : 'light';
      updateThemeVariables();
      if (customContextMenu) {
        applyThemeToContextMenu();
      }
    }
  });
});