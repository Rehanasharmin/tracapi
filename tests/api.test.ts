import { describe, it, expect } from 'vitest';
import { HTMLTracker } from '../src';
import { flushFrames } from './setup';
import { makeEl, setRect } from './helpers';

const tick = () => flushFrames(1);

describe('HTMLTracker (public API)', () => {
  it('exposes a version string', () => {
    expect(typeof HTMLTracker.version).toBe('string');
    expect(HTMLTracker.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('track() throws on a selector that matches nothing', () => {
    expect(() => HTMLTracker.track('.does-not-exist')).toThrow(/no element found/);
  });

  it('track() accepts an element directly', () => {
    const el = makeEl();
    setRect(el, 5, 5);
    const t = HTMLTracker.track(el);
    expect(t.element).toBe(el);
    t.stop();
  });

  it('size() reflects active trackers', () => {
    const before = HTMLTracker.size;
    const a = makeEl();
    setRect(a, 0, 0);
    const b = makeEl();
    setRect(b, 0, 0);
    const ta = HTMLTracker.track(a);
    const tb = HTMLTracker.track(b);
    expect(HTMLTracker.size).toBe(before + 2);
    ta.stop();
    tb.stop();
    expect(HTMLTracker.size).toBe(before);
  });

  it('utilities work without a tracker', () => {
    expect(HTMLTracker.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(HTMLTracker.overlaps({ x: 0, y: 0, width: 5, height: 5 }, { x: 4, y: 4, width: 5, height: 5 })).toBe(true);
    expect(HTMLTracker.contains({ x: 0, y: 0, width: 100, height: 100 }, { x: 10, y: 10, width: 5, height: 5 })).toBe(true);
  });

  it('pause()/resume() suspend the whole engine', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    const moves: number[] = [];
    t.on('move', (e) => moves.push(e.dx));
    tick();
    HTMLTracker.pause();
    expect(HTMLTracker.isPaused()).toBe(true);
    setRect(el, 50, 0);
    tick();
    expect(moves).toEqual([]); // paused: no measurement
    HTMLTracker.resume();
    expect(HTMLTracker.isPaused()).toBe(false);
    setRect(el, 80, 0);
    tick();
    expect(moves.length).toBe(1);
    t.stop();
  });

  it('normalizeOptions fills defaults', () => {
    const o = HTMLTracker.normalizeOptions({ precision: 2 });
    expect(o.precision).toBe(2);
    expect(o.pollStyle).toBe(true);
    expect(o.autoDestroy).toBe(true);
    expect(o.collision).toBe(false);
  });
});
