import { describe, it, expect } from 'vitest';
import { isHomeLink, LOGO_SCORE_THRESHOLD, scoreLogo } from './logo-detection.js';
import { installFakeLayout } from '../test/rect.js';

installFakeLayout();
const context = { pageUrl: 'https://github.com/features', viewportWidth: 1280, scrollY: 0 };

describe('scoreLogo', () => {
  it('scores a header home-link mark as a logo', () => {
    document.body.innerHTML =
      '<header><a href="/" aria-label="Homepage"><svg data-rect="16 12 32 32"></svg></a></header>';
    expect(scoreLogo(document.querySelector('svg'), context)).toBeGreaterThanOrEqual(
      LOGO_SCORE_THRESHOLD
    );
  });

  it('scores an explicitly named logo anywhere on the page', () => {
    document.body.innerHTML =
      '<div><img class="partner-logo" src="/acme.svg" data-rect="300 2000 120 40"></div>';
    expect(scoreLogo(document.querySelector('img'), context)).toBeGreaterThanOrEqual(
      LOGO_SCORE_THRESHOLD
    );
  });

  it('does not score small header icons as logos', () => {
    document.body.innerHTML =
      '<header><button aria-label="Search"><svg class="icon-search" data-rect="900 16 16 16"></svg></button></header>';
    expect(scoreLogo(document.querySelector('svg'), context)).toBeLessThan(LOGO_SCORE_THRESHOLD);
  });
});

describe('isHomeLink', () => {
  it('accepts the site root and locale roots only', () => {
    expect(isHomeLink('/', context.pageUrl)).toBe(true);
    expect(isHomeLink('https://github.com/en-us/', context.pageUrl)).toBe(true);
    expect(isHomeLink('/pricing', context.pageUrl)).toBe(false);
    expect(isHomeLink('https://other.com/', context.pageUrl)).toBe(false);
  });
});
