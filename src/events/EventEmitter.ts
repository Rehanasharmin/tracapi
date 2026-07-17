/**
 * A minimal, allocation-conscious, strongly-typed event emitter.
 * @internal
 */
export type Handler<T = unknown> = (payload: T) => void;
export type Unsubscribe = () => void;

export class EventEmitter<E = Record<string, unknown>> {
  private readonly listeners = new Map<keyof E, Set<Handler>>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof E>(event: K, handler: Handler<E[K]>): Unsubscribe {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler);
    return () => this.off(event, handler);
  }

  /** Subscribe to the next occurrence of an event, then unsubscribe. */
  once<K extends keyof E>(event: K, handler: Handler<E[K]>): Unsubscribe {
    const wrapper: Handler<E[K]> = (payload) => {
      this.off(event, wrapper as Handler<E[K]>);
      handler(payload);
    };
    return this.on(event, wrapper as Handler<E[K]>);
  }

  /** Remove a handler (or all handlers for an event when omitted). */
  off<K extends keyof E>(event: K, handler?: Handler<E[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    if (handler) {
      set.delete(handler as Handler);
      if (set.size === 0) this.listeners.delete(event);
    } else {
      this.listeners.delete(event);
    }
  }

  /** Emit an event. Handlers added/removed during emission do not affect this pass. */
  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    // Iterate over a shallow copy so handlers may safely mutate subscriptions.
    const snapshot = Array.from(set);
    for (let i = 0; i < snapshot.length; i++) {
      try {
        snapshot[i](payload);
      } catch (error) {
        // Report but never let one handler break the dispatch loop.
        reportError(error);
      }
    }
  }

  /** Number of handlers currently registered for `event`. */
  listenerCount<K extends keyof E>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Remove every handler. */
  clear(): void {
    this.listeners.clear();
  }
}

function reportError(error: unknown): void {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error('[tracapi] event handler threw:', error);
  }
}
