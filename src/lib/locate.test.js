import { describe, it, expect, beforeEach } from 'vitest';
import {
  collectPageTargets,
  findTargetAtPoint,
  outermostSvg,
  targetFromElement,
} from './locate.js';
import { installFakeLayout } from '../test/rect.js';

installFakeLayout();

describe('outermostSvg', () => {
  it('climbs out of nested svgs', () => {
    document.body.innerHTML = '<svg id="outer"><g><svg id="inner"><path/></svg></g></svg>';
    expect(outermostSvg(document.querySelector('path'))?.id).toBe('outer');
    expect(outermostSvg(document.body)).toBeNull();
  });
});

describe('targetFromElement', () => {
  it('recognises svg images, objects and css backgrounds', () => {
    document.body.innerHTML = `
      <img id="img" src="/logo.svg">
      <img id="png" src="/photo.png">
      <object id="obj" data="/chart.svg" type="image/svg+xml"></object>
      <span id="bg" style="background-image: url('/icon.svg')"></span>`;
    expect(targetFromElement(document.getElementById('img'))).toMatchObject({ kind: 'url' });
    expect(targetFromElement(document.getElementById('png'))).toBeNull();
    expect(targetFromElement(document.getElementById('obj'))).toMatchObject({ kind: 'url' });
    expect(targetFromElement(document.getElementById('bg'))).toMatchObject({
      kind: 'url',
      url: '/icon.svg',
    });
  });
});

describe('findTargetAtPoint', () => {
  it('finds an svg from a deep path element', () => {
    document.body.innerHTML = '<a href="/"><svg id="logo"><g><path/></g></svg></a>';
    const path = document.querySelector('path');
    const eventPath = [path, path.parentElement, document.getElementById('logo')];
    expect(findTargetAtPoint({ path: eventPath, x: 0, y: 0, doc: document })).toMatchObject({
      kind: 'inline',
      element: document.getElementById('logo'),
    });
  });

  it('checks small wrappers that paint an svg via css', () => {
    document.body.innerHTML =
      '<button data-rect="0 0 24 24" style="mask-image:url(/x.svg)"><b>Go</b></button>';
    const b = document.querySelector('b');
    expect(
      findTargetAtPoint({ path: [b, b.parentElement], x: 0, y: 0, doc: document })
    ).toMatchObject({
      kind: 'url',
    });
  });

  it('ignores huge css backgrounds even when they are the click target', () => {
    document.body.innerHTML =
      '<section data-rect="0 0 1024 768" style="background-image:url(/hero.svg)"></section>';
    const section = document.querySelector('section');
    expect(findTargetAtPoint({ path: [section], x: 0, y: 0, doc: document })).toBeNull();
  });

  it('ignores huge containers so the browser menu still works on text', () => {
    document.body.innerHTML =
      '<section data-rect="0 0 1024 768" style="background-image:url(/hero.svg)"><p>Text</p></section>';
    const p = document.querySelector('p');
    expect(findTargetAtPoint({ path: [p, p.parentElement], x: 0, y: 0, doc: document })).toBeNull();
  });
});

describe('collectPageTargets', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('collects rendered svgs, dedupes urls and skips hidden sprites', () => {
    document.body.innerHTML = `
      <svg data-rect="0 0 0 0"><symbol id="s"/></svg>
      <svg id="a" data-rect="0 0 20 20"><svg data-rect="0 0 10 10"/></svg>
      <img data-rect="0 0 20 20" src="/one.svg"><img data-rect="0 0 20 20" src="/one.svg">
      <div data-rect="0 0 20 20" style="background-image:url(/two.svg)"></div>`;
    const targets = collectPageTargets(document);
    expect(targets.map((t) => (t.kind === 'inline' ? t.element.id : t.url))).toEqual([
      'a',
      'http://localhost:3000/one.svg',
      '/two.svg',
    ]);
  });

  it('looks inside open shadow roots', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    host.attachShadow({ mode: 'open' }).innerHTML =
      '<svg id="shadowed" data-rect="0 0 16 16"></svg>';
    expect(collectPageTargets(document)).toHaveLength(1);
  });
});
