import type {
  CollisionMode,
  CollisionOptions,
  TrackerOptions,
  TrackerSnapshot,
  Trackable,
} from './types';
import type {
  CollectionCollisionEvent,
  CollectionEventMap,
  CollectionEventHandler,
} from './events/eventTypes';
import { EventEmitter, type Unsubscribe } from './events/EventEmitter';
import { engine } from './core/engine';
import { Tracker } from './Tracker';
import { testCollision, unionRect } from './core/collision';
import { distance as distanceOf } from './utils/geometry';
import { getElementRect, resolveAll } from './utils/dom';

/** Options accepted by {@link HTMLTracker.trackAll}. */
export interface TrackerCollectionOptions extends TrackerOptions {
  /** Collision config applied to the group (member-vs-member). Defaults to overlap. */
  collision?: CollisionOptions | false;
  /** Forward every member event onto the collection. Defaults to `true`. */
  forwardEvents?: boolean;
}

/** Names forwarded from members onto the collection. */
const FORWARD_EVENTS = [
  'move',
  'resize',
  'scroll',
  'rotate',
  'scale',
  'opacityChange',
  'visibilityChange',
  'enterViewport',
  'leaveViewport',
  'attributeChange',
  'destroy',
  'change',
] as const;

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Manages a set of {@link Tracker} instances created from a selector/element
 * list (typically via {@link HTMLTracker.trackAll}). Owns member-vs-member
 * collision detection and optionally forwards per-member events.
 */
export class TrackerCollection {
  private readonly emitter = new EventEmitter<CollectionEventMap>();
  private readonly unsubs: Unsubscribe[] = [];
  private members: Tracker[] = [];
  private readonly collisionOpts: CollisionOptions;
  private readonly forward: boolean;
  private prevPairs = new Map<string, [Tracker, Tracker]>();
  private currentPairs = new Map<string, [Tracker, Tracker]>();

  constructor(
    targets: ArrayLike<Element> | Element[] | string,
    options?: TrackerCollectionOptions,
  ) {
    const { collision, forwardEvents, ...memberOptions } = options ?? {};
    this.forward = forwardEvents ?? true;
    this.collisionOpts =
      collision === false
        ? { with: 'tracked', mode: 'overlap' as CollisionMode, padding: 0, refreshFrames: 30 }
        : {
            with: 'tracked',
            mode: collision?.mode ?? 'overlap',
            padding: collision?.padding ?? 0,
            refreshFrames: collision?.refreshFrames ?? 30,
          };

    const elements =
      typeof targets === 'string' ? resolveAll(targets) : Array.from(targets);
    for (const el of elements) {
      this.add(el, memberOptions);
    }
    engine.registerCollection(this);
  }

  /** The member trackers (live reference; reflects additions/removals). */
  get trackers(): readonly Tracker[] {
    return this.members;
  }

  /** Number of members. */
  get size(): number {
    return this.members.length;
  }

  /** Subscribe to a collection event. */
  on<K extends keyof CollectionEventMap>(
    event: K,
    handler: CollectionEventHandler<K>,
  ): Unsubscribe {
    return this.emitter.on(event, handler as never);
  }

  /** Subscribe to the next occurrence of a collection event. */
  once<K extends keyof CollectionEventMap>(
    event: K,
    handler: CollectionEventHandler<K>,
  ): Unsubscribe {
    return this.emitter.once(event, handler as never);
  }

  /** Remove a handler (or all handlers for `event`). */
  off<K extends keyof CollectionEventMap>(
    event: K,
    handler?: CollectionEventHandler<K>,
  ): void {
    this.emitter.off(event, handler as never | undefined);
  }

  /* ------------------------------------------------------------------ *
   * Membership
   * ------------------------------------------------------------------ */

  /** Track an additional element. */
  add(target: Element | string, options?: TrackerOptions): Tracker {
    const el =
      typeof target === 'string' ? resolveAll(target)[0] ?? null : target;
    if (!el) {
      throw new Error(`[tracapi] trackAll: element not found for "${String(target)}".`);
    }
    const tracker = new Tracker(el, { ...options, collision: false });
    tracker._collectionOwner = this;
    this.members.push(tracker);
    if (this.forward) this.wire(tracker);
    return tracker;
  }

  /** Remove (and stop) a member by tracker or id. */
  remove(trackerOrId: Tracker | string): boolean {
    const member =
      typeof trackerOrId === 'string'
        ? this.members.find((m) => m.id === trackerOrId)
        : this.members.find((m) => m === trackerOrId);
    if (!member) return false;
    this.detach(member);
    member.stop();
    return true;
  }

  /** Iterate every member. */
  each(fn: (tracker: Tracker, index: number) => void): void {
    this.members.forEach(fn);
  }

  /** Find a member by id. */
  get(id: string): Tracker | undefined {
    return this.members.find((m) => m.id === id);
  }

  /* ------------------------------------------------------------------ *
   * Queries
   * ------------------------------------------------------------------ */

  /** All currently-colliding member pairs. */
  collisions(): ReadonlyArray<readonly [Tracker, Tracker]> {
    return Array.from(this.currentPairs.values());
  }

  /** Member nearest to a trackable. */
  nearestTo(target: Trackable): Tracker | undefined {
    const ref = rectLike(target);
    let best: Tracker | undefined;
    let bestDist = Infinity;
    for (const m of this.members) {
      const d = distanceOf(m.stateSnapshot, ref);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    }
    return best;
  }

  /** Member farthest from a trackable. */
  farthestFrom(target: Trackable): Tracker | undefined {
    const ref = rectLike(target);
    let best: Tracker | undefined;
    let bestDist = -1;
    for (const m of this.members) {
      const d = distanceOf(m.stateSnapshot, ref);
      if (d > bestDist) {
        bestDist = d;
        best = m;
      }
    }
    return best;
  }

  /* ------------------------------------------------------------------ *
   * Lifecycle
   * ------------------------------------------------------------------ */

  /** Stop every member and the collection. */
  stopAll(): void {
    for (const member of [...this.members]) {
      this.detach(member);
      member.stop();
    }
    this.members = [];
    engine.unregisterCollection(this);
    this.emitter.clear();
  }

  /** Alias for {@link stopAll}. */
  dispose(): void {
    this.stopAll();
  }

  /* ------------------------------------------------------------------ *
   * Internal: collisions + flush (called by the engine)
   * ------------------------------------------------------------------ */

  /** @internal */
  _runCollisions(): void {
    this.currentPairs = new Map();
    if (this.collisionOpts && this.members.length < 2) return;
    const active = this.members.filter((m) => m.active && m.stateSnapshot.inDOM);
    const mode = this.collisionOpts.mode ?? 'overlap';
    const padding = this.collisionOpts.padding ?? 0;
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        if (testCollision(a.stateSnapshot.rect, b.stateSnapshot.rect, mode, padding)) {
          a._markColliding(b);
          b._markColliding(a);
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          this.currentPairs.set(key, [a, b]);
        }
      }
    }
  }

  /** @internal */
  _flush(): void {
    if (this.currentPairs.size || this.prevPairs.size) {
      const mode = this.collisionOpts.mode ?? 'overlap';
      for (const [key, [a, b]] of this.currentPairs) {
        if (!this.prevPairs.has(key)) {
          const payload = this.collisionPayload(a, b, mode);
          this.emitter.emit('collisionStart', payload);
          this.emitter.emit('collision', payload);
        }
      }
      for (const [key, [a, b]] of this.prevPairs) {
        if (!this.currentPairs.has(key)) {
          this.emitter.emit('collisionEnd', this.collisionPayload(a, b, mode));
        }
      }
    }
    this.prevPairs = this.currentPairs;
  }

  /** @internal Called by a member when it is destroyed. */
  _onMemberDestroyed(member: Tracker): void {
    this.detach(member);
  }

  private collisionPayload(
    a: Tracker,
    b: Tracker,
    mode: string,
  ): CollectionCollisionEvent {
    return {
      timestamp: now(),
      from: a,
      to: b,
      rect: unionRect(a.stateSnapshot.rect, b.stateSnapshot.rect),
      mode,
    };
  }

  private wire(member: Tracker): void {
    for (const name of FORWARD_EVENTS) {
      this.unsubs.push(
        member.on(name, (payload) => {
          this.emitter.emit(name, payload as never);
        }),
      );
    }
  }

  private detach(member: Tracker): void {
    const idx = this.members.indexOf(member);
    if (idx !== -1) this.members.splice(idx, 1);
  }

  /** Snapshot of every member's current state. */
  snapshots(): TrackerSnapshot[] {
    return this.members.map((m) => m.stateSnapshot);
  }
}

function rectLike(target: Trackable): Trackable {
  if (typeof (target as Element).getBoundingClientRect === 'function') {
    return { ...getElementRect(target as Element) };
  }
  return target;
}
