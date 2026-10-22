import { describe, it, expect } from 'vitest';
import { decodeSvgDataUrl, extractCssUrls, isSvgUrl, svgToDataUrl } from './svg-url.js';

describe('isSvgUrl', () => {
  it('matches svg paths, data URIs and format=svg queries', () => {
    expect(isSvgUrl('https://cdn.example.com/logo.svg')).toBe(true);
    expect(isSvgUrl('/assets/logo.SVG?v=3')).toBe(true);
    expect(isSvgUrl('data:image/svg+xml;base64,PHN2Zy8+')).toBe(true);
    expect(isSvgUrl('https://img.example.com/x?format=svg')).toBe(true);
  });

  it('rejects rasters and paths that merely mention svg', () => {
    expect(isSvgUrl('https://example.com/logo.png')).toBe(false);
    expect(isSvgUrl('https://example.com/svg/photo.jpg')).toBe(false);
    expect(isSvgUrl('https://example.com/logo.svg.png')).toBe(false);
    expect(isSvgUrl('')).toBe(false);
  });
});

describe('extractCssUrls', () => {
  it('pulls every url out of a layered background', () => {
    const value = 'linear-gradient(red, blue), url("https://a.com/x.svg"), url(b.png)';
    expect(extractCssUrls(value)).toEqual(['https://a.com/x.svg', 'b.png']);
    expect(extractCssUrls('none')).toEqual([]);
  });
});

describe('decodeSvgDataUrl', () => {
  it('round-trips percent-encoded and base64 payloads', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
    expect(decodeSvgDataUrl(svgToDataUrl(svg))).toBe(svg);
    expect(decodeSvgDataUrl(`data:image/svg+xml;base64,${btoa(svg)}`)).toBe(svg);
    expect(decodeSvgDataUrl('data:image/png;base64,AAAA')).toBeNull();
  });
});

describe('extractCssUrls escapes', () => {
  it('unescapes quotes inside computed data URIs', () => {
    const value = 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\"/>")';
    expect(extractCssUrls(value)).toEqual([
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
    ]);
  });
});
