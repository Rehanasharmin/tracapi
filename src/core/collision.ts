import type { CollisionMode, CollisionTarget, TrackerRect } from '../types';
import { expandRect } from '../utils/geometry';
import { getElementRect, isElement, resolveAll } from '../utils/dom';

/**
 * Collision resolution + AABB testing.
 * @internal
 */

/** Resolve a collision target into a concrete element list (cached for selectors). */
export function resolveCollisionElements(
  target: CollisionTarget | null | undefined,
  cache: Map<string, Element[]>,
): Element[] {
  if (!target || target === 'tracked') return [];
  if (typeof target === 'string') {
    const hit = cache.get(target);
    if (hit) return hit;
    const list = resolveAll(target);
    cache.set(target, list);
    return list;
  }
  if (isElement(target)) return [target];
  if (typeof target === 'function') {
    const result = target();
    return resolveCollisionElements(result, cache);
  }
  return resolveAll(target);
}

function padded(r: TrackerRect, padding: number): TrackerRect {
  if (!padding) return r;
  const p = expandRect(r, padding);
  return {
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    top: p.y,
    right: p.x + p.width,
    bottom: p.y + p.height,
    left: p.x,
  };
}

/** Test two rects against a collision mode. */
export function testCollision(
  a: TrackerRect,
  b: TrackerRect,
  mode: CollisionMode,
  padding: number,
): boolean {
  const ra = padded(a, padding);
  const rb = padded(b, padding);
  switch (mode) {
    case 'contain': {
      const ab =
        ra.x <= rb.x &&
        ra.y <= rb.y &&
        ra.x + ra.width >= rb.x + rb.width &&
        ra.y + ra.height >= rb.y + rb.height;
      const ba =
        rb.x <= ra.x &&
        rb.y <= ra.y &&
        rb.x + rb.width >= ra.x + ra.width &&
        rb.y + rb.height >= ra.y + ra.height;
      return ab || ba;
    }
    case 'center': {
      const ca = { x: ra.x + ra.width / 2, y: ra.y + ra.height / 2 };
      const cb = { x: rb.x + rb.width / 2, y: rb.y + rb.height / 2 };
      const caInB =
        ca.x >= rb.x && ca.x <= rb.x + rb.width && ca.y >= rb.y && ca.y <= rb.y + rb.height;
      const cbInA =
        cb.x >= ra.x && cb.x <= ra.x + ra.width && cb.y >= ra.y && cb.y <= ra.y + ra.height;
      return caInB || cbInA;
    }
    case 'overlap':
    case 'intersect':
    default:
      return (
        ra.x <= rb.x + rb.width &&
        ra.x + ra.width >= rb.x &&
        ra.y <= rb.y + rb.height &&
        ra.y + ra.height >= rb.y
      );
  }
}

/** Union rect of two rects (used for the `rect` field of collision events). */
export function unionRect(a: TrackerRect, b: TrackerRect): TrackerRect {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x: left, y: top, width: right - left, height: bottom - top, top, right, bottom, left };
}

/** Read a fresh rect for an external element. */
export function externalRect(el: Element): TrackerRect {
  return getElementRect(el);
}
