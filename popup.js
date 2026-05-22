document.addEventListener('DOMContentLoaded', function () {
  const darkButton = document.querySelector('[data-theme="dark"]');
  const lightButton = document.querySelector('[data-theme="light"]');
  const allSitesToggle = document.getElementById('allSitesToggle');
  const permissionStatusOn = document.getElementById('permissionStatus-on');
  const permissionStatusOff = document.getElementById('permissionStatus-off');

  function applyTheme(theme) {
    document.body.classList.remove('dark-theme', 'light-theme');
    darkButton.classList.remove('active');
    lightButton.classList.remove('active');

    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      darkButton.classList.add('active');
    } else if (theme === 'light') {
      document.body.classList.add('light-theme');
      lightButton.classList.add('active');
    }

    chrome.storage.local.set({ svgGrabProTheme: theme });
    chrome.runtime.sendMessage({
      action: 'themeChanged',
      theme: theme
    });
  }

  function updatePermissionStatus(enabled) {
    if (enabled) {
      permissionStatusOn.style.opacity = '1';
      permissionStatusOn.style.transform = 'translateY(0)';
      permissionStatusOff.style.opacity = '0';
      permissionStatusOff.style.transform = 'translateY(-10px)';
    } else {
      permissionStatusOn.style.opacity = '0';
      permissionStatusOn.style.transform = 'translateY(10px)';
      permissionStatusOff.style.opacity = '1';
      permissionStatusOff.style.transform = 'translateY(0)';
    }
  }

  function syncPermissionUI() {
    if (!chrome.permissions) {
      chrome.storage.local.get('allSitesEnabled', (data) => {
        const enabled = data.allSitesEnabled === true;
        allSitesToggle.checked = enabled;
        updatePermissionStatus(enabled);
      });
      return;
    }

    chrome.permissions.contains({ origins: ['<all_urls>'] }, (hasPermission) => {
      chrome.storage.local.set({ allSitesEnabled: hasPermission });
      allSitesToggle.checked = hasPermission;
      updatePermissionStatus(hasPermission);
    });
  }

  if (allSitesToggle) {
    allSitesToggle.addEventListener('change', function () {
      if (this.checked) {
        chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
          syncPermissionUI();
          if (granted) {
            chrome.runtime.sendMessage({
              action: 'permissionChanged',
              allSitesEnabled: true
            });
          }
        });
      } else {
        chrome.permissions.remove({ origins: ['<all_urls>'] }, () => {
          syncPermissionUI();
          chrome.runtime.sendMessage({
            action: 'permissionChanged',
            allSitesEnabled: false
          });
        });
      }
    });
  }

  darkButton.onclick = function () {
    applyTheme('dark');
  };

  lightButton.onclick = function () {
    applyTheme('light');
  };

  chrome.storage.local.get('svgGrabProTheme', (data) => {
    const stored = data.svgGrabProTheme;
    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored);
    } else {
      applyTheme('dark');
    }
  });

  syncPermissionUI();
});
