/* HTML Object Tracker — interactive demo (UMD global: HTMLTracker) */
(function () {
  'use strict';
  const T = window.HTMLTracker;
  const stage = document.getElementById('stage');
  const panel = document.getElementById('panel');
  const fpsEl = document.getElementById('fps');

  const palette = ['#6ea8ff', '#f59e0b', '#4ade80', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185'];
  let selected = null;        // selected Tracker
  let follow = false;         // follow-leader mode
  let leader = null;          // leader Tracker

  // --- create the boxes ---------------------------------------------------
  function spawn(x, y, opts = {}) {
    const el = document.createElement('div');
    el.className = 'box' + (opts.leader ? ' leader' : '');
    el.textContent = opts.label || '';
    el.style.background = opts.color || palette[boxes.length % palette.length];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    stage.appendChild(el);
    const tracker = T.track(el);
    el._tracker = tracker;
    boxes.push({ el, tracker });
    return tracker;
  }
  const boxes = [];

  // drag handling
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const boxEl = e.target.closest('.box');
    if (!boxEl) return;
    select(boxEl._tracker);
    const rect = boxEl.getBoundingClientRect();
    drag = {
      el: boxEl,
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
    };
    boxEl.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const stageRect = stage.getBoundingClientRect();
    const x = e.clientX - stageRect.left - drag.ox;
    const y = e.clientY - stageRect.top - drag.oy;
    drag.el.style.left = x + 'px';
    drag.el.style.top = y + 'px';
  });
  stage.addEventListener('pointerup', () => (drag = null));
  stage.addEventListener('pointercancel', () => (drag = null));

  // double-click to (un)mark leader
  stage.addEventListener('dblclick', (e) => {
    const boxEl = e.target.closest('.box');
    if (!boxEl) return;
    if (leader && leader.element !== boxEl) leader.element.classList.remove('leader');
    leader = boxEl._tracker;
    boxEl.classList.add('leader');
  });

  function select(tracker) {
    if (selected) selected.element.classList.remove('selected');
    selected = tracker;
    if (selected) selected.element.classList.add('selected');
    renderPanel();
  }

  // --- collision collection over every box --------------------------------
  const collisionSet = T.trackAll('.box', { collision: { mode: 'overlap' } });
  collisionSet.on('collisionStart', ({ from, to }) => {
    from.element.classList.add('collide');
    to.element.classList.add('collide');
  });
  collisionSet.on('collisionEnd', ({ from, to }) => {
    // only clear if neither is colliding with anything now
    if (!from.isCollidingWithAny && !hasCollision(from)) from.element.classList.remove('collide');
    if (!hasCollision(to)) to.element.classList.remove('collide');
  });
  function hasCollision(t) {
    return collisionSet.collisions().some(([a, b]) => a === t || b === t);
  }

  // --- follow mode: every non-leader chases the leader --------------------
  function applyFollow() {
    if (!follow || !leader) return;
    const lc = leader.state;
    for (const { el, tracker } of boxes) {
      if (tracker === leader) continue;
      const s = tracker.state;
      const dx = lc.centerX - s.centerX;
      const dy = lc.centerY - s.centerY;
      el.style.left = parseFloat(el.style.left) + dx * 0.04 + 'px';
      el.style.top = parseFloat(el.style.top) + dy * 0.04 + 'px';
    }
  }
  setInterval(applyFollow, 16);

  // --- live readout panel (uses the aggregate 'change' event) -------------
  const fields = {
    x: document.getElementById('f-x'),
    y: document.getElementById('f-y'),
    w: document.getElementById('f-w'),
    h: document.getElementById('f-h'),
    rot: document.getElementById('f-rot'),
    scale: document.getElementById('f-scale'),
    opacity: document.getElementById('f-op'),
    inVp: document.getElementById('f-vp'),
    dist: document.getElementById('f-dist'),
  };
  function renderPanel() {
    if (!selected) return;
    const s = selected.state;
    fields.x.textContent = s.x.toFixed(0);
    fields.y.textContent = s.y.toFixed(0);
    fields.w.textContent = s.width.toFixed(0);
    fields.h.textContent = s.height.toFixed(0);
    fields.rot.textContent = s.rotation.toFixed(1) + '°';
    fields.scale.textContent = s.scale.toFixed(2);
    fields.opacity.textContent = s.opacity.toFixed(2);
    fields.inVp.textContent = s.inViewport ? 'in' : 'out';
    fields.inVp.style.color = s.inViewport ? 'var(--good)' : 'var(--bad)';
    fields.dist.textContent =
      leader && leader !== selected
        ? T.distance(selected, leader).toFixed(0) + 'px'
        : '—';
  }
  function wireReadout() {
    if (!selected) return;
    // rebind every time selection changes
    selected.on('change', renderPanel);
  }
  // poll-render at ~60fps to keep panel crisp (cheap; panel only)
  setInterval(renderPanel, 50);

  // --- toolbar ------------------------------------------------------------
  const btnFollow = document.getElementById('btn-follow');
  btnFollow.addEventListener('click', () => {
    follow = !follow;
    btnFollow.classList.toggle('active', follow);
    if (follow && !leader && boxes[0]) {
      leader = boxes[0].tracker;
      leader.element.classList.add('leader');
    }
  });
  document.getElementById('btn-add').addEventListener('click', () => {
    const t = spawn(120 + Math.random() * 400, 120 + Math.random() * 300, {
      label: String(boxes.length + 1),
    });
    select(t);
    // the new element needs to be part of the collision set:
    collisionSet.add(t.element);
  });
  document.getElementById('btn-spin').addEventListener('click', () => {
    if (!selected) return;
    const cur = parseFloat(selected.element.dataset.rot || '0') + 45;
    selected.element.dataset.rot = cur;
    selected.element.style.transform = `rotate(${cur}deg)`;
  });
  document.getElementById('btn-fade').addEventListener('click', () => {
    if (!selected) return;
    selected.element.style.opacity = selected.element.style.opacity === '0.3' ? '1' : '0.3';
  });
  document.getElementById('btn-clear').addEventListener('click', () => {
    for (const { el, tracker } of boxes) {
      tracker.stop();
      el.remove();
    }
    boxes.length = 0;
    selected = null;
    leader = null;
  });

  // --- FPS meter driven by a tiny tracker ---------------------------------
  let frames = 0;
  let last = performance.now();
  const probe = T.track(stage, { pollStyle: false });
  probe.on('move', () => {}); // keep the loop hot
  setInterval(() => {
    const now = performance.now();
    fpsEl.textContent = Math.round(1000 / Math.max(1, now - last)) + ' fps';
    last = now;
  }, 500);

  // --- seed the stage -----------------------------------------------------
  for (let i = 0; i < 5; i++) {
    spawn(120 + i * 90, 160, { label: String(i + 1) });
  }
  select(boxes[0].tracker);
})();
