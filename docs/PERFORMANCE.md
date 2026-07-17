# Performance & Tuning

The HTML Object Tracker API is engineered to be cheap enough to run on every
element of a typical page. This page explains *why* it's fast and how to tune it
for demanding workloads.

## Why it avoids layout thrashing

The classic trap: read an element's position (forces layout), then write to the
DOM (invalidates layout), then read the next element (forces layout *again*).
That's O(n) forced layouts per frame — the main cause of jank in tracking code.

The engine sidesteps this with a **three-phase frame**:

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1  READ     measure every tracker  (DOM reads only)   │
│ Phase 2  COMPUTE  resolve collisions     (still read-only)  │
│ Phase 3  FLUSH    dispatch all events    (DOM writes here)  │
└─────────────────────────────────────────────────────────────┘
```

Because no handler writes during phases 1–2, the browser only recalculates
layout once, in phase 3. All `n` reads are batched into a single layout pass.

## One loop to rule them all

A single `requestAnimationFrame` callback drives **every** active tracker and
collection. There is never one timer per element.

## Native observers where they pay off

| Concern | Primary API | Fallback |
| --- | --- | --- |
| Viewport entry/exit | `IntersectionObserver` | rect ∩ viewport |
| Size changes | `ResizeObserver` | rect width/height diff |
| Attribute mutations | `MutationObserver` | — |

Observers fire asynchronously and at native speed; the rAF poll remains the
source of truth for position (which observers can't cheaply detect for CSS
animations, scroll, or layout shifts).

## Selector-based collisions are cached

`collision: { with: '.enemy' }` resolves the selector once and caches the
result, re-querying every `refreshFrames` (default 30 ≈ 0.5 s). Use a function
target (`with: () => myElements`) when you already maintain the list.

## Tuning knobs

| Knob | Effect | When to use |
| --- | --- | --- |
| `pollStyle: false` | Stops reading computed transform/opacity/visibility/z-index | You only need position/size; large sets |
| `frameSkip: n` | Measures every `n+1`-th frame | Background/non-critical trackers |
| `paused: true` | Suspends a tracker | Off-screen / inactive UI |
| `precision: n` | Ignores sub-`n`px jitter | Noisy/animated layouts |
| `forwardEvents: false` | Skip collection event forwarding | You query collections imperatively |
| `HTMLTracker.pause()` | Freeze the whole engine | Tab hidden, modal open |

## Benchmark

`benchmarks/benchmark.js` measures raw engine throughput — every element moves
every frame and fires a `move` event (the worst case for all three phases).

Measured headless (jsdom, Node 20; `pollStyle: false`):

| Trackers | Per-frame cost | Effective frames/sec |
| ---: | ---: | ---: |
| 100 | 0.45 ms | 2247 |
| 500 | 2.39 ms | 419 |
| 1,000 | 5.43 ms | 184 |
| 3,000 | 20.21 ms | 50 |
| 5,000 | 40.61 ms | 25 |

> These are **jsdom** numbers, dominated by per-element JS/dispatch overhead
> (jsdom has no real layout). In a real browser the cost per element is lower
> because native `getBoundingClientRect` reads are batched into a single layout
> pass. The scaling stays linear — double the elements ≈ double the time.

Run it yourself:

```bash
npm run benchmark   # node + jsdom headless throughput test
```

The browser version (`benchmarks/index.html`) renders a live FPS counter while
you drag a slider to change the element count.

## Do I need to clean up?

Auto-destroy (`autoDestroy: true`, the default) stops a tracker when its element
leaves the DOM. In frameworks, call `tracker.stop()` in the unmount hook to be
explicit. Stopping a tracker unregisters it from the loop; when no trackers
remain, the rAF loop cancels itself.
