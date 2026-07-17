import { HTMLTracker, type Tracker } from 'tracapi';

/**
 * Svelte `use:` action. Attach to any element:
 *
 *   <div use:track on:move={handleMove}></div>
 *
 * (Svelte forwards the tracker's events as component events via the returned
 * `update`/custom-event dispatch — here we keep it simple and return the
 * tracker instance for imperative use.)
 */
export function track(node: HTMLElement, options?: Parameters<typeof HTMLTracker.track>[1]) {
  const t: Tracker = HTMLTracker.track(node, options);

  // Re-dispatch tracker events as bubbling CustomEvents.
  const names = [
    'move',
    'resize',
    'enterViewport',
    'leaveViewport',
    'collisionStart',
    'collisionEnd',
    'destroy',
  ] as const;
  const offs = names.map((name) =>
    t.on(name, (detail) =>
      node.dispatchEvent(new CustomEvent(name, { detail, bubbles: true })),
    ),
  );

  return {
    update(next?: typeof options) {
      if (next) t.update(next);
    },
    destroy() {
      offs.forEach((off) => off());
      t.stop();
    },
  };
}
