/**
 * Browser/global entry point.
 *
 * Flattens the API so that a single global (`window.HTMLTracker`) exposes the
 * high-level namespace (`track`, `trackAll`, `distance`, …) together with the
 * exported classes/utilities (`Tracker`, `TrackerCollection`, `VERSION`, …).
 * Used by the UMD build loaded via a plain `<script>` tag.
 *
 * (The internal `engine` singleton is intentionally omitted from the flattened
 * global — it isn't part of the public browser API and exposes private state.)
 */
import { HTMLTracker } from './api';
import {
  Tracker,
  TrackerCollection,
  VERSION,
  // geometry utilities
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
  // transform helpers
  decomposeTransform,
  parseMatrix,
  normalizeDegrees,
} from './index';

Object.assign(HTMLTracker, {
  Tracker,
  TrackerCollection,
  VERSION,
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
  decomposeTransform,
  parseMatrix,
  normalizeDegrees,
});

export default HTMLTracker;
