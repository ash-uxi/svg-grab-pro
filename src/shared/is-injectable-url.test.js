import { describe, it, expect } from 'vitest';
import { isInjectableUrl } from './is-injectable-url.js';

describe('isInjectableUrl', () => {
  it('allows web and file pages', () => {
    expect(isInjectableUrl('https://example.com/page')).toBe(true);
    expect(isInjectableUrl('http://localhost:3000/')).toBe(true);
    expect(isInjectableUrl('file:///Users/me/logo.html')).toBe(true);
  });

  it('blocks browser pages and the web store', () => {
    expect(isInjectableUrl('chrome://extensions')).toBe(false);
    expect(isInjectableUrl('chrome-extension://abc/popup.html')).toBe(false);
    expect(isInjectableUrl('about:blank')).toBe(false);
    expect(isInjectableUrl('https://chromewebstore.google.com/detail/x')).toBe(false);
    expect(isInjectableUrl(undefined)).toBe(false);
  });

  it('blocks Firefox pages and Mozilla’s restricted domains', () => {
    expect(isInjectableUrl('moz-extension://abc/popup.html')).toBe(false);
    expect(isInjectableUrl('about:addons')).toBe(false);
    expect(isInjectableUrl('https://addons.mozilla.org/en-US/firefox/')).toBe(false);
    expect(isInjectableUrl('https://accounts.firefox.com/')).toBe(false);
    expect(isInjectableUrl('https://support.mozilla.org/kb/x')).toBe(false);
    expect(isInjectableUrl('https://www.mozilla.org/firefox/')).toBe(true);
  });
});
