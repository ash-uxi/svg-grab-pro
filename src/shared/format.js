/** @param {number} bytes */
export function formatBytes(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** @param {{ width: number; height: number } | null} size */
export function formatSize(size) {
  if (!size) return '';
  const round = (/** @type {number} */ n) => (Number.isInteger(n) ? n : Number(n.toFixed(1)));
  return `${round(size.width)} × ${round(size.height)}`;
}

/** @param {string} text */
export function byteLength(text) {
  return new TextEncoder().encode(text).length;
}
