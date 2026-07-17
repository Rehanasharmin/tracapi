import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { HTMLTracker, type Tracker, type TrackerSnapshot } from 'tracapi';

/**
 * Reactive tracking for a single element. Returns a ref holding the latest
 * snapshot; the tracker is stopped automatically on unmount.
 */
export function useTracker(target: string | Ref<HTMLElement | null>) {
  const snapshot = ref<TrackerSnapshot | null>(null);
  let tracker: Tracker | null = null;

  onMounted(() => {
    const el =
      typeof target === 'string'
        ? document.querySelector(target)
        : target.value;
    if (!el) return;
    tracker = HTMLTracker.track(el);
    snapshot.value = { ...tracker.state };
    tracker.on('change', () => {
      snapshot.value = { ...tracker!.state };
    });
  });

  onUnmounted(() => tracker?.stop());

  return { snapshot, getTracker: () => tracker };
}

// Usage in a component:
//   const { snapshot } = useTracker('#player')
//   <template><div :style="{ left: snapshot?.x + 'px' }">…</div></template>
