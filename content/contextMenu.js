// Context menu UI for SVG Grab Pro
// Create custom context menu element
function createCustomContextMenu() {
  // Only create the menu once
  if (SVGGrabProState.customContextMenu) return;
  
  injectThemeStyles();
  initializeTheme();
  
  // Create the menu container
  SVGGrabProState.customContextMenu = document.createElement('div');
  SVGGrabProState.customContextMenu.className = 'svg-grab-pro-context-menu';
  SVGGrabProState.customContextMenu.style.cssText = `
    position: fixed;
    width: auto;
    min-width: 180px;
    padding: 4px;
    background: var(--svg-grab-pro-bg);
    box-shadow: var(--svg-grab-pro-shadow);
    border: 1px solid var(--svg-grab-pro-border);
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
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  copyIconContainer.innerHTML = `
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity="var(--svg-grab-pro-opacity)" d="M8.5 3.33333V7.99999M8.5 7.99999V12.6667M8.5 7.99999L13.1667 8M8.5 7.99999L3.83333 7.99999M8.5 7.99999L12.0284 11.5287M8.5 7.99999L4.9714 4.4714M8.5 7.99999L4.97157 11.5288M8.5 7.99999L12.0288 4.47156" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.16667 2.66667C9.16667 3.03486 8.86819 3.33333 8.5 3.33333C8.13181 3.33333 7.83333 3.03486 7.83333 2.66667C7.83333 2.29848 8.13181 2 8.5 2C8.86819 2 9.16667 2.29848 9.16667 2.66667Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.16667 13.3333C9.16667 13.7015 8.86819 14 8.5 14C8.13181 14 7.83333 13.7015 7.83333 13.3333C7.83333 12.9651 8.13181 12.6667 8.5 12.6667C8.86819 12.6667 9.16667 12.9651 9.16667 13.3333Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14.5 8C14.5 8.36819 14.2015 8.66667 13.8333 8.66667C13.4651 8.66667 13.1667 8.36819 13.1667 8C13.1667 7.63181 13.4651 7.33333 13.8333 7.33333C14.2015 7.33333 14.5 7.63181 14.5 8Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13.1667 4C13.1667 4.36819 12.8682 4.66667 12.5 4.66667C12.316 4.66667 12.1494 4.59211 12.0288 4.47157C11.908 4.35091 11.8333 4.18418 11.8333 4C11.8333 3.63181 12.1318 3.33333 12.5 3.33333C12.8682 3.33333 13.1667 3.63181 13.1667 4Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13.1667 12C13.1667 12.3682 12.8682 12.6667 12.5 12.6667C12.1318 12.6667 11.8333 12.3682 11.8333 12C11.8333 11.816 11.9079 11.6494 12.0284 11.5288C12.1491 11.408 12.3158 11.3333 12.5 11.3333C12.8682 11.3333 13.1667 11.6318 13.1667 12Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.83333 8C3.83333 8.36819 3.53486 8.66667 3.16667 8.66667C2.79848 8.66667 2.5 8.36819 2.5 8C2.5 7.63181 2.79848 7.33333 3.16667 7.33333C3.53486 7.33333 3.83333 7.63181 3.83333 8Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5.16667 4C5.16667 4.1841 5.09205 4.35076 4.9714 4.47141C4.85076 4.59205 4.68409 4.66667 4.5 4.66667C4.13181 4.66667 3.83333 4.36819 3.83333 4C3.83333 3.63181 4.13181 3.33333 4.5 3.33333C4.86819 3.33333 5.16667 3.63181 5.16667 4Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5.16667 12C5.16667 12.3682 4.86819 12.6667 4.5 12.6667C4.13181 12.6667 3.83333 12.3682 3.83333 12C3.83333 11.6318 4.13181 11.3333 4.5 11.3333C4.68418 11.3333 4.85091 11.408 4.97157 11.5288C5.09211 11.6494 5.16667 11.816 5.16667 12Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
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
  
  SVGGrabProState.customContextMenu.appendChild(copyOption);

  // Create Download SVG option
  const downloadOption = document.createElement('div');
  downloadOption.className = 'menu-option';
  
  // Add the download SVG icon
  const downloadIconContainer = document.createElement('div');
  downloadIconContainer.style.cssText = `
    width: 16px;
    height: 16px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  downloadIconContainer.innerHTML = `
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity="var(--svg-grab-pro-opacity)" d="M3.83333 12.6667C3.46514 12.6667 3.16667 12.9651 3.16667 13.3333C3.16667 13.7015 3.46514 14 3.83333 14H13.1667C13.5349 14 13.8333 13.7015 13.8333 13.3333C13.8333 12.9651 13.5349 12.6667 13.1667 12.6667H3.83333Z" fill="currentColor"/>
    <path d="M9.16667 6.38076C10.2502 6.35542 11.3326 6.26828 12.4086 6.11936C12.6744 6.08258 12.9363 6.2087 13.0733 6.4394C13.2102 6.6701 13.1955 6.96042 13.036 7.17614C11.9649 8.62454 10.7133 9.92567 9.31299 11.0473C9.07601 11.2371 8.78831 11.3333 8.5 11.3333C8.21169 11.3333 7.92399 11.2371 7.68701 11.0473C6.28667 9.92567 5.03515 8.62454 3.96399 7.17614C3.80446 6.96042 3.78978 6.6701 3.92675 6.4394C4.06372 6.2087 4.32563 6.08258 4.5914 6.11936C5.66742 6.26828 6.74984 6.35542 7.83333 6.38076V2.66667C7.83333 2.29848 8.13181 2 8.5 2C8.86819 2 9.16667 2.29848 9.16667 2.66667V6.38076Z" fill="currentColor"/>
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
  
  SVGGrabProState.customContextMenu.appendChild(downloadOption);

  // Add to DOM
  document.body.appendChild(SVGGrabProState.customContextMenu);
}

// Apply theme to SVG elements when menu is shown
function applyThemeToMenuIcons() {
  const menuContainer = document.querySelector('.svg-grab-pro-context-menu');
  if (!menuContainer) return;
  
  // Use CSS variables instead of hardcoded values
  const svgIcons = menuContainer.querySelectorAll('svg');
  svgIcons.forEach(svg => {
    svg.style.color = 'var(--svg-grab-pro-stroke)';
  });
}

// Show custom context menu at specified position
function showCustomContextMenu(x, y) {
  if (!SVGGrabProState.customContextMenu) createCustomContextMenu();
  
  // Ensure theme is applied
  applyThemeToContextMenu();
  applyThemeToMenuIcons(); // Apply theme to menu icons
  
  // Position the menu
  SVGGrabProState.customContextMenu.style.left = `${x}px`;
  SVGGrabProState.customContextMenu.style.top = `${y}px`;
  SVGGrabProState.customContextMenu.style.display = 'flex';
  SVGGrabProState.customContextMenu.style.animation = 'svgGrabProFadeIn 0.15s ease-out';
  
  // Check if menu goes beyond right edge
  const menuRect = SVGGrabProState.customContextMenu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (menuRect.right > viewportWidth) {
    SVGGrabProState.customContextMenu.style.left = `${viewportWidth - menuRect.width - 5}px`;
  }
  
  // Check if menu goes beyond bottom edge
  if (menuRect.bottom > viewportHeight) {
    SVGGrabProState.customContextMenu.style.top = `${viewportHeight - menuRect.height - 5}px`;
  }
}

// Hide custom context menu
function hideCustomContextMenu() {
  if (SVGGrabProState.customContextMenu) {
    SVGGrabProState.customContextMenu.style.animation = 'svgGrabProFadeOut 0.1s ease-out';
    setTimeout(() => {
      SVGGrabProState.customContextMenu.style.display = 'none';
    }, 100);
  }
}
