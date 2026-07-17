import { describe, it, expect } from 'vitest';
import { HTMLTracker } from '../src';
import { flushFrames } from './setup';
import { makeEl, setRect } from './helpers';

const tick = () => flushFrames(1);

describe('TrackerCollection', () => {
  it('tracks every element matched by a selector', () => {
    makeEl('div', { class: 'enemy', id: 'e1' });
    makeEl('div', { class: 'enemy', id: 'e2' });
    makeEl('div', { class: 'enemy', id: 'e3' });
    const col = HTMLTracker.trackAll('.enemy');
    expect(col.size).toBe(3);
    expect(col.trackers.map((t) => t.element.id).sort()).toEqual(['e1', 'e2', 'e3']);
    col.stopAll();
  });

  it('detects member-vs-member collisions on the collection', () => {
    const a = makeEl('div', { class: 'mob' });
    setRect(a, 0, 0, 50, 50);
    const b = makeEl('div', { class: 'mob' });
    setRect(b, 40, 0, 50, 50); // overlaps a
    const c = makeEl('div', { class: 'mob' });
    setRect(c, 5000, 0, 50, 50); // isolated
    const col = HTMLTracker.trackAll('.mob');
    const starts: string[] = [];
    col.on('collisionStart', (e) => starts.push(`${e.from.element === a}-${e.to.element === b}`));
    tick();
    expect(starts.length).toBeGreaterThan(0);
    expect(col.collisions().length).toBe(1);
    col.stopAll();
  });

  it('also emits collisionStart on each member tracker', () => {
    const a = makeEl('div', { class: 'unit' });
    setRect(a, 0, 0, 50, 50);
    const b = makeEl('div', { class: 'unit' });
    setRect(b, 40, 0, 50, 50);
    const col = HTMLTracker.trackAll('.unit');
    const ta = col.trackers.find((t) => t.element === a)!;
    let other: Element | null = null;
    ta.on('collisionStart', (e) => (other = e.other));
    tick();
    expect(other).toBe(b);
    col.stopAll();
  });

  it('forwards member events onto the collection', () => {
    const a = makeEl('div', { class: 'fwd' });
    setRect(a, 0, 0);
    const col = HTMLTracker.trackAll('.fwd');
    const moves: number[] = [];
    col.on('move', (e) => moves.push(e.dx));
    tick();
    setRect(a, 7, 0);
    tick();
    expect(moves).toEqual([7]);
    col.stopAll();
  });

  it('nearestTo / farthestFrom pick the right member', () => {
    const a = makeEl('div', { class: 'pt' });
    setRect(a, 0, 0);
    const b = makeEl('div', { class: 'pt' });
    setRect(b, 100, 0);
    const c = makeEl('div', { class: 'pt' });
    setRect(c, 900, 0);
    const col = HTMLTracker.trackAll('.pt');
    expect(col.nearestTo({ x: 0, y: 0, width: 0, height: 0 })?.element).toBe(a);
    expect(col.farthestFrom({ x: 0, y: 0, width: 0, height: 0 })?.element).toBe(c);
    col.stopAll();
  });

  it('remove() stops a single member', () => {
    const a = makeEl('div', { class: 'rm' });
    setRect(a, 0, 0);
    const b = makeEl('div', { class: 'rm' });
    setRect(b, 0, 0);
    const col = HTMLTracker.trackAll('.rm');
    expect(col.size).toBe(2);
    const ta = col.trackers.find((t) => t.element === a)!;
    col.remove(ta);
    expect(col.size).toBe(1);
    expect(ta.active).toBe(false);
    col.stopAll();
  });
});
