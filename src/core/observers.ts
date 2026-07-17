import type { ResolvedTrackerOptions, ViewportState } from '../types';

/**
 * Thin wrappers around the native observers. Each observer degrades gracefully:
 * when a constructor is unavailable (e.g. SSR, minimal DOMs), tracking simply
 * falls back to the rect-poll path instead of throwing.
 * @internal
 */
export interface ObserverHooks {
  /** ResizeObserver fired (used as a low-latency resize trigger). */
  onResize: () => void;
  /** IntersectionObserver reported a new intersection ratio. */
  onIntersect: (inViewport: boolean, ratio: number) => void;
  /** MutationObserver reported attribute mutations. */
  onAttributeMutation: (records: MutationRecord[]) => void;
}

export class TrackerObservers {
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private mutationObserver?: MutationObserver;

  /** `true` when IntersectionObserver drives viewport state. */
  readonly useIntersection: boolean;
  /** `true` when ResizeObserver drives the resize event. */
  readonly useResize: boolean;
  /** `true` when MutationObserver is watching attributes. */
  readonly useMutation: boolean;

  constructor(
    private readonly el: Element,
    private readonly hooks: ObserverHooks,
    private readonly opts: ResolvedTrackerOptions,
  ) {
    this.useIntersection = typeof IntersectionObserver !== 'undefined';
    this.useResize = typeof ResizeObserver !== 'undefined';
    this.useMutation = typeof MutationObserver !== 'undefined';
  }

  observe(): void {
    if (this.useResize) {
      this.resizeObserver = new ResizeObserver(() => this.hooks.onResize());
      this.resizeObserver.observe(this.el, { box: this.opts.resizeBox });
    }
    if (this.useIntersection) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            this.hooks.onIntersect(entry.isIntersecting, entry.intersectionRatio);
          }
        },
        {
          root: this.opts.viewportRoot ?? null,
          rootMargin: this.opts.viewportMargin,
          threshold: this.opts.viewportThreshold,
        },
      );
      this.intersectionObserver.observe(this.el);
    }
    if (this.useMutation) {
      this.mutationObserver = new MutationObserver((records) =>
        this.hooks.onAttributeMutation(records),
      );
      this.mutationObserver.observe(this.el, {
        attributes: true,
        attributeFilter: this.opts.attributeFilter,
        attributeOldValue: false,
      });
    }
  }

  /** Update the latest viewport state (read by the measurement pass). */
  viewportState: ViewportState = { inViewport: false, ratio: 0, fromIO: false };

  disconnect(): void {
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver = undefined;
    this.intersectionObserver = undefined;
    this.mutationObserver = undefined;
  }
}
