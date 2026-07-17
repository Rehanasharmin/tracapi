# Getting Started Guide

This guide walks from zero to real-world usage of the HTML Object Tracker API.

## 1. Install

```bash
npm install tracapi
```

## 2. Track your first element

```js
import { HTMLTracker } from 'tracapi';

const box = HTMLTracker.track('#box');

box.on('move', (e) => {
  console.log(`moved by (${e.dx}, ${e.dy}) → now at (${e.snapshot.x}, ${e.snapshot.y})`);
});
```

That's it. The engine is now running a single `requestAnimationFrame` loop and
will keep `box.state` fresh and emit `move` whenever the element's position
changes (due to layout, scroll, CSS animation, drag, etc.).

## 3. Read the snapshot any time

```js
const s = box.state;
console.log(s.x, s.y, s.width, s.height); // geometry
console.log(s.rotation, s.scale);         // from the CSS transform matrix
console.log(s.opacity, s.visible);        // style + effective visibility
console.log(s.inViewport, s.viewportRatio.toFixed(2));
```

`state` is an immutable snapshot, safe to read or store.

## 4. Stop tracking

```js
box.stop();          // emits destroy, disconnects observers, frees memory
```

By default a tracker also **auto-destroys** when its element leaves the DOM, so
you rarely leak trackers when components unmount.

## 5. Track many + collisions

`trackAll` returns a `TrackerCollection`. By default it enables member-vs-member
overlap collisions and forwards per-member events:

```js
const dots = HTMLTracker.trackAll('.dot', {
  collision: { mode: 'overlap', padding: 4 },
});

dots.on('collisionStart', ({ from, to }) => {
  from.element.classList.add('hit');
  to.element.classList.add('hit');
});
dots.on('collisionEnd', ({ from, to }) => {
  from.element.classList.remove('hit');
  to.element.classList.remove('hit');
});
```

You can still subscribe to individual members:

```js
dots.trackers.forEach((t) => t.on('move', (e) => render(e.snapshot)));
```

## 6. Follow / synchronize one element with another

```js
const leader = HTMLTracker.track('#leader');
const follower = document.querySelector('#follower');

leader.on('move', (e) => {
  // keep follower glued to leader's center
  follower.style.transform = `translate(${e.snapshot.centerX}px, ${e.snapshot.centerY}px)`;
});
```

> 💡 Writing to the DOM inside an event handler is safe — handlers run in the
> **FLUSH** phase, after every tracker has already been measured.

## 7. React to viewport entry (lazy-load, reveal)

```js
HTMLTracker.track('.reveal', {
  viewportThreshold: 0.25,           // 25% visible counts as "entered"
}).on('enterViewport', (e) => {
  e.target.classList.add('revealed');
});
```

## 8. Collide one tracker against an arbitrary set

```js
HTMLTracker.track('#ship', {
  collision: { with: '.asteroid', mode: 'overlap' },
}).on('collision', (e) => {
  console.log('ship hit', e.other);
});
```

## 9. Geometry helpers

```js
const nearest = HTMLTracker.nearest('#ship', '.pickup');
const d = HTMLTracker.distance('#ship', nearest);
```

## 10. Tune for scale

For hundreds/thousands of elements:

```js
HTMLTracker.trackAll('.particle', {
  pollStyle: false,   // skip transform/opacity polling
  frameSkip: 1,       // measure every other frame
  forwardEvents: false,
});
HTMLTracker.pause();  // freeze the whole engine (e.g. when tab is hidden)
HTMLTracker.resume();
```

See [PERFORMANCE.md](./PERFORMANCE.md) for numbers and recipes.
