import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HTMLTracker,
  type Tracker,
  type TrackerCollection,
  type TrackerEventName,
  type TrackerSnapshot,
} from 'tracapi';

/**
 * Track a single element by ref/selector. Cleans up on unmount automatically.
 */
export function useTracker(selector: string, active = true) {
  const [snapshot, setSnapshot] = useState<TrackerSnapshot | null>(null);
  const trackerRef = useRef<Tracker | null>(null);

  useEffect(() => {
    if (!active) return;
    const t = HTMLTracker.track(selector);
    trackerRef.current = t;
    setSnapshot({ ...t.state });
    const off = t.on('change', () => setSnapshot({ ...t.state }));
    return () => {
      off();
      t.stop();
      trackerRef.current = null;
    };
  }, [selector, active]);

  return { snapshot, tracker: trackerRef };
}

/**
 * Track many elements and keep a live list of their snapshots.
 */
export function useTrackAll(selector: string) {
  const [snapshots, setSnapshots] = useState<TrackerSnapshot[]>([]);
  const ref = useRef<TrackerCollection | null>(null);

  useEffect(() => {
    const col = HTMLTracker.trackAll(selector);
    ref.current = col;
    const sync = () => setSnapshots(col.snapshots().map((s) => ({ ...s })));
    sync();
    const off = col.on('change', sync);
    return () => {
      off();
      col.stopAll();
    };
  }, [selector]);

  return { snapshots, collection: ref };
}

/**
 * Subscribe to one event of a tracker and get the latest payload.
 */
export function useTrackerEvent<K extends TrackerEventName>(
  tracker: Tracker | null,
  event: K,
) {
  const [payload, setPayload] = useState<unknown>(null);
  useEffect(() => {
    if (!tracker) return;
    const off = tracker.on(event, (p) => setPayload(p));
    return () => off();
  }, [tracker, event]);
  return payload;
}

// Example component --------------------------------------------------------
export function LeaderBoard() {
  const { snapshot } = useTracker('#leader');
  const follow = useCallback(() => {
    // imperative access is always available
    console.log(snapshot);
  }, [snapshot]);
  return <button onClick={follow}>Leader is at {snapshot?.x ?? '?'}</button>;
}
