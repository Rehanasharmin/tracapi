import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import pkg from './package.json' with { type: 'json' };

/**
 * Rollup build configuration.
 *
 * Produces (minification is a separate in-process step — see scripts/minify.cjs
 * — to avoid @rollup/plugin-terser's worker-pool hang on Termux / Android ARM):
 *  - dist/tracapi.js      ESM (modern bundlers, tree-shakeable)
 *  - dist/tracapi.cjs     CommonJS (Node require)
 *  - dist/tracapi.umd.js  UMD (browser <script>, global HTMLTracker)
 *  - dist/tracapi.umd.min.js  minified UMD (produced by scripts/minify.cjs)
 *  - dist/types/index.d.ts     rolled-up TypeScript definitions
 *
 * The `sideEffects: false` flag in package.json lets bundlers tree-shake the
 * named exports (e.g. import { distance } from 'tracapi').
 */

const banner = `/*! ${pkg.name} v${pkg.version} | MIT License */`;
const tsConfig = { tsconfig: './tsconfig.bundle.json', declaration: false };

export default [
  // ESM + CJS bundles (named exports — tree-shakeable for bundlers)
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true,
        banner,
        exports: 'named',
      },
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        banner,
        exports: 'named',
      },
    ],
    plugins: [resolve(), typescript(tsConfig)],
  },
  // UMD (browser <script>) — flattened global so window.HTMLTracker.track() works
  {
    input: 'src/standalone.ts',
    output: {
      file: pkg.unpkg,
      format: 'umd',
      name: 'HTMLTracker',
      sourcemap: true,
      banner,
      exports: 'default',
    },
    plugins: [resolve(), typescript(tsConfig)],
  },
  // Bundled type definitions
  {
    input: 'src/index.ts',
    output: { file: pkg.types, format: 'es' },
    plugins: [dts()],
  },
];
