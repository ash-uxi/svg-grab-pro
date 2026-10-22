/** @param {string} text */
function legacyCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.documentElement.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}

/**
 * Write to the clipboard while the click's user activation is still live: ClipboardItem accepts
 * a promise, so slow work (fetching, rasterizing) can finish after the call. Plain text falls
 * back to execCommand where the async clipboard is denied.
 * @param {string} type
 * @param {Promise<Blob>} blob
 */
export async function writeClipboard(type, blob) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
  } catch (error) {
    if (type !== 'text/plain' || !legacyCopy(await (await blob).text())) throw error;
  }
}

/** @param {string} text */
export function copyText(text) {
  return writeClipboard('text/plain', Promise.resolve(new Blob([text], { type: 'text/plain' })));
}
