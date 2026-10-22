import { describe, it, expect } from 'vitest';
import { dedupeNames, siteName, slugify, suggestName } from './naming.js';

const el = (html) => {
  document.body.innerHTML = html;
  return document.querySelector('[data-target]');
};

describe('suggestName', () => {
  it('uses labels, dropping filler words', () => {
    expect(
      suggestName(el('<a href="/" aria-label="GitHub Homepage"><svg data-target></svg></a>'), {
        hostname: 'github.com',
        isLogo: true,
      })
    ).toBe('github-logo');
    expect(
      suggestName(el('<svg data-target><title>Stripe logo</title></svg>'), {
        hostname: 'stripe.com',
        isLogo: true,
      })
    ).toBe('stripe-logo');
  });

  it('falls back to url stems, icon classes, then the site name', () => {
    expect(
      suggestName(el('<img data-target src="/a/arrow-right.svg">'), {
        url: 'https://x.com/a/arrow-right.svg',
        hostname: 'x.com',
        isLogo: false,
      })
    ).toBe('arrow-right');
    expect(
      suggestName(el('<svg data-target class="h-4 w-4 lucide lucide-search"></svg>'), {
        hostname: 'x.com',
        isLogo: false,
      })
    ).toBe('lucide-search');
    expect(
      suggestName(el('<svg data-target id=":r1a2b3c:"></svg>'), {
        hostname: 'www.bbc.co.uk',
        isLogo: true,
      })
    ).toBe('bbc-logo');
  });
});

describe('helpers', () => {
  it('slugifies and finds site names', () => {
    expect(slugify('  Café Déjà Vu! ')).toBe('cafe-deja-vu');
    expect(siteName('docs.github.com')).toBe('github');
    expect(dedupeNames(['a', 'b', 'a', 'a'])).toEqual(['a', 'b', 'a-2', 'a-3']);
    expect(dedupeNames(['a', 'a', 'a-2'])).toEqual(['a', 'a-2', 'a-2-2']);
  });
});
