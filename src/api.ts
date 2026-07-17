import { Tracker, resolveOptions } from './Tracker';
import { TrackerCollection } from './TrackerCollection';
import { engine } from './core/engine';
import { resolveElement, resolveAll } from './utils/dom';
import {
  angle,
  center,
  contains,
  distance,
  farthest,
  nearest,
  overlaps,
} from './utils/geometry';
import { VERSION } from './version';
import type { TrackerOptions, Trackable } from './types';
import type { TrackerCollectionOptions } from './TrackerCollection';

/**
 * The HTML Object Tracker API.
 *
 * A tiny, framework-agnostic surface for letting DOM elements observe, follow,
 * and react to other DOM elements.
 *
 * @example
 * ```js
 * import { HTMLTracker } from 'tracapi';
 *
 * const player = HTMLTracker.track('#player');
 * player.on('move', ({ dx, dy }) => console.log('moved', dx, dy));
 *
 * const enemies = HTMLTracker.trackAll('.enemy', { collision: {} });
 * enemies.on('collisionStart', ({ from, to }) => console.log('hit!', from.id, to.id));
 * ```
 */
export const HTMLTracker = {
  /** Semantic version string. */
  get version(): string {
    return VERSION;
  },

  /* -------------------------------------------------------------- *
   * Tracking
   * -------------------------------------------------------------- */

  /**
   * Track a single element.
   *
   * @param target A CSS selector or an element.
   * @throws when a selector matches nothing.
   */
  track(target: string | Element, options?: TrackerOptions): Tracker {
    const el = resolveElement(target);
    if (!el) {
      throw new Error(
        `[tracapi] track: no element found for "${String(target)}".`,
      );
    }
    return new Tracker(el, options);
  },

  /**
   * Track many elements at once. Returns a {@link TrackerCollection} that owns
   * member-vs-member collisions and forwards per-member events.
   *
   * @param target A CSS selector, an element, an array/NodeList of elements.
   */
  trackAll(
    target: string | Element | Element[] | NodeList | ArrayLike<Element>,
    options?: TrackerCollectionOptions,
  ): TrackerCollection {
    const elements =
      typeof target === 'string' || target instanceof Element
        ? resolveAll(target)
        : Array.from(target as ArrayLike<Element>);
    return new TrackerCollection(elements, options);
  },

  /* -------------------------------------------------------------- *
   * Geometry utilities (framework-agnostic, zero DOM writes)
   * -------------------------------------------------------------- */

  /** Euclidean distance between the centers of two trackables. */
  distance(a: Trackable, b: Trackable): number {
    return distance(a, b);
  },

  /** Angle in degrees from `a` to `b`. */
  angle(a: Trackable, b: Trackable): number {
    return angle(a, b);
  },

  /** Geometric center of a trackable. */
  center(target: Trackable): { x: number; y: number } {
    return center(target);
  },

  /** `true` when the two trackables share at least one pixel. */
  overlaps(a: Trackable, b: Trackable): boolean {
    return overlaps(a, b);
  },

  /** `true` when `outer` fully encloses `inner`. */
  contains(outer: Trackable, inner: Trackable): boolean {
    return contains(outer, inner);
  },

  /** Nearest element matching `selector`, relative to `from`. */
  nearest(from: Trackable, selector: string): Element | null {
    return nearest(from, selector);
  },

  /** Farthest element matching `selector`, relative to `from`. */
  farthest(from: Trackable, selector: string): Element | null {
    return farthest(from, selector);
  },

  /* -------------------------------------------------------------- *
   * Engine control
   * -------------------------------------------------------------- */

  /** Pause the global rAF loop (all trackers suspend measurement). */
  pause(): void {
    engine.pause();
  },

  /** Resume the global rAF loop. */
  resume(): void {
    engine.resume();
  },

  /** `true` while the global loop is paused. */
  isPaused(): boolean {
    return engine.isPaused;
  },

  /** Number of currently active trackers. */
  get size(): number {
    return engine.size;
  },

  /**
   * Validate and normalize a options bag without creating a tracker. Handy for
   * debugging configuration or building wrappers.
   */
  normalizeOptions(options?: TrackerOptions) {
    return resolveOptions(options);
  },
} as const;

export type HTMLTrackerAPI = typeof HTMLTracker;
