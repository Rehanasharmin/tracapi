import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HTMLTracker } from '../src';
import { flushFrames } from './setup';
import { makeEl, setRect } from './helpers';

interface MockIO {
  cb: (entries: { target: Element; isIntersecting: boolean; intersectionRatio: number }[], obs: unknown) => void;
  els: Set<Element>;
}
interface MockRO {
  cb: () => void;
  els: Set<Element>;
}

let mockIOs: MockIO[] = [];
let mockROs: MockRO[] = [];
let savedIO: unknown;
let savedRO: unknown;

beforeEach(() => {
  mockIOs = [];
  mockROs = [];
  savedIO = (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  savedRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;

  (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = class {
    cb: MockIO['cb'];
    els = new Set<Element>();
    constructor(cb: MockIO['cb']) {
      this.cb = cb;
      mockIOs.push(this);
    }
    observe(el: Element) {
      this.els.add(el);
    }
    unobserve(el: Element) {
      this.els.delete(el);
    }
    disconnect() {
      this.els.clear();
    }
    takeRecords() {
      return [];
    }
  };

  (globalThis as { ResizeObserver: unknown }).ResizeObserver = class {
    cb: () => void;
    els = new Set<Element>();
    constructor(cb: () => void) {
      this.cb = cb;
      mockROs.push(this);
    }
    observe(el: Element) {
      this.els.add(el);
    }
    unobserve() {}
    disconnect() {
      this.els.clear();
    }
  };
});

afterEach(() => {
  if (savedIO === undefined) delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  else (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = savedIO;
  if (savedRO === undefined) delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  else (globalThis as { ResizeObserver?: unknown }).ResizeObserver = savedRO;
});

function fireIO(el: Element, isIntersecting: boolean, ratio = 1): void {
  for (const m of mockIOs) if (m.els.has(el)) m.cb([{ target: el, isIntersecting, intersectionRatio: ratio }], null);
}
function fireRO(el: Element): void {
  for (const m of mockROs) if (m.els.has(el)) m.cb();
}

const tick = () => flushFrames(1);

describe('native observers', () => {
  it('viewport events are driven by IntersectionObserver', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    const seq: string[] = [];
    t.on('enterViewport', () => seq.push('enter'));
    t.on('leaveViewport', () => seq.push('leave'));
    tick();
    fireIO(el, true);
    tick(); // baseline (no event)
    fireIO(el, false);
    tick();
    expect(seq).toContain('leave');
    fireIO(el, true);
    tick();
    expect(seq).toContain('enter');
    t.stop();
  });

  it('resize events are driven by ResizeObserver', () => {
    const el = makeEl();
    setRect(el, 0, 0, 100, 100);
    const t = HTMLTracker.track(el);
    const dw: number[] = [];
    t.on('resize', (e) => dw.push(e.dw));
    tick();
    fireRO(el);
    tick(); // baseline
    setRect(el, 0, 0, 150, 100); // poll updates width silently (RO active)
    tick();
    fireRO(el);
    tick();
    expect(dw).toEqual([50]);
    t.stop();
  });

  it('does not double-fire resize from the poll when RO is active', () => {
    const el = makeEl();
    setRect(el, 0, 0, 100, 100);
    const t = HTMLTracker.track(el);
    const count = { value: 0 };
    t.on('resize', () => (count.value += 1));
    tick();
    fireRO(el);
    tick();
    setRect(el, 0, 0, 200, 200);
    tick(); // poll only — no event expected
    expect(count.value).toBe(0);
    fireRO(el);
    tick();
    expect(count.value).toBe(1);
    t.stop();
  });
});
