const themeVariables = `
  :root {
    --svg-grab-pro-black: #1A1C1F;
    --svg-grab-pro-white: #FBFBFB;
    --svg-grab-pro-gray-900: #212226;
    --svg-grab-pro-bg-light: #FFFFFF;
    --svg-grab-pro-text-primary-light: var(--svg-grab-pro-black);
    --svg-grab-pro-border-light: rgba(15, 16, 18, 0.12);
    --svg-grab-pro-shadow-light: 0px 24px 24px -12px rgba(9, 10, 11, 0.06);
    --svg-grab-pro-hover-light: rgba(15, 16, 18, 0.04);
    --svg-grab-pro-stroke-light: var(--svg-grab-pro-black);
    --svg-grab-pro-opacity-light: 0.28;
    --svg-grab-pro-bg-dark: var(--svg-grab-pro-gray-900);
    --svg-grab-pro-text-primary-dark: var(--svg-grab-pro-white);
    --svg-grab-pro-border-dark: rgba(255, 255, 255, 0.08);
    --svg-grab-pro-shadow-dark: 0px 24px 24px -12px rgba(0, 0, 0, 0.2);
    --svg-grab-pro-hover-dark: rgba(255, 255, 255, 0.04);
    --svg-grab-pro-stroke-dark: var(--svg-grab-pro-white);
    --svg-grab-pro-opacity-dark: 0.2;
    --svg-grab-pro-bg: var(--svg-grab-pro-bg-light);
    --svg-grab-pro-text-primary: var(--svg-grab-pro-text-primary-light);
    --svg-grab-pro-border: var(--svg-grab-pro-border-light);
    --svg-grab-pro-shadow: var(--svg-grab-pro-shadow-light);
    --svg-grab-pro-hover: var(--svg-grab-pro-hover-light);
    --svg-grab-pro-stroke: var(--svg-grab-pro-stroke-light);
    --svg-grab-pro-opacity: var(--svg-grab-pro-opacity-light);
  }
`;

function getCurrentTheme() {
  return SVGGrabProState.currentTheme;
}

function updateThemeVariables() {
  const root = document.documentElement;
  const dark = SVGGrabProState.currentTheme === 'dark';
  const suffix = dark ? 'dark' : 'light';
  const vars = [
    'bg', 'text-primary', 'border', 'shadow', 'hover', 'stroke', 'opacity'
  ];
  vars.forEach((name) => {
    root.style.setProperty(
      `--svg-grab-pro-${name}`,
      `var(--svg-grab-pro-${name}-${suffix})`
    );
  });
}

function applyThemeToContextMenu() {
  const menu = SVGGrabProState.customContextMenu;
  if (!menu) return;

  menu.style.backgroundColor = 'var(--svg-grab-pro-bg)';
  menu.style.boxShadow = 'var(--svg-grab-pro-shadow)';
  menu.style.borderColor = 'var(--svg-grab-pro-border)';

  menu.querySelectorAll('svg path').forEach((path) => {
    if (path.hasAttribute('stroke')) {
      path.setAttribute('stroke', 'var(--svg-grab-pro-stroke)');
    }
    if (path.hasAttribute('fill') && path.getAttribute('fill') !== 'none') {
      path.setAttribute('fill', 'var(--svg-grab-pro-stroke)');
    }
    if (path.hasAttribute('opacity')) {
      path.setAttribute('opacity', 'var(--svg-grab-pro-opacity)');
    }
  });

  menu.querySelectorAll('.menu-text').forEach((text) => {
    text.style.color = 'var(--svg-grab-pro-text-primary)';
  });
}

function applyThemeToMenuIcons() {
  const menu = SVGGrabProState.customContextMenu;
  if (!menu) return;
  menu.querySelectorAll('svg').forEach((svg) => {
    svg.style.color = 'var(--svg-grab-pro-stroke)';
  });
}

function setTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') return;
  SVGGrabProState.currentTheme = theme;
  updateThemeVariables();
  applyThemeToContextMenu();
  applyThemeToMenuIcons();
}

function initializeTheme() {
  chrome.storage.local.get('svgGrabProTheme', (data) => {
    const stored = data.svgGrabProTheme;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    } else {
      setTheme('dark');
    }
  });
}

function injectThemeStyles() {
  if (document.getElementById('svg-grab-pro-theme-vars')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'svg-grab-pro-theme-vars';
  styleEl.textContent = themeVariables;
  document.head.appendChild(styleEl);
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (
    namespace === 'local' &&
    changes.svgGrabProTheme &&
    (changes.svgGrabProTheme.newValue === 'dark' ||
      changes.svgGrabProTheme.newValue === 'light')
  ) {
    setTheme(changes.svgGrabProTheme.newValue);
  }

});
