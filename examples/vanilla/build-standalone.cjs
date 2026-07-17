/* Assembles a single self-contained demo HTML (inlined CSS + UMD build + JS)
 * so it runs anywhere — even in a sandboxed preview with no network. */
const fs = require('fs');
const dir = __dirname + '/';
const css = fs.readFileSync(dir + 'demo.css', 'utf8');
const js = fs.readFileSync(dir + 'demo.js', 'utf8');
const umd = fs.readFileSync(dir + '../../dist/tracapi.umd.min.js', 'utf8');

const markup = `
  <header>
    <h1>HTML Object Tracker</h1>
    <span class="badge">drag · dbl-click = leader · collisions live</span>
  </header>
  <div class="toolbar">
    <button id="btn-add">＋ Add box</button>
    <button id="btn-spin">↻ Rotate</button>
    <button id="btn-fade">◐ Fade</button>
    <button id="btn-follow">✦ Follow leader</button>
    <button id="btn-clear">🗑 Clear</button>
  </div>
  <main id="stage"></main>
  <aside id="panel">
    <h2>Selected snapshot</h2>
    <div class="stat"><span>x</span><span id="f-x">—</span></div>
    <div class="stat"><span>y</span><span id="f-y">—</span></div>
    <div class="stat"><span>width</span><span id="f-w">—</span></div>
    <div class="stat"><span>height</span><span id="f-h">—</span></div>
    <div class="stat"><span>rotation</span><span id="f-rot">—</span></div>
    <div class="stat"><span>scale</span><span id="f-scale">—</span></div>
    <div class="stat"><span>opacity</span><span id="f-op">—</span></div>
    <div class="stat"><span>viewport</span><span id="f-vp">—</span></div>
    <div class="stat"><span>distance &rarr; leader</span><span id="f-dist">—</span></div>
    <p class="hint">
      Drag boxes around to fire <code>move</code>. Overlap two to see
      <code>collisionStart</code> (red outline). Double-click a box to make it
      the leader, then toggle <b>Follow leader</b>. All values update from a
      single shared <code>requestAnimationFrame</code> loop.
    </p>
  </aside>
  <div class="fps" id="fps">— fps</div>
`;

const html =
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
  '<meta charset="UTF-8" />\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
  '<title>HTML Object Tracker — Interactive Demo</title>\n' +
  '<style>\n' + css + '\n</style>\n' +
  '</head>\n<body>\n' + markup + '\n' +
  '<script>\n' + umd + '\n</script>\n' +
  '<script>\n' + js + '\n</script>\n' +
  '</body>\n</html>\n';

fs.writeFileSync(dir + 'standalone.html', html);
console.log('Wrote standalone.html (' + Math.round(html.length / 1024) + ' KB)');
