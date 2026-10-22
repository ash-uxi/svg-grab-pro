/**
 * Save a blob as a file via a temporary `<a download>`.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  // Keep the synthetic click away from page-level click handlers (SPA routers, analytics).
  link.addEventListener('click', (event) => event.stopPropagation());
  document.documentElement.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
