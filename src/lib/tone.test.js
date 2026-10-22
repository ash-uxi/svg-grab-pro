import { describe, it, expect } from 'vitest';
import { artworkTone } from './tone.js';

describe('artworkTone', () => {
  it('detects white-only artwork', () => {
    expect(
      artworkTone('<svg><path fill="#fff"/><path style="fill: rgb(250, 250, 250)"/></svg>')
    ).toBe('light');
  });

  it('treats unpainted and black artwork as dark', () => {
    expect(artworkTone('<svg><path d="M0 0"/></svg>')).toBe('dark');
    expect(artworkTone('<svg><path fill="#000000"/><path stroke="black"/></svg>')).toBe('dark');
  });

  it('calls anything else mixed, ignoring transparent paint', () => {
    expect(artworkTone('<svg><path fill="#5e5ce6"/></svg>')).toBe('mixed');
    expect(artworkTone('<svg><path fill="#fff"/><path fill="rgba(0, 0, 0, 0)"/></svg>')).toBe(
      'light'
    );
  });
});
