import { getSvgSize } from './parse-svg.js';
import { svgToDataUrl } from './svg-url.js';

const MIN_LONG_SIDE = 512;
const MAX_LONG_SIDE = 4096;

/**
 * Render SVG markup to a PNG at 2× its size (at least 512px on the long side, at most 4096px).
 * @param {string} svgText
 * @returns {Promise<Blob>}
 */
export async function svgToPngBlob(svgText) {
  const size = getSvgSize(svgText) ?? { width: 300, height: 150 };
  const longSide = Math.max(size.width, size.height);
  const scale = Math.min(MAX_LONG_SIDE, Math.max(MIN_LONG_SIDE, longSide * 2)) / longSide;
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));

  const image = new Image(width, height);
  image.src = svgToDataUrl(svgText);
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
      'image/png'
    );
  });
}
