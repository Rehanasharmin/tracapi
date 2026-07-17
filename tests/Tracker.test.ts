import { describe, it, expect } from 'vitest';
import { HTMLTracker } from '../src';
import { flushFrames } from './setup';
import { makeEl, setRect } from './helpers';
import { setStyle } from './setup';

const tick = () => flushFrames(1);
const flushMutations = () => new Promise<void>((r) => setTimeout(r, 0));

describe('Tracker — initial state', () => {
  it('exposes a snapshot immediately, before any frame', () => {
    const el = makeEl();
    setRect(el, 10, 20, 100, 40);
    const t = HTMLTracker.track(el);
    expect(t.state.x).toBe(10);
    expect(t.state.y).toBe(20);
    expect(t.state.width).toBe(100);
    expect(t.state.height).toBe(40);
    expect(t.state.centerX).toBe(60);
    expect(t.active).toBe(true);
    expect(t.id).toBeTruthy();
    t.stop();
  });
});

describe('Tracker — geometry events', () => {
  it('emits move with deltas', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    const moves: number[] = [];
    t.on('move', (e) => moves.push(e.dx, e.dy));
    tick(); // baseline
    setRect(el, 50, 60);
    tick();
    expect(moves).toEqual([50, 60]);
    t.stop();
  });

  it('emits resize with deltas (rect-poll fallback)', () => {
    const el = makeEl();
    setRect(el, 0, 0, 100, 100);
    const t = HTMLTracker.track(el);
    const resizes: number[] = [];
    t.on('resize', (e) => resizes.push(e.dw, e.dh));
    tick();
    setRect(el, 0, 0, 200, 250);
    tick();
    expect(resizes).toEqual([100, 150]);
    t.stop();
  });

  it('emits scroll offsets', () => {
    const el = makeEl() as HTMLElement;
    setRect(el, 0, 0);
    el.scrollTop = 0;
    el.scrollLeft = 0;
    const t = HTMLTracker.track(el);
    const scrolls: number[] = [];
    t.on('scroll', (e) => scrolls.push(e.dx, e.dy));
    tick();
    el.scrollTop = 40;
    el.scrollLeft = 10;
    tick();
    expect(scrolls).toEqual([10, 40]);
    t.stop();
  });
});

describe('Tracker — style events', () => {
  it('emits rotate when the transform matrix changes', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    const rotations: number[] = [];
    t.on('rotate', (e) => rotations.push(e.rotation));
    tick();
    setStyle(el, { transform: 'matrix(0, 1, -1, 0, 0, 0)' }); // 90deg
    tick();
    expect(rotations[0]).toBeCloseTo(90);
    t.stop();
  });

  it('emits scale for non-uniform scaling', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    const scales: number[] = [];
    t.on('scale', (e) => scales.push(e.scaleX, e.scaleY));
    tick();
    setStyle(el, { transform: 'matrix(2, 0, 0, 3, 0, 0)' });
    tick();
    expect(scales).toEqual([2, 3]);
    t.stop();
  });

  it('emits opacityChange', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    const ops: number[] = [];
    t.on('opacityChange', (e) => ops.push(e.opacity));
    tick();
    setStyle(el, { opacity: '0.5' });
    tick();
    expect(ops).toEqual([0.5]);
    t.stop();
  });

  it('emits visibilityChange on display:none', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    let visible: boolean | null = null;
    t.on('visibilityChange', (e) => (visible = e.visible));
    tick();
    setStyle(el, { display: 'none' });
    tick();
    expect(visible).toBe(false);
    expect(t.state.visibility).toBe('display-none');
    t.stop();
  });
});

describe('Tracker — viewport events (fallback)', () => {
  it('emits leaveViewport then enterViewport', () => {
    const el = makeEl();
    setRect(el, 0, 0); // within 1024x768
    const t = HTMLTracker.track(el);
    const events: string[] = [];
    t.on('enterViewport', () => events.push('enter'));
    t.on('leaveViewport', () => events.push('leave'));
    tick();
    setRect(el, 5000, 5000); // off-screen
    tick();
    setRect(el, 0, 0); // back on-screen
    tick();
    expect(events).toEqual(['leave', 'enter']);
    t.stop();
  });
});

describe('Tracker — attribute events (real MutationObserver)', () => {
  it('emits attributeChange with changed names', async () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    let attrs: readonly string[] = [];
    t.on('attributeChange', (e) => (attrs = e.attributes));
    tick();
    el.setAttribute('data-x', '1');
    await flushMutations();
    tick();
    expect(attrs).toContain('data-x');
    t.stop();
  });
});

describe('Tracker — lifecycle', () => {
  it('auto-destroys when the element leaves the DOM', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    let automatic: boolean | null = null;
    t.on('destroy', (e) => (automatic = e.automatic));
    tick();
    el.remove();
    tick();
    expect(automatic).toBe(true);
    expect(t.active).toBe(false);
  });

  it('manual stop emits destroy with automatic=false', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    let automatic: boolean | null = null;
    t.on('destroy', (e) => (automatic = e.automatic));
    t.stop();
    expect(automatic).toBe(false);
    expect(t.active).toBe(false);
  });

  it('pause suspends measurements; resume restores them', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    const moves: number[] = [];
    t.on('move', (e) => moves.push(e.dx));
    tick();
    t.pause();
    setRect(el, 50, 0);
    tick();
    t.resume();
    setRect(el, 100, 0);
    tick();
    // While paused nothing is measured, so on resume the move reports the
    // full displacement from the last known position (0 -> 100).
    expect(moves).toEqual([100]);
    t.stop();
  });

  it('update() merges options live', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el, { precision: 0.01 });
    t.update({ precision: 5 });
    expect(t.resolvedOptions.precision).toBe(5);
    t.stop();
  });
});

describe('Tracker — collisions (external targets)', () => {
  it('fires collisionStart / collisionEnd against a selector', () => {
    const a = makeEl('div', { class: 'player' });
    setRect(a, 0, 0, 50, 50);
    const b = makeEl('div', { class: 'enemy' });
    setRect(b, 40, 0, 50, 50); // overlaps a
    const t = HTMLTracker.track(a, { collision: { with: '.enemy' } });
    const seq: string[] = [];
    t.on('collisionStart', (e) => seq.push(`start:${e.other === b}`));
    t.on('collisionEnd', (e) => seq.push(`end:${e.other === b}`));
    tick();
    expect(seq).toContain('start:true');
    setRect(b, 5000, 0, 50, 50); // move away
    tick();
    expect(seq).toContain('end:true');
    t.stop();
  });

  it('"collision" is an alias for collisionStart', () => {
    const a = makeEl('div', { class: 'p2' });
    setRect(a, 0, 0, 50, 50);
    const b = makeEl('div', { class: 'e2' });
    setRect(b, 40, 0, 50, 50);
    const t = HTMLTracker.track(a, { collision: { with: '.e2' } });
    let hit = false;
    t.on('collision', () => (hit = true));
    tick();
    expect(hit).toBe(true);
    t.stop();
  });
});

describe('Tracker — queries', () => {
  it('distanceTo / angleTo / isCollidingWith', () => {
    const el = makeEl();
    setRect(el, 0, 0, 100, 100); // center (50,50)
    const t = HTMLTracker.track(el);
    expect(t.distanceTo({ x: 50, y: 150, width: 0, height: 0 })).toBeCloseTo(100);
    expect(t.angleTo({ x: 150, y: 50, width: 0, height: 0 })).toBeCloseTo(0);
    expect(t.isCollidingWith({ x: 40, y: 40, width: 50, height: 50 })).toBe(true);
    expect(t.isCollidingWith({ x: 500, y: 500, width: 10, height: 10 })).toBe(false);
    t.stop();
  });

  it('emits a change event listing changed facets', () => {
    const el = makeEl();
    setRect(el, 0, 0);
    const t = HTMLTracker.track(el);
    let changed: readonly string[] = [];
    t.on('change', (e) => (changed = e.changed));
    tick();
    setRect(el, 30, 40, 10, 10);
    tick();
    expect(changed).toEqual(expect.arrayContaining(['move', 'resize']));
    t.stop();
  });
});
