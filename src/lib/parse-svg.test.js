import { describe, it, expect } from 'vitest';
import { getSvgSize, normalizeSvgText, parseSvgText, tintSvg } from './parse-svg.js';

describe('parseSvgText', () => {
  it('extracts an svg wrapped in html', () => {
    const root = parseSvgText('<html><body><svg viewBox="0 0 1 1"><rect /></svg></body></html>');
    expect(root?.localName).toBe('svg');
  });

  it('returns null for non-svg text', () => {
    expect(parseSvgText('<div>hello</div>')).toBeNull();
    expect(parseSvgText('')).toBeNull();
  });

  it('strips scripts and event handlers', () => {
    const out = normalizeSvgText(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)"><rect onclick="x()"/></a></svg>'
    );
    expect(out).not.toMatch(/alert|onclick|onload|<script/);
    expect(out).toMatch(/<rect/);
  });

  it('catches obfuscated script urls in any attribute', () => {
    const out = normalizeSvgText(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="java&#9;script:alert(1)"><rect/></a><foreignObject><form xmlns="http://www.w3.org/1999/xhtml" action="javascript:x()"/><button xmlns="http://www.w3.org/1999/xhtml" formaction=" JavaScript:y()"/></foreignObject></svg>'
    );
    expect(out).not.toMatch(/script:|<form/i);
    expect(out).toContain('<rect');
  });
});

describe('getSvgSize', () => {
  it('prefers width/height, filling the gap from the viewBox ratio', () => {
    expect(getSvgSize('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"/>')).toEqual(
      { width: 120, height: 40 }
    );
    expect(
      getSvgSize('<svg xmlns="http://www.w3.org/2000/svg" width="60" viewBox="0 0 30 10"/>')
    ).toEqual({ width: 60, height: 20 });
    expect(
      getSvgSize('<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24"/>')
    ).toEqual({ width: 24, height: 24 });
    expect(getSvgSize('<svg xmlns="http://www.w3.org/2000/svg"/>')).toBeNull();
  });
});

describe('tintSvg', () => {
  it('repaints solid fills and strokes but leaves none and gradients alone', () => {
    const out = tintSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/><path fill="none" stroke="#000" d="M1 1"/><rect fill="url(#g)"/></svg>',
      '#e11d48'
    );
    expect(out).toContain('<svg xmlns="http://www.w3.org/2000/svg" fill="#e11d48"');
    expect(out).toContain('fill="none" stroke="#e11d48"');
    expect(out).toContain('fill="url(#g)"');
  });
});
