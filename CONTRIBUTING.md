# Contributing

Thanks for your interest in improving **HTML Object Tracker**! This is a small,
focused library and we want to keep it dependency-free, fast, and well-typed.

## Setup

```bash
git clone <repo> && cd tracapi
npm install
```

## Common tasks

```bash
npm run check         # tsc --noEmit (type-check everything)
npm test              # run the vitest suite
npm run test:coverage # with V8 coverage + thresholds
npm run build         # rollup → ESM/CJS/UMD + types into ./dist
npm run dev           # vite dev server for examples/vanilla
```

## Project layout

```
src/
  index.ts            public entry (re-exports)
  api.ts              the HTMLTracker namespace
  Tracker.ts          single-element tracker + options resolution
  TrackerCollection.ts trackAll, group collisions, event forwarding
  core/
    engine.ts         shared rAF loop (READ → COMPUTE → FLUSH)
    snapshot.ts       measurement + change detection
    observers.ts      IntersectionObserver/ResizeObserver/MutationObserver wrappers
    collision.ts      AABB testing + target resolution
    matrix.ts         transform matrix decomposition
  events/             typed EventEmitter + event payload types
  utils/              geometry, DOM, id helpers
tests/                vitest specs + harness
```

## Guidelines

1. **No runtime dependencies.** Dev dependencies only.
2. **Never read and write the DOM in the same phase.** Measurement (`READ`) and
   event dispatch (`FLUSH`) are strictly separated to avoid layout thrash.
3. **Feature-detect, don't assume.** Observers and `requestAnimationFrame` must
   degrade gracefully (SSR, jsdom, minimal DOMs).
4. **Keep types strict.** `npm run check` must pass with the project's strict
   `tsconfig.json`.
5. **Add tests.** Aim to keep coverage above the configured thresholds
   (`npm run test:coverage`).
6. **Document the public surface.** Update JSDoc, `docs/`, and the changelog.

## Commit & release

- Follow [Conventional Commits](https://www.conventionalcommits.org/) when possible
  (`feat:`, `fix:`, `docs:`, `perf:`, `test:`, `refactor:`).
- This project uses [Semantic Versioning](https://semver.org/). Bump
  `package.json` and add a `CHANGELOG.md` entry for every release.

## Reporting bugs

Please open an issue with: browser/OS, a minimal reproduction, expected vs.
actual behavior, and (if possible) a measurement of the perf impact.
