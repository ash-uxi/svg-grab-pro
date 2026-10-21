import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeValue, serializeSvgElement } from './serialize-svg.js';
import { parseSvgText } from './parse-svg.js';
import { installFakeLayout } from '../test/rect.js';

installFakeLayout();

describe('normalizeValue', () => {
  it('converts colors, px and url references', () => {
    expect(normalizeValue('fill', 'rgb(255, 0, 16)')).toBe('#ff0010');
    expect(normalizeValue('fill', 'rgba(0, 0, 0, 0)')).toBe('none');
    expect(normalizeValue('stop-color', 'rgba(0, 0, 0, 0.5)')).toBe('rgba(0, 0, 0, 0.5)');
    expect(normalizeValue('stroke-width', '1.5px')).toBe('1.5');
    expect(normalizeValue('stroke-dasharray', '4px, 2px')).toBe('4 2');
    expect(normalizeValue('fill', 'url("https://site.com/page#grad")')).toBe('url(#grad)');
  });
});

describe('serializeSvgElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('produces standalone markup with xmlns and a viewBox', async () => {
    document.body.innerHTML = '<svg width="24" height="24"><path d="M0 0h24v24H0z"/></svg>';
    const out = await serializeSvgElement(document.querySelector('svg'));
    expect(out).toMatch(/^<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(out).toContain('viewBox="0 0 24 24"');
    expect(parseSvgText(out)).not.toBeNull();
  });

  it('sizes unsized svgs from their rendered box', async () => {
    document.body.innerHTML =
      '<svg data-rect="0 0 120 40" style="width:100%"><rect width="10" height="10"/></svg>';
    const out = await serializeSvgElement(document.querySelector('svg'));
    expect(out).toContain('viewBox="0 0 120 40"');
    expect(out).toContain('width="120"');
    expect(out).not.toContain('style=');
  });

  it('pulls in gradients and symbols defined elsewhere on the page', async () => {
    document.body.innerHTML = `
      <svg style="display:none"><defs>
        <linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient>
        <symbol id="mark" viewBox="0 0 10 10"><path fill="url(#g)" d="M0 0h10v10z"/></symbol>
      </defs></svg>
      <svg id="logo" width="10" height="10"><use href="#mark"/></svg>`;
    const out = await serializeSvgElement(document.getElementById('logo'));
    const root = parseSvgText(out);
    expect(root?.querySelector('symbol#mark')).not.toBeNull();
    expect(root?.querySelector('linearGradient#g')).not.toBeNull();
  });

  it('inlines symbols from external sprite files', async () => {
    document.body.innerHTML =
      '<svg id="icon" width="16" height="16"><use href="/sprite.svg#star"/></svg>';
    const sprite =
      '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="star"><path d="M1 1"/></symbol></svg>';
    const out = await serializeSvgElement(document.getElementById('icon'), {
      loadExternal: async (url) => (url.endsWith('/sprite.svg') ? sprite : null),
    });
    expect(out).toContain('href="#star"');
    expect(parseSvgText(out)?.querySelector('symbol#star')).not.toBeNull();
  });

  it('removes page noise but keeps artwork', async () => {
    document.body.innerHTML = `<svg width="4" height="4" class="h-4 w-4" aria-hidden="true" data-testid="x" focusable="false" onclick="go()">
      <!-- comment --><path class="a" d="M0 0"/></svg>`;
    const out = await serializeSvgElement(document.querySelector('svg'));
    expect(out).not.toMatch(/class=|aria-|data-|focusable|onclick|<!--/);
    expect(out).toContain('<path d="M0 0"');
  });

  it('keeps hidden groups that hold <use> templates', async () => {
    document.body.innerHTML =
      '<svg width="4" height="4"><g style="display:none"><path id="p" d="M0 0"/></g><use href="#p"/></svg>';
    const out = await serializeSvgElement(document.querySelector('svg'));
    expect(parseSvgText(out)?.querySelector('path#p')).not.toBeNull();
  });

  it('never copies page HTML referenced by fragment links', async () => {
    document.body.innerHTML =
      '<main id="main"><p>page</p></main><svg width="4" height="4"><a href="#main"><rect width="4" height="4"/></a></svg>';
    const out = await serializeSvgElement(document.querySelector('svg'));
    expect(out).not.toContain('<p');
  });

  it('keeps classes when the svg ships its own stylesheet', async () => {
    document.body.innerHTML =
      '<svg width="4" height="4"><style>.a{fill:red}</style><path class="a" d="M0 0"/></svg>';
    const out = await serializeSvgElement(document.querySelector('svg'));
    expect(out).toContain('class="a"');
  });
});
