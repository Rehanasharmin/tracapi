# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] — 2026-07-17

### Fixed
- Set the real repository / bugs / homepage URLs (`github.com/Rehanasharmin/tracapi`) — these were placeholder links in `1.0.0`.

### Changed
- Minification moved off `@rollup/plugin-terser` (worker-pool hang on Termux / Android ARM) to an in-process step (`scripts/minify.cjs`).
- npm scripts now call tools through `node ...` directly for cross-platform robustness (fixes `Permission denied` on Termux).

## [1.0.0] — 2026-07-16

### Added
- 🎉 Initial public release.
- `HTMLTracker.track()` / `HTMLTracker.trackAll()` with a shared `requestAnimationFrame` engine.
- Single-tracker `Tracker` with typed events: `move`, `resize`, `scroll`, `rotate`, `scale`,
  `opacityChange`, `visibilityChange`, `enterViewport`, `leaveViewport`, `collisionStart`,
  `collisionEnd` (alias `collision`), `attributeChange`, `destroy`, and the aggregate `change`.
- `TrackerCollection` for batch tracking with member-vs-member collisions, event forwarding,
  `nearestTo` / `farthestFrom`, and `collisions()`.
- Immutable `TrackerSnapshot` covering position, size, center, rect, rotation, scale,
  opacity, visibility, z-index, viewport ratio, scroll offsets, overflow, and DOM state.
- CSS `transform` matrix decomposition (`decomposeTransform`) for rotation/scale.
- Geometry utilities: `distance`, `angle`, `center`, `overlaps`, `contains`, `nearest`,
  `farthest`, `toPoint`, `toRect`, `area`, `expandRect`.
- Collision modes: `overlap` / `intersect`, `contain`, `center`, with optional `padding`.
- Native-observer integration (`IntersectionObserver`, `ResizeObserver`, `MutationObserver`)
  with automatic rect-poll fallbacks.
- Three-phase frame model (READ → COMPUTE → FLUSH) to eliminate layout thrashing.
- Tree-shakeable ESM, CommonJS, and UMD bundles; rolled-up `.d.ts` types.
- Vitest test suite (65 tests) with V8 coverage thresholds.
- Documentation site, getting-started guide, API reference, and performance guide.
- Interactive vanilla example plus React/Vue/Svelte recipes.

### Performance
- ~8 kB min+gzip. One rAF loop for all trackers; batched DOM reads; cached selector targets.

[Unreleased]: https://github.com/Rehanasharmin/tracapi/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Rehanasharmin/tracapi/releases/tag/v1.0.1
[1.0.0]: https://github.com/Rehanasharmin/tracapi/releases/tag/v1.0.0
