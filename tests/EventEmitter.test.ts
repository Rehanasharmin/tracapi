import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/events/EventEmitter';

describe('EventEmitter', () => {
  it('calls handlers on emit and supports unsubscribe', () => {
    const ee = new EventEmitter<{ hit: number }>();
    let received = 0;
    const off = ee.on('hit', (n) => (received = n));
    ee.emit('hit', 42);
    expect(received).toBe(42);
    off();
    ee.emit('hit', 99);
    expect(received).toBe(42);
  });

  it('`once` fires only the first time', () => {
    const ee = new EventEmitter<{ go: string }>();
    const calls: string[] = [];
    ee.once('go', (s) => calls.push(s));
    ee.emit('go', 'a');
    ee.emit('go', 'b');
    expect(calls).toEqual(['a']);
  });

  it('off without a handler clears all handlers for that event', () => {
    const ee = new EventEmitter<{ x: void }>();
    let count = 0;
    ee.on('x', () => count++);
    ee.on('x', () => count++);
    ee.off('x');
    ee.emit('x', undefined);
    expect(count).toBe(0);
  });

  it('isolates a throwing handler and keeps dispatching', () => {
    const ee = new EventEmitter<{ x: void }>();
    const seen: number[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ee.on('x', () => {
      throw new Error('boom');
    });
    ee.on('x', () => seen.push(1));
    ee.emit('x', undefined);
    expect(seen).toEqual([1]);
    spy.mockRestore();
  });

  it('handler added during emission does not run in the same pass', () => {
    const ee = new EventEmitter<{ x: void }>();
    const order: string[] = [];
    ee.on('x', () => {
      order.push('first');
      ee.on('x', () => order.push('late'));
    });
    ee.emit('x', undefined);
    ee.emit('x', undefined);
    expect(order).toEqual(['first', 'first', 'late']);
  });

  it('reports listener counts', () => {
    const ee = new EventEmitter<{ x: void }>();
    expect(ee.listenerCount('x')).toBe(0);
    ee.on('x', () => {});
    expect(ee.listenerCount('x')).toBe(1);
  });
});
