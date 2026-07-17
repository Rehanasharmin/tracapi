import { describe, it, expect } from 'vitest';
import {
  testCollision,
  unionRect,
  resolveCollisionElements,
} from '../src/core/collision';
import type { TrackerRect } from '../src/types';

function rect(x: number, y: number, w: number, h: number): TrackerRect {
  return { x, y, width: w, height: h, top: y, right: x + w, bottom: y + h, left: x };
}

describe('collision', () => {
  it('overlap mode detects AABB intersection', () => {
    expect(testCollision(rect(0, 0, 10, 10), rect(5, 5, 10, 10), 'overlap', 0)).toBe(true);
    expect(testCollision(rect(0, 0, 10, 10), rect(20, 20, 5, 5), 'overlap', 0)).toBe(false);
  });

  it('padding expands both rects', () => {
    expect(testCollision(rect(0, 0, 10, 10), rect(15, 0, 5, 5), 'overlap', 0)).toBe(false);
    expect(testCollision(rect(0, 0, 10, 10), rect(15, 0, 5, 5), 'overlap', 6)).toBe(true);
  });

  it('contain mode requires full enclosure either way', () => {
    expect(testCollision(rect(0, 0, 100, 100), rect(10, 10, 10, 10), 'contain', 0)).toBe(true);
    expect(testCollision(rect(0, 0, 5, 5), rect(10, 10, 10, 10), 'contain', 0)).toBe(false);
  });

  it('center mode matches when a center lands in the other rect', () => {
    expect(testCollision(rect(0, 0, 100, 100), rect(40, 40, 10, 10), 'center', 0)).toBe(true);
    expect(testCollision(rect(0, 0, 10, 10), rect(200, 200, 10, 10), 'center', 0)).toBe(false);
  });

  it('unionRect produces the bounding box', () => {
    const u = unionRect(rect(0, 0, 10, 10), rect(20, 20, 5, 5));
    expect(u).toMatchObject({ x: 0, y: 0, width: 25, height: 25 });
  });

  it('resolveCollisionElements handles selectors, elements, arrays, functions', () => {
    const cache = new Map<string, Element[]>();
    const a = document.createElement('div');
    a.className = 'tgt';
    document.body.appendChild(a);
    expect(resolveCollisionElements('.tgt', cache)).toContain(a);
    expect(resolveCollisionElements(a, cache)).toContain(a);
    expect(resolveCollisionElements([a], cache)).toContain(a);
    expect(resolveCollisionElements(() => '.tgt', cache)).toContain(a);
    expect(resolveCollisionElements('tracked', cache)).toEqual([]);
    expect(resolveCollisionElements(undefined, cache)).toEqual([]);
    document.body.removeChild(a);
  });
});
