import type { Point, Rect, Trackable } from '../types';
import { getElementRect } from './dom';

/**
 * Pure geometry helpers. Every function accepts the flexible {@link Trackable}
 * union so callers can pass raw elements, trackers, points, or rects
 * interchangeably. They never write to the DOM.
 */

/** Normalize any trackable into a {@link Point} (the geometric center). */
export function toPoint(value: Trackable): Point {
  const rect = toRect(value);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Normalize any trackable into a {@link Rect}. */
export function toRect(value: Trackable): Rect {
  // Element — read live geometry.
  if (typeof (value as Element).getBoundingClientRect === 'function') {
    const r = getElementRect(value as Element);
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  // Tracker-like (exposes `.state`).
  const state = (value as { state?: { rect?: Rect; centerX?: number; centerY?: number } })
    .state;
  if (state) {
    const r = state.rect ?? { x: 0, y: 0, width: 0, height: 0 };
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  const v = value as Partial<Point> & Partial<Rect>;
  const width = typeof v.width === 'number' ? v.width : 0;
  const height = typeof v.height === 'number' ? v.height : 0;
  return { x: v.x ?? 0, y: v.y ?? 0, width, height };
}

/** The geometric center of any trackable. */
export function center(value: Trackable): Point {
  const r = toRect(value);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Euclidean distance between the centers of two trackables. */
export function distance(a: Trackable, b: Trackable): number {
  const pa = center(a);
  const pb = center(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

/** Angle in degrees from `a` to `b` (0° points along +X, increasing clockwise). */
export function angle(a: Trackable, b: Trackable): number {
  const pa = center(a);
  const pb = center(b);
  return (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI;
}

/** Rectangular area of a trackable (0 when degenerate). */
export function area(value: Trackable): number {
  const r = toRect(value);
  return r.width * r.height;
}

/** Grow/shrink a rect by `padding` pixels on every side. */
export function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/** `true` when the two axis-aligned rects share at least one pixel. */
export function overlaps(a: Trackable, b: Trackable): boolean {
  const ra = toRect(a);
  const rb = toRect(b);
  return (
    ra.x <= rb.x + rb.width &&
    ra.x + ra.width >= rb.x &&
    ra.y <= rb.y + rb.height &&
    ra.y + ra.height >= rb.y
  );
}

/** `true` when `outer` fully contains `inner`. */
export function contains(outer: Trackable, inner: Trackable): boolean {
  const ro = toRect(outer);
  const ri = toRect(inner);
  return (
    ri.x >= ro.x &&
    ri.y >= ro.y &&
    ri.x + ri.width <= ro.x + ro.width &&
    ri.y + ri.height <= ro.y + ro.height
  );
}

/** Find the nearest element matching `selector`, relative to `from`. */
export function nearest(from: Trackable, selector: string): Element | null {
  if (typeof document === 'undefined') return null;
  const candidates = Array.from(document.querySelectorAll(selector));
  return nearestFromList(from, candidates);
}

/** Find the farthest element matching `selector`, relative to `from`. */
export function farthest(from: Trackable, selector: string): Element | null {
  if (typeof document === 'undefined') return null;
  const candidates = Array.from(document.querySelectorAll(selector));
  let best: Element | null = null;
  let bestDist = -1;
  for (const el of candidates) {
    const d = distance(from, el);
    if (d > bestDist) {
      bestDist = d;
      best = el;
    }
  }
  return best;
}

/** Internal: nearest from an explicit candidate list (used by collections). */
export function nearestFromList(from: Trackable, candidates: Element[]): Element | null {
  let best: Element | null = null;
  let bestDist = Infinity;
  for (const el of candidates) {
    const d = distance(from, el);
    if (d < bestDist) {
      bestDist = d;
      best = el;
    }
  }
  return best;
}
