import type { TrackerRect } from '../src/types';

/** Create an element attached to <body>. */
export function makeEl(tag = 'div', attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

/** Override an element's geometry (what `getBoundingClientRect` returns). */
export function setRect(
  el: Element,
  x: number,
  y: number,
  width = 100,
  height = 100,
): void {
  el.getBoundingClientRect = (): TrackerRect & { toJSON: () => void } => ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => {},
  });
}

/** A 100×100 box positioned at (x, y). */
export function box(x: number, y: number, w = 100, h = 100) {
  return setRect(makeEl(), x, y, w, h);
}
