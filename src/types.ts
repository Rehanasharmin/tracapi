/**
 * Core public types for the HTML Object Tracker API.
 *
 * @packageDocumentation
 */

/** A 2D point. */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned rectangle. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A measured rectangle including the four edges. */
export interface TrackerRect extends Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Granular reason an element may be considered non-visible. */
export type Visibility =
  | 'visible'
  | 'hidden'
  | 'collapse'
  | 'display-none'
  | 'zero-size';

/** A frozen snapshot of everything the engine knows about an element at an instant. */
export interface TrackerSnapshot {
  /** The tracker id (matches `Tracker.id`). */
  readonly id: string;
  /** Viewport-relative left edge (rect.x). */
  readonly x: number;
  /** Viewport-relative top edge (rect.y). */
  readonly y: number;
  /** Layout width. */
  readonly width: number;
  /** Layout height. */
  readonly height: number;
  /** Geometric center X. */
  readonly centerX: number;
  /** Geometric center Y. */
  readonly centerY: number;
  /** Full measured rectangle. */
  readonly rect: TrackerRect;
  /** Rotation in degrees extracted from the CSS `transform` matrix. */
  readonly rotation: number;
  /** Uniform scale (geometric mean of `scaleX`/`scaleY`). */
  readonly scale: number;
  /** Horizontal scale from the CSS `transform` matrix. */
  readonly scaleX: number;
  /** Vertical scale from the CSS `transform` matrix. */
  readonly scaleY: number;
  /** Computed `opacity` (0–1). */
  readonly opacity: number;
  /** `true` when the element is effectively visible (see {@link Visibility}). */
  readonly visible: boolean;
  /** Granular visibility classification. */
  readonly visibility: Visibility;
  /** Computed `z-index` (0 when `auto`). */
  readonly zIndex: number;
  /** `true` when at least one pixel intersects the viewport. */
  readonly inViewport: boolean;
  /** Fraction (0–1) of the element currently within the viewport. */
  readonly viewportRatio: number;
  /** Horizontal scroll offset of the element's own scrollport. */
  readonly scrollX: number;
  /** Vertical scroll offset of the element's own scrollport. */
  readonly scrollY: number;
  /** Full scrollable content width. */
  readonly scrollWidth: number;
  /** Full scrollable content height. */
  readonly scrollHeight: number;
  /** `true` when content overflows the element's client box. */
  readonly hasOverflow: boolean;
  /** `true` while the element is still attached to the document. */
  readonly inDOM: boolean;
  /** `performance.now()` captured at measurement time. */
  readonly timestamp: number;
}

/** The set of CSS box models {@link ResizeObserver} can report. */
export type ResizeBox =
  | 'content-box'
  | 'border-box'
  | 'device-pixel-content-box';

/** What a tracker should collide against. */
export type CollisionTarget =
  | 'tracked'
  | string
  | Element
  | Element[]
  | ReadonlyArray<Element>
  | NodeList
  | (() => CollisionTarget | null | undefined);

/** Collision detection strategy. */
export type CollisionMode = 'overlap' | 'contain' | 'center' | 'intersect';

/** Options for collision tracking. */
export interface CollisionOptions {
  /**
   * What to collide against:
   * - a CSS selector (`'.enemy'`)
   * - an element / array of elements / NodeList
   * - a function returning any of the above (re-evaluated each frame)
   * - `'tracked'` to collide with every other tracker in the engine
   *
   * Ignored for trackers that belong to a {@link TrackerCollection} (the
   * collection owns member-vs-member collisions).
   */
  with?: CollisionTarget;
  /** Detection strategy. Defaults to `'overlap'`. */
  mode?: CollisionMode;
  /** Pixels of padding applied to both rects before testing. Defaults to `0`. */
  padding?: number;
  /** Re-resolve selector/function targets every N frames. Defaults to `30`. */
  refreshFrames?: number;
}

/** Per-tracker configuration. All options are optional. */
export interface TrackerOptions {
  /** Stable id override. Auto-generated when omitted. */
  id?: string;
  /**
   * Poll computed style (`transform`, `opacity`, `visibility`, `z-index`)
   * every frame. Disable for maximum throughput on large sets. Defaults to
   * `true`.
   */
  pollStyle?: boolean;
  /** Skip N animation frames between measurements (0 = every frame). Defaults to `0`. */
  frameSkip?: number;
  /** Epsilon for floating-point change detection. Defaults to `0.01`. */
  precision?: number;
  /** Collision configuration. Set to `false` to disable. */
  collision?: CollisionOptions | false;
  /** IntersectionObserver root (`null` = browser viewport). */
  viewportRoot?: Element | Document | null;
  /** IntersectionObserver `rootMargin`. Defaults to `'0px'`. */
  viewportMargin?: string;
  /** IntersectionObserver `threshold`(s). Defaults to `[0, 0.25, 0.5, 0.75, 1]`. */
  viewportThreshold?: number | number[];
  /** Box model observed for the `resize` event. Defaults to `'border-box'`. */
  resizeBox?: ResizeBox;
  /** Attribute names that trigger `attributeChange` (defaults to all). */
  attributeFilter?: string[];
  /** Auto-stop the tracker when the element leaves the DOM. Defaults to `true`. */
  autoDestroy?: boolean;
  /** Start in a paused state. Defaults to `false`. */
  paused?: boolean;
}

/** Resolved (filled-in) options used internally. */
export interface ResolvedTrackerOptions {
  id: string;
  pollStyle: boolean;
  frameSkip: number;
  precision: number;
  collision: CollisionOptions | false;
  viewportRoot: Element | Document | null;
  viewportMargin: string;
  viewportThreshold: number[];
  resizeBox: ResizeBox;
  attributeFilter: string[] | undefined;
  autoDestroy: boolean;
  paused: boolean;
}

/** Live viewport state fed in from IntersectionObserver (or the rect fallback). */
export interface ViewportState {
  inViewport: boolean;
  ratio: number;
  fromIO: boolean;
}

/**
 * Anything the geometry helpers can reason about: an element, a tracker, a
 * point, or a rectangle.
 */
export type Trackable = Element | { state: TrackerSnapshot } | Point | Rect;
