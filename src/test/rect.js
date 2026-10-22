/**
 * jsdom has no layout: give elements a fixed box via `data-rect="x y w h"`, and ignore
 * pseudo-element arguments to getComputedStyle (unimplemented, and noisy).
 */
export function installFakeLayout() {
  Element.prototype.getBoundingClientRect = function () {
    const [x, y, width, height] = (this.getAttribute('data-rect') || '0 0 0 0')
      .split(' ')
      .map(Number);
    return {
      x,
      y,
      left: x,
      top: y,
      width,
      height,
      right: x + width,
      bottom: y + height,
      toJSON() {},
    };
  };
  const getComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el, pseudo) =>
    pseudo ? new CSSStyleDeclaration() : getComputedStyle(el);
}
