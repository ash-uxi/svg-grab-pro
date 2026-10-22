import { writeClipboard } from '../shared/clipboard.js';
import { downloadBlob } from '../shared/download.js';
import { GrabError } from './resolve.js';

/** @typedef {import('./ui.js').MenuAction} MenuAction */

const FAILURE_MESSAGES = {
  'copy-svg': 'Couldn’t copy this SVG.',
  'download-svg': 'Couldn’t download this SVG.',
};

/**
 * @param {MenuAction} action
 * @param {{ svg: Promise<string>; name: string; ui: ReturnType<typeof import('./ui.js').createUi> }} context
 */
export async function runAction(action, { svg, name, ui }) {
  const pendingTimer = setTimeout(() => ui.toast('Fetching SVG…', 'pending'), 250);
  try {
    switch (action) {
      case 'copy-svg':
        await writeClipboard(
          'text/plain',
          svg.then((text) => new Blob([text], { type: 'text/plain' }))
        );
        ui.toast(`Copied ${name}.svg`);
        break;
      case 'download-svg':
        downloadBlob(new Blob([await svg], { type: 'image/svg+xml' }), `${name}.svg`);
        ui.toast(`Saved ${name}.svg`);
        break;
    }
  } catch (error) {
    const cause = await svg.then(
      () => error,
      (svgError) => svgError
    );
    console.warn('[SVG Grab Pro]', cause);
    ui.toast(cause instanceof GrabError ? cause.message : FAILURE_MESSAGES[action], 'error');
  } finally {
    clearTimeout(pendingTimer);
  }
}
