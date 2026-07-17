/**
 * Headless throughput benchmark.
 *
 * Measures the shared engine's per-frame cost as the number of tracked
 * elements grows. Geometry is mutated every frame so every tracker produces a
 * real diff (move + queued event) — the worst case for the READ/COMPUTE phases.
 *
 *   node benchmarks/benchmark.js
 */
import { JSDOM } from 'jsdom';

// --- jsdom globals (must exist before importing the library) -------------
const dom = new JSDOM('<!DOCTYPE html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });

// --- controllable rAF pump ----------------------------------------------
let queue = [];
let idCounter = 1;
const pending = new Map();
globalThis.requestAnimationFrame = (cb) => {
  const id = idCounter++;
  pending.set(id, cb);
  queue.push(cb);
  return id;
};
globalThis.cancelAnimationFrame = (id) => {
  const cb = pending.get(id);
  if (cb) {
    pending.delete(id);
    queue = queue.filter((c) => c !== cb);
  }
};
function pumpOnce() {
  const current = queue;
  queue = [];
  for (const cb of current) cb(frameCounter);
}

const { HTMLTracker } = await import('../dist/tracapi.js');

// --- benchmark harness ---------------------------------------------------
let frameCounter = 0;

function rectFor(i) {
  const x = (i * 7 + frameCounter) % 2000;
  const y = (i * 13 + frameCounter * 2) % 1500;
  const w = 50;
  const h = 50;
  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h };
}

function run(n) {
  document.body.innerHTML = '';
  const els = [];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    const idx = i;
    el.getBoundingClientRect = () => rectFor(idx);
    document.body.appendChild(el);
    els.push(el);
  }
  const trackers = els.map((e) =>
    HTMLTracker.track(e, { pollStyle: false, autoDestroy: false }),
  );
  // move handlers so events are dispatched each frame (exercises FLUSH too)
  trackers.forEach((t) => t.on('move', () => {}));

  // warm up
  for (let i = 0; i < 30; i++) {
    frameCounter++;
    pumpOnce();
  }

  const FRAMES = 300;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < FRAMES; i++) {
    frameCounter++;
    pumpOnce();
  }
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  const perFrame = ms / FRAMES;
  const fps = 1000 / perFrame;

  trackers.forEach((t) => t.stop());
  return { n, perFrame, fps };
}

console.log('HTML Object Tracker — headless benchmark (jsdom, Node ' + process.version + ')\n');
console.log('trackers | per-frame (ms) | effective FPS');
console.log('---------+----------------+----------------');
for (const n of [100, 500, 1000, 3000, 5000]) {
  const { perFrame, fps } = run(n);
  console.log(
    `${String(n).padStart(8)} | ${perFrame.toFixed(3).padStart(14)} | ${fps.toFixed(1).padStart(14)}`,
  );
}
console.log('\nDone.');
