import { describe, it, expect } from 'vitest';
import {
  distance,
  angle,
  center,
  overlaps,
  contains,
  area,
  expandRect,
  toPoint,
  toRect,
  nearest,
  farthest,
} from '../src/utils/geometry';
import { makeEl, setRect } from './helpers';

describe('geometry', () => {
  const z = { x: 0, y: 0, width: 0, height: 0 };

  it('distance uses centers', () => {
    expect(distance(z, { x: 3, y: 4, width: 0, height: 0 })).toBe(5);
    expect(distance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });

  it('angle is measured in degrees from +X', () => {
    expect(angle(z, { x: 1, y: 0, width: 0, height: 0 })).toBeCloseTo(0);
    expect(angle(z, { x: 0, y: 1, width: 0, height: 0 })).toBeCloseTo(90);
    expect(angle(z, { x: -1, y: 0, width: 0, height: 0 })).toBeCloseTo(180);
  });

  it('center returns the geometric center', () => {
    expect(center({ x: 10, y: 20, width: 100, height: 40 })).toEqual({ x: 60, y: 40 });
  });

  it('area multiplies dimensions', () => {
    expect(area({ x: 0, y: 0, width: 10, height: 5 })).toBe(50);
  });

  it('expandRect grows on every side', () => {
    expect(expandRect({ x: 0, y: 0, width: 10, height: 10 }, 5)).toEqual({
      x: -5,
      y: -5,
      width: 20,
      height: 20,
    });
  });

  it('overlaps detects shared pixels', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(overlaps(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(overlaps(a, { x: 20, y: 20, width: 5, height: 5 })).toBe(false);
    expect(overlaps(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(true); // touching edge
  });

  it('contains checks full enclosure', () => {
    const outer = { x: 0, y: 0, width: 100, height: 100 };
    expect(contains(outer, { x: 10, y: 10, width: 20, height: 20 })).toBe(true);
    expect(contains(outer, { x: 90, y: 90, width: 20, height: 20 })).toBe(false);
  });

  it('toPoint/toRect accept points and rects', () => {
    expect(toPoint({ x: 5, y: 6 })).toEqual({ x: 5, y: 6 });
    expect(toRect({ x: 1, y: 2, width: 3, height: 4 })).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    });
  });

  it('nearest/farthest resolve elements by selector', () => {
    const a = makeEl('div', { class: 'dot' });
    const b = makeEl('div', { class: 'dot' });
    const c = makeEl('div', { class: 'dot' });
    setRect(a, 0, 0);
    setRect(b, 50, 0);
    setRect(c, 500, 0);
    const from = { x: 0, y: 0 };
    expect(nearest(from, '.dot')).toBe(a); // a's center is (0,0) — distance 0
    expect(farthest(from, '.dot')).toBe(c);
  });

  it('geometry accepts live elements', () => {
    const el = makeEl();
    setRect(el, 0, 0, 20, 20);
    expect(center(el)).toEqual({ x: 10, y: 10 });
    expect(distance(el, { x: 30, y: 40, width: 0, height: 0 })).toBeCloseTo(Math.hypot(20, 30));
  });
});
