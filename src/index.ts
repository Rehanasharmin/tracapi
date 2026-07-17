/**
 * HTML Object Tracker API — entry point.
 *
 * Let HTML elements observe, follow, synchronize with, and react to other HTML
 * elements using a tiny, dependency-free, framework-agnostic API.
 *
 * @packageDocumentation
 */

export { HTMLTracker } from './api';
export type { HTMLTrackerAPI } from './api';
export { Tracker } from './Tracker';
export { TrackerCollection } from './TrackerCollection';
export type { TrackerCollectionOptions } from './TrackerCollection';

// Utilities (tree-shakeable named exports).
export {
  distance,
  angle,
  center,
  overlaps,
  contains,
  nearest,
  farthest,
  toPoint,
  toRect,
  area,
  expandRect,
} from './utils/geometry';

// Engine access (advanced).
export { engine } from './core/engine';
export {
  decomposeTransform,
  parseMatrix,
  normalizeDegrees,
} from './core/matrix';
export { VERSION } from './version';

// Public types.
export type {
  Point,
  Rect,
  TrackerRect,
  Visibility,
  TrackerSnapshot,
  ResizeBox,
  CollisionTarget,
  CollisionMode,
  CollisionOptions,
  TrackerOptions,
  ResolvedTrackerOptions,
  ViewportState,
  Trackable,
} from './types';

export type {
  TrackerEvent,
  MoveEvent,
  ResizeEvent,
  ScrollEvent,
  RotateEvent,
  ScaleEvent,
  OpacityEvent,
  VisibilityEvent,
  ViewportEvent,
  CollisionEvent,
  AttributeEvent,
  DestroyEvent,
  ChangeEvent,
  TrackerEventMap,
  TrackerEventName,
  TrackerEventHandler,
  CollectionEventMap,
  CollectionCollisionEvent,
} from './events/eventTypes';

export { HTMLTracker as default } from './api';
