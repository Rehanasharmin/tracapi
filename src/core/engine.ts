import type { Tracker } from '../Tracker';
import type { TrackerCollection } from '../TrackerCollection';
import type { CollisionOptions } from '../types';
import { testCollision } from './collision';

/**
 * The shared tracking engine.
 *
 * A single `requestAnimationFrame` loop serves every active tracker and
 * collection. Each frame is split into three phases to eliminate layout
 * thrashing:
 *
 *   1. **READ**  — measure every tracker (DOM reads only).
 *   2. **COMPUTE** — resolve collisions (still read-only).
 *   3. **FLUSH** — dispatch events (user handlers may now write to the DOM).
 *
 * @internal
 */

type FrameHandle = number;
const scheduleFrame: (cb: () => void) => FrameHandle =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 16) as unknown as FrameHandle;
const cancelFrame: (h: FrameHandle) => void =
  typeof cancelAnimationFrame === 'function'
    ? (h) => cancelAnimationFrame(h)
    : (h) => clearTimeout(h as unknown as ReturnType<typeof setTimeout>);

class TrackingEngine {
  private readonly trackers = new Set<Tracker>();
  private readonly collections = new Set<TrackerCollection>();
  private handle: FrameHandle | null = null;
  private paused = false;
  private frame = 0;

  get size(): number {
    return this.trackers.size;
  }

  get isRunning(): boolean {
    return this.handle !== null;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  registerTracker(t: Tracker): void {
    this.trackers.add(t);
    this.ensureRunning();
  }

  unregisterTracker(t: Tracker): void {
    if (this.trackers.delete(t)) this.maybeStop();
  }

  registerCollection(c: TrackerCollection): void {
    this.collections.add(c);
    this.ensureRunning();
  }

  unregisterCollection(c: TrackerCollection): void {
    if (this.collections.delete(c)) this.maybeStop();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.ensureRunning();
  }

  private ensureRunning(): void {
    if (this.handle !== null) return;
    if (this.trackers.size === 0 && this.collections.size === 0) return;
    if (this.paused) return;
    const tick = (): void => {
      this.handle = scheduleFrame(tick);
      if (this.paused) return;
      this.frame += 1;
      this.runFrame();
    };
    this.handle = scheduleFrame(tick);
  }

  private maybeStop(): void {
    if (this.handle !== null && this.trackers.size === 0 && this.collections.size === 0) {
      cancelFrame(this.handle);
      this.handle = null;
    }
  }

  private runFrame(): void {
    // Phase 1: READ — measure every tracker.
    for (const t of this.trackers) t._tick(this.frame);
    // Phase 2a: reset per-frame collision accumulators.
    for (const t of this.trackers) t._beginCollisionFrame();
    // Phase 2b: 'tracked' pairwise collisions (standalone trackers only).
    this.runTrackedCollisions();
    // Phase 2c: external collisions per tracker.
    for (const t of this.trackers) t._updateExternalCollisions(this.frame);
    // Phase 2d: collection member-vs-member collisions.
    for (const c of this.collections) c._runCollisions();
    // Phase 2e: diff + queue collision events.
    for (const t of this.trackers) t._flushCollisions();
    // Phase 3: FLUSH — emit everything (handlers may now mutate the DOM).
    for (const t of this.trackers) t._flush();
    for (const c of this.collections) c._flush();
  }

  /** Pairwise scan over standalone trackers that opted into `collision: 'tracked'`. */
  private runTrackedCollisions(): void {
    const group: Tracker[] = [];
    for (const t of this.trackers) {
      if (t._collectionOwner) continue;
      const c = t.resolvedOptions.collision;
      if (c && c.with === 'tracked') group.push(t);
    }
    for (let i = 0; i < group.length; i++) {
      const a = group[i];
      const opts = a.resolvedOptions.collision as CollisionOptions;
      const mode = opts.mode ?? 'overlap';
      const padding = opts.padding ?? 0;
      for (let j = i + 1; j < group.length; j++) {
        const b = group[j];
        if (
          a.active &&
          b.active &&
          a.state.inDOM &&
          b.state.inDOM &&
          testCollision(a.state.rect, b.state.rect, mode, padding)
        ) {
          a._markColliding(b);
          b._markColliding(a);
        }
      }
    }
  }

  /** Test-only: tear everything down. @internal */
  _resetForTesting(): void {
    if (this.handle !== null) {
      cancelFrame(this.handle);
      this.handle = null;
    }
    this.trackers.clear();
    this.collections.clear();
    this.paused = false;
    this.frame = 0;
  }
}

export const engine = new TrackingEngine();
