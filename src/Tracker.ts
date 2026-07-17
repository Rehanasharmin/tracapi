import type {
  CollisionOptions,
  ResolvedTrackerOptions,
  TrackerOptions,
  TrackerRect,
  TrackerSnapshot,
  Visibility,
  ViewportState,
  Trackable,
} from './types';
import type {
  AttributeEvent,
  ChangeEvent,
  CollisionEvent,
  DestroyEvent,
  MoveEvent,
  OpacityEvent,
  ResizeEvent,
  RotateEvent,
  ScaleEvent,
  ScrollEvent,
  TrackerEventMap,
  TrackerEventName,
  ViewportEvent,
  VisibilityEvent,
} from './events/eventTypes';
import { EventEmitter, type Unsubscribe } from './events/EventEmitter';
import { resolveEventName } from './events/eventTypes';
import { engine } from './core/engine';
import {
  changedFacetList,
  diffSnapshots,
  measureElement,
  type ChangeFacets,
} from './core/snapshot';
import { TrackerObservers } from './core/observers';
import {
  externalRect,
  resolveCollisionElements,
  testCollision,
  unionRect,
} from './core/collision';
import { generateId } from './utils/id';
import {
  angle as angleOf,
  distance as distanceOf,
  toRect as toRectOf,
} from './utils/geometry';
import type { TrackerCollection } from './TrackerCollection';

function normalizeCollision(c: CollisionOptions): CollisionOptions {
  return {
    with: c.with ?? 'tracked',
    mode: c.mode ?? 'overlap',
    padding: typeof c.padding === 'number' ? c.padding : 0,
    refreshFrames:
      typeof c.refreshFrames === 'number' && c.refreshFrames > 0 ? c.refreshFrames : 30,
  };
}

/** Fill in defaults and validate a {@link TrackerOptions} bag. @internal */
export function resolveOptions(input?: TrackerOptions): ResolvedTrackerOptions {
  const collision =
    input?.collision === false
      ? false
      : input?.collision
        ? normalizeCollision(input.collision)
        : false;
  const thresholdInput = input?.viewportThreshold;
  const viewportThreshold = Array.isArray(thresholdInput)
    ? thresholdInput.length
      ? thresholdInput
      : [0, 0.25, 0.5, 0.75, 1]
    : typeof thresholdInput === 'number'
      ? [thresholdInput]
      : [0, 0.25, 0.5, 0.75, 1];
  const frameSkip =
    typeof input?.frameSkip === 'number' && input.frameSkip >= 0
      ? Math.floor(input.frameSkip)
      : 0;
  const precision =
    typeof input?.precision === 'number' && input.precision >= 0 ? input.precision : 0.01;
  return {
    id: input?.id ?? generateId(),
    pollStyle: input?.pollStyle ?? true,
    frameSkip,
    precision,
    collision,
    viewportRoot: input?.viewportRoot ?? null,
    viewportMargin: input?.viewportMargin ?? '0px',
    viewportThreshold,
    resizeBox: input?.resizeBox ?? 'border-box',
    attributeFilter: input?.attributeFilter,
    autoDestroy: input?.autoDestroy ?? true,
    paused: input?.paused ?? false,
  };
}

/** Internal representation of a queued event before its payload is finalized. */
interface PendingEvent {
  type: TrackerEventName;
  extra?: Record<string, unknown>;
}

/**
 * Tracks a single DOM element and emits typed events as its geometry, style,
 * viewport state, scroll, and collision relationships change.
 *
 * Create instances with {@link HTMLTracker.track} (or via a collection from
 * {@link HTMLTracker.trackAll}). Do not call the constructor directly.
 */
export class Tracker {
  /** The tracked DOM element. */
  readonly element: Element;
  /** The stable tracker id. */
  readonly id: string;
  /** Resolved options (read-only). */
  readonly resolvedOptions: ResolvedTrackerOptions;
  /** `true` until {@link stop} is called. */
  active = true;
  /** Set by an owning collection; `undefined` for standalone trackers. @internal */
  _collectionOwner?: TrackerCollection;

  private readonly emitter = new EventEmitter<TrackerEventMap>();
  private readonly observers: TrackerObservers;
  private snapshot: TrackerSnapshot;
  private prev: TrackerSnapshot | null = null;
  private pending: PendingEvent[] = [];
  private paused: boolean;

  // Viewport state shared with observers + measurement.
  private viewport: ViewportState;
  private viewportInitialized = false;
  private resizeInitialized = false;
  private lastResizeW = 0;
  private lastResizeH = 0;
  private everInDOM = false;

  // Collision bookkeeping.
  private readonly selectorCache = new Map<string, Element[]>();
  private currentTrackers = new Set<Tracker>();
  private currentExternals = new Set<Element>();
  private prevTrackers = new Set<Tracker>();
  private prevExternals = new Set<Element>();

  constructor(element: Element, options?: TrackerOptions) {
    this.element = element;
    this.resolvedOptions = resolveOptions(options);
    this.id = this.resolvedOptions.id;
    this.paused = this.resolvedOptions.paused;

    this.viewport = {
      inViewport: false,
      ratio: 0,
      fromIO: typeof IntersectionObserver !== 'undefined',
    };

    // Initial measurement so `state` is valid immediately (no events emitted).
    this.snapshot = measureElement(
      element,
      this.resolvedOptions.pollStyle,
      this.viewport,
      this.id,
    );
    this.everInDOM = this.state.inDOM;
    this.lastResizeW = this.state.width;
    this.lastResizeH = this.state.height;

    this.observers = new TrackerObservers(
      element,
      {
        onResize: () => this.handleResize(),
        onIntersect: (inViewport, ratio) => this.handleIntersect(inViewport, ratio),
        onAttributeMutation: (records) => this.handleAttributeMutation(records),
      },
      this.resolvedOptions,
    );
    this.observers.viewportState = this.viewport;
    this.observers.observe();

    if (!this.paused) engine.registerTracker(this);
  }

  /** The current (immutable) snapshot. */
  get stateSnapshot(): TrackerSnapshot {
    return this.snapshot;
  }
  /** Alias for {@link stateSnapshot}. */
  get state(): TrackerSnapshot {
    return this.snapshot;
  }
  /** `true` while measurements are suspended via {@link pause}. */
  get isPaused(): boolean {
    return this.paused;
  }

  /* ------------------------------------------------------------------ *
   * Public: subscriptions
   * ------------------------------------------------------------------ */

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends TrackerEventName>(
    event: K,
    handler: (payload: TrackerEventMap[K]) => void,
  ): Unsubscribe {
    return this.emitter.on(resolveEventName(event), handler as never);
  }

  /** Subscribe to the next occurrence of an event. */
  once<K extends TrackerEventName>(
    event: K,
    handler: (payload: TrackerEventMap[K]) => void,
  ): Unsubscribe {
    return this.emitter.once(resolveEventName(event), handler as never);
  }

  /** Remove a handler (or all handlers for `event` when omitted). */
  off<K extends TrackerEventName>(
    event: K,
    handler?: (payload: TrackerEventMap[K]) => void,
  ): void {
    this.emitter.off(resolveEventName(event), handler as never | undefined);
  }

  /** Number of handlers registered for `event`. */
  listenerCount<K extends TrackerEventName>(event: K): number {
    return this.emitter.listenerCount(resolveEventName(event));
  }

  /* ------------------------------------------------------------------ *
   * Public: lifecycle
   * ------------------------------------------------------------------ */

  /** Pause measurements (events from observers may still flush). */
  pause(): void {
    this.paused = true;
  }

  /** Resume measurements. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    engine.registerTracker(this);
  }

  /** Live-merge new options into the tracker. */
  update(options: TrackerOptions): void {
    const next = resolveOptions({ ...this.resolvedOptions, ...options, id: this.id });
    const needsReobserve =
      options.viewportRoot !== undefined ||
      options.viewportMargin !== undefined ||
      options.viewportThreshold !== undefined ||
      options.resizeBox !== undefined ||
      options.attributeFilter !== undefined;
    (this.resolvedOptions as ResolvedTrackerOptions) = next;
    this.selectorCache.clear();
    if (needsReobserve) {
      this.observers.disconnect();
      this.observers.observe();
    }
    if (options.paused === true) this.pause();
    if (options.paused === false) this.resume();
  }

  /** Stop tracking, disconnect observers, and emit `destroy`. */
  stop(automatic = false): void {
    if (!this.active) return;
    this.active = false;
    this.observers.disconnect();
    engine.unregisterTracker(this);
    this._collectionOwner?._onMemberDestroyed(this);
    this.queue({ type: 'destroy', extra: { automatic } });
    this._flush();
    this.emitter.clear();
    this.selectorCache.clear();
  }

  /* ------------------------------------------------------------------ *
   * Public: queries
   * ------------------------------------------------------------------ */

  /** Force a fresh measurement and return the new snapshot. */
  measure(): TrackerSnapshot {
    const next = measureElement(
      this.element,
      this.resolvedOptions.pollStyle,
      this.viewport,
      this.id,
    );
    this.prev = this.state;
    this.snapshot = next;
    return next;
  }

  /** Distance from this element to another trackable. */
  distanceTo(other: Trackable): number {
    return distanceOf(this, other);
  }

  /** Angle (degrees) from this element to another trackable. */
  angleTo(other: Trackable): number {
    return angleOf(this, other);
  }

  /** `true` when currently overlapping `other` (any trackable). */
  isCollidingWith(other: Trackable): boolean {
    const r = toRectOf(other);
    const rect: TrackerRect = {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      top: r.y,
      right: r.x + r.width,
      bottom: r.y + r.height,
      left: r.x,
    };
    return testCollision(this.state.rect, rect, 'overlap', 0);
  }

  /* ------------------------------------------------------------------ *
   * Internal: measurement tick (Phase 1)
   * ------------------------------------------------------------------ */

  /** @internal Measure + diff if this frame is not skipped. */
  _tick(frame: number): void {
    if (!this.active || this.paused) return;
    if (
      this.resolvedOptions.frameSkip > 0 &&
      frame % (this.resolvedOptions.frameSkip + 1) !== 0
    ) {
      return;
    }
    const next = measureElement(
      this.element,
      this.resolvedOptions.pollStyle,
      this.viewport,
      this.id,
    );
    const prev = this.state;
    this.prev = prev;
    this.snapshot = next;

    const facets = diffSnapshots(prev, next, this.resolvedOptions.precision);
    this.queueFacetEvents(facets);

    // Viewport events via the rect-poll fallback (when no IntersectionObserver).
    if (
      !this.observers.useIntersection &&
      prev.inViewport !== next.inViewport
    ) {
      this.queue({
        type: next.inViewport ? 'enterViewport' : 'leaveViewport',
        extra: { inViewport: next.inViewport, ratio: next.viewportRatio },
      });
    }

    // Auto-destroy when the element leaves the DOM.
    if (next.inDOM) this.everInDOM = true;
    if (this.everInDOM && !next.inDOM && this.resolvedOptions.autoDestroy) {
      this.stop(true);
    }
  }

  private queueFacetEvents(f: ChangeFacets): void {
    const useResize = this.observers.useResize;
    if (f.move) this.queue({ type: 'move', extra: { dx: f.dx, dy: f.dy } });
    if (f.resize && !useResize)
      this.queue({ type: 'resize', extra: { dw: f.dw, dh: f.dh } });
    if (f.scroll)
      this.queue({ type: 'scroll', extra: { dx: f.dScrollX, dy: f.dScrollY } });
    if (f.rotate)
      this.queue({
        type: 'rotate',
        extra: { dRotation: f.dRotation, rotation: this.state.rotation },
      });
    if (f.scale)
      this.queue({
        type: 'scale',
        extra: {
          dScaleX: f.dScaleX,
          dScaleY: f.dScaleY,
          scaleX: this.state.scaleX,
          scaleY: this.state.scaleY,
        },
      });
    if (f.opacity)
      this.queue({
        type: 'opacityChange',
        extra: { opacity: this.state.opacity, dOpacity: f.dOpacity },
      });
    if (f.visibility)
      this.queue({
        type: 'visibilityChange',
        extra: { visible: this.state.visible, visibility: this.state.visibility },
      });
    const changed = changedFacetList(f);
    if (changed.length) this.queue({ type: 'change', extra: { changed } });
  }

  /* ------------------------------------------------------------------ *
   * Internal: observer hooks (queued, flushed in Phase 3)
   * ------------------------------------------------------------------ */

  private handleResize(): void {
    if (!this.resizeInitialized) {
      this.resizeInitialized = true;
      this.lastResizeW = this.state.width;
      this.lastResizeH = this.state.height;
      return;
    }
    const dw = this.state.width - this.lastResizeW;
    const dh = this.state.height - this.lastResizeH;
    if (
      Math.abs(dw) > this.resolvedOptions.precision ||
      Math.abs(dh) > this.resolvedOptions.precision
    ) {
      this.queue({ type: 'resize', extra: { dw, dh } });
    }
    this.lastResizeW = this.state.width;
    this.lastResizeH = this.state.height;
  }

  private handleIntersect(inViewport: boolean, ratio: number): void {
    const wasIn = this.viewport.inViewport;
    this.viewport = { inViewport, ratio, fromIO: true };
    if (!this.viewportInitialized) {
      this.viewportInitialized = true;
      return;
    }
    if (inViewport !== wasIn) {
      this.queue({
        type: inViewport ? 'enterViewport' : 'leaveViewport',
        extra: { inViewport, ratio },
      });
    }
  }

  private handleAttributeMutation(records: MutationRecord[]): void {
    const attributes = Array.from(
      new Set(records.map((r) => r.attributeName).filter((n): n is string => !!n)),
    );
    if (attributes.length) {
      this.queue({ type: 'attributeChange', extra: { attributes, records } });
    }
  }

  /* ------------------------------------------------------------------ *
   * Internal: collisions (Phase 2)
   * ------------------------------------------------------------------ */

  /** @internal Reset per-frame collision accumulators. */
  _beginCollisionFrame(): void {
    this.currentTrackers = new Set();
    this.currentExternals = new Set();
  }

  /** @internal Record a colliding tracker (filled by the engine / collection). */
  _markColliding(other: Tracker): void {
    this.currentTrackers.add(other);
  }

  /** @internal Resolve external collision targets and test them. */
  _updateExternalCollisions(frame: number): void {
    if (this._collectionOwner || !this.active || this.paused) return;
    const c = this.resolvedOptions.collision;
    if (!c) return;
    const target = c.with;
    if (!target || target === 'tracked') return;
    if (typeof target === 'string' && frame % (c.refreshFrames ?? 30) === 0) {
      this.selectorCache.delete(target);
    }
    const targets = resolveCollisionElements(target, this.selectorCache);
    const mode = c.mode ?? 'overlap';
    const padding = c.padding ?? 0;
    for (const other of targets) {
      if (other === this.element) continue;
      if (testCollision(this.state.rect, externalRect(other), mode, padding)) {
        this.currentExternals.add(other);
      }
    }
  }

  /** @internal Diff current vs previous collisions and queue events. */
  _flushCollisions(): void {
    const c = this.resolvedOptions.collision;
    const mode = c ? c.mode ?? 'overlap' : 'overlap';
    for (const other of this.currentTrackers) {
      if (!this.prevTrackers.has(other)) {
        this.queueCollision(true, other.element, other.id, mode);
      }
    }
    for (const other of this.prevTrackers) {
      if (!this.currentTrackers.has(other)) {
        this.queueCollision(false, other.element, other.id, mode);
      }
    }
    for (const other of this.currentExternals) {
      if (!this.prevExternals.has(other)) {
        this.queueCollision(true, other, null, mode);
      }
    }
    for (const other of this.prevExternals) {
      if (!this.currentExternals.has(other)) {
        this.queueCollision(false, other, null, mode);
      }
    }
    this.prevTrackers = this.currentTrackers;
    this.prevExternals = this.currentExternals;
  }

  private queueCollision(
    start: boolean,
    other: Element,
    otherId: string | null,
    mode: string,
  ): void {
    const rect = unionRect(this.state.rect, externalRect(other));
    this.queue({
      type: start ? 'collisionStart' : 'collisionEnd',
      extra: { other, otherId, rect, mode },
    });
  }

  /* ------------------------------------------------------------------ *
   * Internal: flush (Phase 3)
   * ------------------------------------------------------------------ */

  private queue(event: PendingEvent): void {
    this.pending.push(event);
  }

  /** @internal Emit every queued event. */
  _flush(): void {
    if (this.pending.length === 0) return;
    const events = this.pending;
    this.pending = [];
    for (const event of events) {
      this.emitter.emit(event.type, this.buildPayload(event));
    }
  }

  private buildPayload(event: PendingEvent): TrackerEventMap[TrackerEventName] {
    const base = {
      target: this.element,
      trackerId: this.id,
      timestamp: this.state.timestamp,
      snapshot: this.state,
      previous: this.prev ?? undefined,
    };
    const extra = event.extra ?? {};
    switch (event.type) {
      case 'move':
        return { ...base, dx: extra.dx as number, dy: extra.dy as number } as MoveEvent;
      case 'resize':
        return { ...base, dw: extra.dw as number, dh: extra.dh as number } as ResizeEvent;
      case 'scroll':
        return { ...base, dx: extra.dx as number, dy: extra.dy as number } as ScrollEvent;
      case 'rotate':
        return {
          ...base,
          dRotation: extra.dRotation as number,
          rotation: extra.rotation as number,
        } as RotateEvent;
      case 'scale':
        return {
          ...base,
          dScaleX: extra.dScaleX as number,
          dScaleY: extra.dScaleY as number,
          scaleX: extra.scaleX as number,
          scaleY: extra.scaleY as number,
        } as ScaleEvent;
      case 'opacityChange':
        return {
          ...base,
          opacity: extra.opacity as number,
          dOpacity: extra.dOpacity as number,
        } as OpacityEvent;
      case 'visibilityChange':
        return {
          ...base,
          visible: extra.visible as boolean,
          visibility: extra.visibility as Visibility,
        } as VisibilityEvent;
      case 'enterViewport':
      case 'leaveViewport':
        return {
          ...base,
          inViewport: extra.inViewport as boolean,
          ratio: extra.ratio as number,
        } as ViewportEvent;
      case 'collisionStart':
      case 'collisionEnd':
        return {
          ...base,
          other: extra.other as Element,
          otherId: extra.otherId as string | null,
          rect: extra.rect as TrackerRect,
          mode: extra.mode as string,
        } as CollisionEvent;
      case 'attributeChange':
        return {
          ...base,
          attributes: extra.attributes as string[],
          records: extra.records as MutationRecord[],
        } as AttributeEvent;
      case 'destroy':
        return { ...base, automatic: extra.automatic as boolean } as DestroyEvent;
      case 'change':
        return { ...base, changed: extra.changed as string[] } as ChangeEvent;
      default:
        return base as ChangeEvent;
    }
  }
}
