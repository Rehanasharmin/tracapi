/**
 * Test harness shared by every spec.
 *
 * jsdom omits `requestAnimationFrame`, `IntersectionObserver`, and
 * `ResizeObserver`, so the library's *fallback* paths are exercised by default.
 * (MutationObserver *is* available, so attribute/destroy paths use the real
 * implementation.) `getComputedStyle` is replaced with a controllable store.
 */

type FrameCb = (time: number) => void;

// --- requestAnimationFrame polyfill (manual flush) -----------------------
let rafQueue: FrameCb[] = [];
let rafId = 1;
const rafMap = new Map<number, FrameCb>();

(globalThis as unknown as { requestAnimationFrame: (cb: FrameCb) => number }).requestAnimationFrame =
  (cb: FrameCb): number => {
    const id = rafId++;
    rafMap.set(id, cb);
    rafQueue.push(cb);
    return id;
  };

(globalThis as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = (
  id: number,
): void => {
  const cb = rafMap.get(id);
  if (cb) {
    rafMap.delete(id);
    rafQueue = rafQueue.filter((c) => c !== cb);
  }
};

/** Run `count` animation frames (each frame drains the current queue). */
export function flushFrames(count = 1): void {
  for (let i = 0; i < count; i++) {
    const current = rafQueue;
    rafQueue = [];
    const t =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    for (const cb of current) cb(t);
  }
}

export function pendingFrameCount(): number {
  return rafQueue.length;
}

// --- getComputedStyle mock ------------------------------------------------
const styleStore = new Map<Element, Record<string, string>>();

/** Set computed-style values returned by `getComputedStyle(el)`. */
export function setStyle(el: Element, styles: Record<string, string>): void {
  styleStore.set(el, { ...(styleStore.get(el) ?? {}), ...styles });
}

export function clearStyles(): void {
  styleStore.clear();
}

(globalThis as unknown as { getComputedStyle: (el: Element) => CSSStyleDeclaration }).getComputedStyle =
  (el: Element): CSSStyleDeclaration =>
    ({
      getPropertyValue: (p: string): string => styleStore.get(el)?.[p] ?? '',
    }) as unknown as CSSStyleDeclaration;

// --- per-suite cleanup ----------------------------------------------------
import { engine } from '../src/core/engine';
import { afterEach } from 'vitest';

afterEach(() => {
  // Stop every tracker/collection and clear the loop.
  engine._resetForTesting();
  rafQueue = [];
  rafMap.clear();
  rafId = 1;
  clearStyles();
  document.body.innerHTML = '';
});
