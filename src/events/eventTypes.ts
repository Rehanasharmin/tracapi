import type {
  TrackerRect,
  TrackerSnapshot,
  Visibility,
} from '../types';

/** Common metadata attached to every event. */
export interface TrackerEvent {
  /** The DOM element being tracked. */
  readonly target: Element;
  /** The tracker id. */
  readonly trackerId: string;
  /** `performance.now()` at the time of the change. */
  readonly timestamp: number;
  /** The snapshot after the change. */
  readonly snapshot: TrackerSnapshot;
  /** The previous snapshot (omitted on the very first measurement). */
  readonly previous?: TrackerSnapshot;
}

export interface MoveEvent extends TrackerEvent {
  /** Delta X in pixels. */
  readonly dx: number;
  /** Delta Y in pixels. */
  readonly dy: number;
}

export interface ResizeEvent extends TrackerEvent {
  /** Width delta in pixels. */
  readonly dw: number;
  /** Height delta in pixels. */
  readonly dh: number;
}

export interface ScrollEvent extends TrackerEvent {
  readonly dx: number;
  readonly dy: number;
}

export interface RotateEvent extends TrackerEvent {
  /** Rotation delta in degrees. */
  readonly dRotation: number;
  readonly rotation: number;
}

export interface ScaleEvent extends TrackerEvent {
  readonly dScaleX: number;
  readonly dScaleY: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface OpacityEvent extends TrackerEvent {
  readonly opacity: number;
  readonly dOpacity: number;
}

export interface VisibilityEvent extends TrackerEvent {
  readonly visible: boolean;
  readonly visibility: Visibility;
}

export interface ViewportEvent extends TrackerEvent {
  readonly inViewport: boolean;
  readonly ratio: number;
}

export interface CollisionEvent extends TrackerEvent {
  /** The other element now/again overlapping. */
  readonly other: Element;
  /** The other element's tracker id (when tracked), else `null`. */
  readonly otherId: string | null;
  /** The strategy that matched. */
  readonly mode: string;
  /** The (possibly padded) union rectangle of the pair. */
  readonly rect: TrackerRect;
}

export interface AttributeEvent extends TrackerEvent {
  /** Attribute names that changed. */
  readonly attributes: readonly string[];
  /** Records straight from MutationObserver. */
  readonly records: ReadonlyArray<MutationRecord>;
}

export interface DestroyEvent extends TrackerEvent {
  /** `true` for automatic DOM removal, `false` for an explicit `stop()`. */
  readonly automatic: boolean;
}

export interface ChangeEvent extends TrackerEvent {
  /** Every facet that changed during this frame. */
  readonly changed: readonly string[];
}

/**
 * The full typed event map for a {@link Tracker}.
 *
 * Aliases: `"collision"` is equivalent to `"collisionStart"`.
 */
export interface TrackerEventMap {
  move: MoveEvent;
  resize: ResizeEvent;
  scroll: ScrollEvent;
  rotate: RotateEvent;
  scale: ScaleEvent;
  opacityChange: OpacityEvent;
  visibilityChange: VisibilityEvent;
  enterViewport: ViewportEvent;
  leaveViewport: ViewportEvent;
  collisionStart: CollisionEvent;
  collisionEnd: CollisionEvent;
  /** Alias for `collisionStart`. */
  collision: CollisionEvent;
  attributeChange: AttributeEvent;
  destroy: DestroyEvent;
  change: ChangeEvent;
}

export type TrackerEventName = keyof TrackerEventMap;
export type TrackerEventHandler<K extends TrackerEventName> = (
  payload: TrackerEventMap[K],
) => void;

/** Event map for collections (forwarded per-member + group-level collisions). */
export interface CollectionEventMap {
  move: MoveEvent;
  resize: ResizeEvent;
  scroll: ScrollEvent;
  rotate: RotateEvent;
  scale: ScaleEvent;
  opacityChange: OpacityEvent;
  visibilityChange: VisibilityEvent;
  enterViewport: ViewportEvent;
  leaveViewport: ViewportEvent;
  collisionStart: CollectionCollisionEvent;
  collisionEnd: CollectionCollisionEvent;
  collision: CollectionCollisionEvent;
  attributeChange: AttributeEvent;
  destroy: DestroyEvent;
  change: ChangeEvent;
}

export interface CollectionCollisionEvent {
  readonly timestamp: number;
  readonly from: import('../Tracker').Tracker;
  readonly to: import('../Tracker').Tracker;
  readonly rect: TrackerRect;
  readonly mode: string;
}

export type CollectionEventHandler<K extends keyof CollectionEventMap> = (
  payload: CollectionEventMap[K],
) => void;

/** Resolve `"collision"` → `"collisionStart"`. @internal */
export function resolveEventName(name: string): TrackerEventName {
  if (name === 'collision') return 'collisionStart';
  return name as TrackerEventName;
}
