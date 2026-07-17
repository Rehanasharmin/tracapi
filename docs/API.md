# API Reference

Complete reference for the HTML Object Tracker API (`v1.0.0`).

## Table of contents

- [Namespace: `HTMLTracker`](#namespace-htmltracker)
- [`Tracker`](#tracker)
- [`TrackerCollection`](#trackercollection)
- [Options](#options)
- [Events](#events)
- [Snapshot](#snapshot)
- [Geometry utilities](#geometry-utilities)
- [Internals](#internals)

---

## Namespace: `HTMLTracker`

Import as a named export or use the default:

```ts
import { HTMLTracker } from 'tracapi';
import HTMLTracker from 'tracapi';
```

### `HTMLTracker.version`
`string` — semantic version.

### `HTMLTracker.track(target, options?): Tracker`
Track a single element.
- `target: string | Element` — selector or element. Throws if a selector matches nothing.

### `HTMLTracker.trackAll(target, options?): TrackerCollection`
Track many elements.
- `target: string | Element | Element[] | NodeList | ArrayLike<Element>`

### `HTMLTracker.size`
`number` — number of active trackers in the engine.

### `HTMLTracker.pause()` / `HTMLTracker.resume()` / `HTMLTracker.isPaused()`
Pause/resume the global measurement loop.

### `HTMLTracker.normalizeOptions(options?)`
Returns the fully-resolved options (handy for debugging/wrappers).

---

## `Tracker`

Returned by `track()`. Also the member type of a collection.

### Properties
| | |
| --- | --- |
| `element: Element` | The tracked element. |
| `id: string` | Stable id. |
| `state: TrackerSnapshot` | Current immutable snapshot. |
| `resolvedOptions: ResolvedTrackerOptions` | Effective options. |
| `active: boolean` | `true` until `stop()`. |
| `isPaused: boolean` | Per-tracker pause state. |

### Subscriptions
```ts
on<K>(event: K, handler: (payload: TrackerEventMap[K]) => void): Unsubscribe;
once<K>(event: K, handler): Unsubscribe;
off<K>(event: K, handler?): void;
listenerCount<K>(event: K): number;
```
`Unsubscribe` is `() => void`.

### Lifecycle
- `pause()` / `resume()` — suspend/resume this tracker only.
- `update(options)` — live-merge options (re-observes if observer-affecting keys change).
- `stop(automatic = false)` — disconnect, unregister, emit `destroy`.
- `measure(): TrackerSnapshot` — force a synchronous fresh measurement.

### Queries
- `distanceTo(other: Trackable): number`
- `angleTo(other: Trackable): number`
- `isCollidingWith(other: Trackable): boolean`

---

## `TrackerCollection`

Returned by `trackAll()`.

### Properties
- `trackers: readonly Tracker[]` — live member list.
- `size: number`

### Events
Same subscription API as `Tracker`, plus collection-level collision events whose
payload is `{ timestamp, from: Tracker, to: Tracker, rect, mode }`:
`collisionStart`, `collision`, `collisionEnd`. All member events (`move`,
`resize`, …) are forwarded onto the collection unless `forwardEvents: false`.

### Membership
- `add(target, options?): Tracker`
- `remove(trackerOrId): boolean`
- `each(fn)`, `get(id): Tracker | undefined`

### Queries
- `collisions(): ReadonlyArray<readonly [Tracker, Tracker]>` — currently-colliding pairs.
- `nearestTo(target): Tracker | undefined`
- `farthestFrom(target): Tracker | undefined`
- `snapshots(): TrackerSnapshot[]`

### Lifecycle
- `stopAll()` / `dispose()` — stop every member and the collection.

---

## Options

### `TrackerOptions`
| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` | auto | Stable id override. |
| `pollStyle` | `boolean` | `true` | Poll transform/opacity/visibility/z-index. |
| `frameSkip` | `number` | `0` | Skip N frames between measurements. |
| `precision` | `number` | `0.01` | Change-detection epsilon. |
| `collision` | `CollisionOptions \| false` | `false` | Collision config. |
| `viewportRoot` | `Element \| Document \| null` | `null` | IO root. |
| `viewportMargin` | `string` | `'0px'` | IO rootMargin. |
| `viewportThreshold` | `number \| number[]` | `[0,.25,.5,.75,1]` | IO thresholds. |
| `resizeBox` | `ResizeBox` | `'border-box'` | RO box model. |
| `attributeFilter` | `string[]` | all | Limit `attributeChange`. |
| `autoDestroy` | `boolean` | `true` | Stop when leaving the DOM. |
| `paused` | `boolean` | `false` | Start paused. |

### `CollisionOptions`
| | | |
| --- | --- | --- |
| `with` | `CollisionTarget` | `'tracked'` (members) |
| `mode` | `'overlap' \| 'contain' \| 'center' \| 'intersect'` | `'overlap'` |
| `padding` | `number` | `0` |
| `refreshFrames` | `number` | `30` |

`CollisionTarget = 'tracked' | string | Element | Element[] | NodeList | (() => CollisionTarget)`.

### `TrackerCollectionOptions`
Extends `TrackerOptions` with `collision?: CollisionOptions | false` (default
overlap among members) and `forwardEvents?: boolean` (default `true`).

---

## Events

Common base:

```ts
interface TrackerEvent {
  target: Element;
  trackerId: string;
  timestamp: number;
  snapshot: TrackerSnapshot;
  previous?: TrackerSnapshot;
}
```

| Event | Extra payload fields |
| --- | --- |
| `move` | `dx`, `dy` |
| `resize` | `dw`, `dh` |
| `scroll` | `dx`, `dy` |
| `rotate` | `dRotation`, `rotation` |
| `scale` | `dScaleX`, `dScaleY`, `scaleX`, `scaleY` |
| `opacityChange` | `opacity`, `dOpacity` |
| `visibilityChange` | `visible`, `visibility` |
| `enterViewport` / `leaveViewport` | `inViewport`, `ratio` |
| `collisionStart` / `collision` / `collisionEnd` | `other`, `otherId`, `rect`, `mode` |
| `attributeChange` | `attributes`, `records` |
| `destroy` | `automatic` |
| `change` | `changed: string[]` |

`Visibility = 'visible' | 'hidden' | 'collapse' | 'display-none' | 'zero-size'`.

---

## Snapshot

```ts
interface TrackerSnapshot {
  id: string;
  x: number; y: number; width: number; height: number;
  centerX: number; centerY: number;
  rect: TrackerRect;                 // { x, y, width, height, top, right, bottom, left }
  rotation: number;                  // degrees
  scale: number; scaleX: number; scaleY: number;
  opacity: number;
  visible: boolean; visibility: Visibility;
  zIndex: number;
  inViewport: boolean; viewportRatio: number;
  scrollX: number; scrollY: number;
  scrollWidth: number; scrollHeight: number; hasOverflow: boolean;
  inDOM: boolean; timestamp: number;
}
```

---

## Geometry utilities

All accept the `Trackable` union (`Element | Tracker | Point | Rect`).

| Function | Returns |
| --- | --- |
| `distance(a, b)` | `number` — centers |
| `angle(a, b)` | `number` — degrees |
| `center(t)` | `{ x, y }` |
| `overlaps(a, b)` | `boolean` |
| `contains(outer, inner)` | `boolean` |
| `nearest(from, selector)` | `Element \| null` |
| `farthest(from, selector)` | `Element \| null` |
| `toPoint(t)` / `toRect(t)` | normalized point/rect |
| `area(t)` | `number` |
| `expandRect(rect, padding)` | `Rect` |

Also exported for advanced use: `decomposeTransform`, `parseMatrix`,
`normalizeDegrees`, and the singleton `engine`.

---

## Internals

- **`engine`** — the shared loop. `engine.pause/resume/isPaused/size`. Rarely
  needed directly; prefer the `HTMLTracker.*` helpers.
- **Phase model** — `READ` (measure) → `COMPUTE` (collisions) → `FLUSH` (emit).
- **Fallbacks** — when `IntersectionObserver`/`ResizeObserver` are unavailable,
  viewport and resize are derived from the rect poll; everything still works.
