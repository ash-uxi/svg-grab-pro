let notificationTimeout;

function showNotification(message) {
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

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

  notification.textContent = message;
  notification.style.opacity = '1';
  notification.style.transform = 'translateY(0)';

  notificationTimeout = setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(10px)';
  }, 3000);
}
