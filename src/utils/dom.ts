import type { TrackerRect } from '../types';

/**
 * DOM resolution and read helpers. All DOM **reads** live here so the engine
 * can batch them in a single pass and avoid layout thrash.
 * @internal
 */

/** Type guard for a DOM Element (works across realms, e.g. jsdom). */
export function isElement(node: unknown): node is Element {
  return (
    typeof node === 'object' &&
    node !== null &&
    typeof (node as Element).nodeType === 'number' &&
    (node as Element).nodeType === 1
  );
}

/** Resolve a single element from a string selector, element, or nullish input. */
export function resolveElement(target: unknown): Element | null {
  if (target == null) return null;
  if (isElement(target)) return target;
  if (typeof target === 'string') {
    const trimmed = target.trim();
    if (!trimmed) return null;
    if (typeof document !== 'undefined') {
      return document.querySelector(trimmed);
    }
    return null;
  }
  return null;
}

/** Resolve zero or more elements from selectors, elements, arrays, or NodeLists. */
export function resolveAll(targets: unknown): Element[] {
  if (targets == null) return [];
  if (isElement(targets)) return [targets];
  if (typeof targets === 'string') {
    const trimmed = targets.trim();
    if (!trimmed || typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll(trimmed));
  }
  if (Array.isArray(targets)) {
    const out: Element[] = [];
    for (const t of targets) out.push(...resolveAll(t));
    return out;
  }
  // NodeList / HTMLCollection
  if (typeof (targets as NodeList).length === 'number') {
    return Array.from(targets as ArrayLike<Element>).filter(isElement);
  }
  return [];
}

/** Read a computed-style value without throwing in non-browser environments. */
export function readStyle(el: Element, property: string): string {
  const gcs = (globalThis as { getComputedStyle?: unknown }).getComputedStyle;
  if (typeof gcs !== 'function') return '';
  try {
    const style = (gcs as (el: Element) => CSSStyleDeclaration | null).call(
      globalThis,
      el,
    );
    if (!style) return '';
    return typeof style.getPropertyValue === 'function'
      ? style.getPropertyValue(property)
      : String((style as unknown as Record<string, unknown>)[property] ?? '');
  } catch {
    return '';
  }
}

/** Copy a DOMRect into a plain, frozen TrackerRect (no live reference). */
export function getElementRect(el: Element): TrackerRect {
  const r = el.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    left: r.left,
  };
}

/** Clamp `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
