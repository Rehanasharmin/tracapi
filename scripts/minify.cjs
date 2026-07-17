/**
 * In-process minifier for the UMD bundle.
 *
 * We intentionally do NOT use @rollup/plugin-terser, because that plugin uses
 * a worker pool that hangs on some environments (notably Termux / Android ARM,
 * and some minimal Node builds). Running terser here, in the main thread, is
 * ~universally safe and avoids the "Unexpected early exit / unfinished hook
 * (terser) renderChunk" error.
 *
 *   node scripts/minify.cjs
 */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const pkg = require('../package.json');
const banner = `/*! ${pkg.name} v${pkg.version} | MIT License */`;

const input = path.resolve(__dirname, '..', 'dist', 'tracapi.umd.js');
const output = path.resolve(__dirname, '..', 'dist', 'tracapi.umd.min.js');

(async () => {
  if (!fs.existsSync(input)) {
    console.error(`minify: input not found (${input}). Run the rollup build first.`);
    process.exit(1);
  }
  const code = fs.readFileSync(input, 'utf8');
  const result = await minify(code, {
    compress: true,
    mangle: true,
    format: { comments: false },
  });
  if (!result.code) {
    console.error('minify: terser produced no output.');
    process.exit(1);
  }
  fs.writeFileSync(output, banner + '\n' + result.code);
  const kb = (Buffer.byteLength(result.code) / 1024).toFixed(1);
  console.log(`created dist/tracapi.umd.min.js (${kb} KB)`);
})().catch((err) => {
  console.error('minify failed:', err);
  process.exit(1);
});
