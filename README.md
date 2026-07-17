# HTML Object Tracker API

> Effortlessly let HTML elements **observe, follow, synchronize with, and react to** other HTML elements — a tiny, dependency-free, framework-agnostic tracking engine built on native browser APIs.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](https://www.typescriptlang.org/)
[![Zero Deps](https://img.shields.io/badge/dependencies-0-success.svg)](#)
[![Bundle](https://img.shields.io/badge/min%2Bgzip-~8kb-success.svg)](#)

`HTMLTracker` feels like a missing browser feature: declarative where possible, imperative when needed, and engineered to avoid layout thrashing. Track position, size, rotation, scale, opacity, visibility, scroll, viewport intersection, **and collisions** between elements — all from one unified, typed API.

---

## ✨ Features

- **Zero runtime dependencies** — ships as a single module, no CDN required.
- **Framework-agnostic** — vanilla JS, React, Vue, Svelte, Solid, Angular… anything.
- **Tree-shakeable** ESM, plus CommonJS and UMD bundles.
- **First-class TypeScript** — full types, typed events, and generics.
- **High performance** — one shared `requestAnimationFrame` loop, batched read/compute/flush phases, graceful observer usage.
- **Rich signals** — geometry, transform decomposition, scroll, viewport, collisions, attributes, lifecycle.
- **Automatic cleanup** — auto-destroys when elements leave the DOM; no leaks.
- **Tiny** — ~8 kB min+gzip.

---

## 📦 Installation

```bash
npm install tracapi
# or: pnpm add tracapi / yarn add tracapi
```

Or use it without a bundler via the UMD build (`dist/tracapi.umd.js`), which exposes the global `HTMLTracker`.

---

## 🚀 Quick start

```js
import { HTMLTracker } from 'tracapi';

// Track one element
const player = HTMLTracker.track('#player');
player.on('move', ({ dx, dy, snapshot }) => {
  console.log('moved', dx, dy, '→', snapshot.x, snapshot.y);
});

// Track many + collisions
const enemies = HTMLTracker.trackAll('.enemy', { collision: { mode: 'overlap' } });
enemies.on('collisionStart', ({ from, to }) => {
  console.log(`${from.id} hit ${to.id}`);
});
```

### Without a bundler

```html
<script src="./tracapi.umd.js"></script>
<script>
  const tracker = HTMLTracker.track('#player');
  tracker.on('move', (e) => console.log(e.dx, e.dy));
</script>
```

---

## 🧭 Core concepts

| Concept | What it does |
| --- | --- |
| `HTMLTracker.track(target, opts)` | Track **one** element → returns a `Tracker`. |
| `HTMLTracker.trackAll(target, opts)` | Track **many** elements → returns a `TrackerCollection` (owns member-vs-member collisions + event forwarding). |
| `Tracker` | One element: subscribe to events, read `state`, query geometry. |
| `TrackerCollection` | Many elements: group events, pairwise collisions, `nearestTo`/`farthestFrom`. |
| **Engine** | A single shared rAF loop that serves every active tracker in 3 phases: **READ → COMPUTE → FLUSH**. |

---

## 🎛️ Options

```ts
HTMLTracker.track('#el', {
  pollStyle: true,          // measure transform/opacity/visibility/z-index each frame
  frameSkip: 0,             // skip N frames between measurements (0 = every frame)
  precision: 0.01,          // epsilon for change detection
  collision: {              // collide this tracker against a target set
    with: '.enemy',         // selector | element[] | () => elements | 'tracked'
    mode: 'overlap',        // 'overlap' | 'contain' | 'center' | 'intersect'
    padding: 0,             // expand both rects before testing (px)
  },
  viewportMargin: '0px',    // IntersectionObserver rootMargin
  viewportThreshold: [0, 0.5, 1],
  resizeBox: 'border-box',  // 'content-box' | 'border-box' | 'device-pixel-content-box'
  attributeFilter: ['data-state'], // limit attributeChange to these attrs
  autoDestroy: true,        // stop when the element leaves the DOM
  paused: false,            // start paused
});
```

---

## 📡 Events

Every event payload extends a common base:

```ts
interface TrackerEvent {
  target: Element;       // the tracked element
  trackerId: string;
  timestamp: number;     // performance.now()
  snapshot: TrackerSnapshot;   // state after the change
  previous?: TrackerSnapshot;  // state before the change
}
```

| Event | Fires when… | Extra fields |
| --- | --- | --- |
| `move` | x/y change | `dx`, `dy` |
| `resize` | width/height change | `dw`, `dh` |
| `scroll` | own scroll offset changes | `dx`, `dy` |
| `rotate` | transform rotation changes | `dRotation`, `rotation` |
| `scale` | transform scale changes | `dScaleX`, `dScaleY`, `scaleX`, `scaleY` |
| `opacityChange` | opacity changes | `opacity`, `dOpacity` |
| `visibilityChange` | effective visibility changes | `visible`, `visibility` |
| `enterViewport` | enters the viewport | `inViewport`, `ratio` |
| `leaveViewport` | leaves the viewport | `inViewport`, `ratio` |
| `collisionStart` / `collision` | begins overlapping another | `other`, `otherId`, `rect`, `mode` |
| `collisionEnd` | stops overlapping another | `other`, `otherId`, `rect`, `mode` |
| `attributeChange` | a watched attribute mutates | `attributes`, `records` |
| `destroy` | the tracker stops | `automatic` |
| `change` | any of the above | `changed` (list of facets) |

> `collision` is an alias for `collisionStart`.

```js
tracker.on('move', (e) => {});
tracker.once('resize', (e) => {});
const off = tracker.on('scroll', (e) => {});
off();                       // unsubscribe
tracker.off('move');         // remove all move handlers
```

---

## 📐 The snapshot

`tracker.state` is an immutable snapshot of everything the engine knows:

```ts
interface TrackerSnapshot {
  id, x, y, width, height, centerX, centerY, rect,
  rotation, scale, scaleX, scaleY,
  opacity, visible, visibility, zIndex,
  inViewport, viewportRatio,
  scrollX, scrollY, scrollWidth, scrollHeight, hasOverflow,
  inDOM, timestamp,
}
```

---

## 🧮 Utilities

Framework-agnostic helpers that accept elements, trackers, points, or rects:

```js
HTMLTracker.distance(a, b);     // Euclidean distance between centers
HTMLTracker.angle(a, b);        // degrees, 0 = +X, clockwise
HTMLTracker.center(el);         // { x, y }
HTMLTracker.overlaps(a, b);     // AABB overlap
HTMLTracker.contains(outer, inner);
HTMLTracker.nearest(from, '.dot');   // nearest element matching selector
HTMLTracker.farthest(from, '.dot');
```

---

## ⚡ Performance model

The engine never lets one handler's DOM write trigger a reflow that poisons the next tracker's read. Each frame is split into three strict phases:

1. **READ** — measure every tracker (`getBoundingClientRect` + computed style). No writes.
2. **COMPUTE** — resolve collisions. Still read-only.
3. **FLUSH** — dispatch all queued events. Handlers are free to mutate the DOM here.

Other tactics:

- A **single** rAF loop for the whole page (not one per tracker).
- **`IntersectionObserver`** drives viewport events; **`ResizeObserver`** drives resize; **`MutationObserver`** drives `attributeChange`. Each degrades to a rect-poll fallback when unavailable.
- Selector-based collision targets are **cached** and re-resolved on a configurable cadence.
- `frameSkip`, `pollStyle: false`, and `paused` let you trade latency for throughput on large sets.

See [docs/PERFORMANCE.md](./docs/PERFORMANCE.md) for benchmarks and tuning recipes.

---

## 🧩 Framework recipes

<details>
<summary><strong>React (hook)</strong></summary>

```tsx
import { useEffect, useRef } from 'react';
import { HTMLTracker, type Tracker } from 'tracapi';

function useTracker(selector: string) {
  const ref = useRef<Tracker | null>(null);
  useEffect(() => {
    const t = HTMLTracker.track(selector);
    ref.current = t;
    return () => t.stop(); // automatic cleanup
  }, [selector]);
  return ref;
}
```

</details>

<details>
<summary><strong>Vue 3 (composable)</strong></summary>

```ts
import { onMounted, onUnmounted } from 'vue';
import { HTMLTracker } from 'tracapi';

export function useTrack(selector: string) {
  let tracker;
  onMounted(() => (tracker = HTMLTracker.track(selector)));
  onUnmounted(() => tracker?.stop());
}
```

</details>

<details>
<summary><strong>Svelte (action)</strong></summary>

```svelte
<script>
  import { HTMLTracker } from 'tracapi';
  function track(node) {
    const t = HTMLTracker.track(node);
    t.on('move', (e) => (coords = `${e.snapshot.x}, ${e.snapshot.y}`));
    return { destroy: () => t.stop() };
  }
  let coords = '';
</script>
<div use:track></div>
```

</details>

---

## 🌐 Browser support

Evergreen browsers (Chrome/Edge/Firefox/Safari). The library feature-detects `IntersectionObserver`, `ResizeObserver`, `MutationObserver`, and `requestAnimationFrame`, falling back gracefully — so it also runs in jsdom, SSR, and minimal DOMs without throwing.

---

## 📚 More

- [Getting Started Guide](./docs/GUIDE.md)
- [API Reference](./docs/API.md)
- [Performance & Tuning](./docs/PERFORMANCE.md)
- [Examples](./examples)
- [Changelog](./CHANGELOG.md)

---

## 📄 License

MIT © HTML Object Tracker Contributors.
