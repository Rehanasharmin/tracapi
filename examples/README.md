# Examples

Self-contained, copy-pasteable usage of the HTML Object Tracker API.

| Folder | Stack | Notes |
| --- | --- | --- |
| [`vanilla/`](./vanilla) | Plain HTML/JS | Interactive playground. `standalone.html` runs with zero setup. |
| [`react/`](./react) | React | `useTracker` / `useTrackAll` hooks + cleanup. |
| [`vue/`](./vue) | Vue 3 | Composable with lifecycle cleanup. |
| [`svelte/`](./svelte) | Svelte | `use:track` action. |

## Run the vanilla playground

```bash
npm install
npm run build            # produce dist/
npm run dev              # vite serves examples/vanilla at http://localhost:5173
```

Or just open `examples/vanilla/standalone.html` directly — the build is inlined,
so it works offline with no server.
