import type { TrackerRect, TrackerSnapshot, ViewportState, Visibility } from '../types';
import { clamp, readStyle } from '../utils/dom';
import { decomposeTransform } from './matrix';

/**
 * Measurement + change-detection core.
 *
 * All DOM **reads** for a single element are concentrated in
 * {@link measureElement} so the engine can batch them and avoid layout thrash.
 * @internal
 */

function deriveVisibility(
  visProp: string,
  displayProp: string,
  width: number,
  height: number,
): Visibility {
  if (displayProp === 'none') return 'display-none';
  if (visProp === 'hidden') return 'hidden';
  if (visProp === 'collapse') return 'collapse';
  if (width === 0 || height === 0) return 'zero-size';
  return 'visible';
}

/** Build a fresh snapshot for `el`. */
export function measureElement(
  el: Element,
  pollStyle: boolean,
  viewport: ViewportState,
  id: string,
): TrackerSnapshot {
  const inDOM = el.isConnected;
  const domRect = el.getBoundingClientRect();
  const rect: TrackerRect = {
    x: domRect.x,
    y: domRect.y,
    width: domRect.width,
    height: domRect.height,
    top: domRect.top,
    right: domRect.right,
    bottom: domRect.bottom,
    left: domRect.left,
  };
  const { width, height } = rect;
  const centerX = rect.x + width / 2;
  const centerY = rect.y + height / 2;

  let rotation = 0;
  let scaleX = 1;
  let scaleY = 1;
  let scale = 1;
  let opacity = 1;
  let visible = true;
  let visibility: Visibility = 'visible';
  let zIndex = 0;

  if (pollStyle && inDOM) {
    const t = decomposeTransform(readStyle(el, 'transform'));
    rotation = t.rotation;
    scaleX = t.scaleX;
    scaleY = t.scaleY;
    scale = t.scale;

    const op = parseFloat(readStyle(el, 'opacity'));
    opacity = Number.isFinite(op) ? op : 1;

    visibility = deriveVisibility(
      readStyle(el, 'visibility'),
      readStyle(el, 'display'),
      width,
      height,
    );
    visible = visibility === 'visible';

    const z = parseInt(readStyle(el, 'z-index'), 10);
    zIndex = Number.isFinite(z) ? z : 0;
  } else if (!inDOM) {
    visible = false;
    visibility = 'display-none';
  }

  // Scroll offsets (own scrollport).
  const htmlEl = el as HTMLElement;
  const scrollX = typeof htmlEl.scrollLeft === 'number' ? htmlEl.scrollLeft : 0;
  const scrollY = typeof htmlEl.scrollTop === 'number' ? htmlEl.scrollTop : 0;
  const scrollWidth =
    typeof htmlEl.scrollWidth === 'number' ? htmlEl.scrollWidth : 0;
  const scrollHeight =
    typeof htmlEl.scrollHeight === 'number' ? htmlEl.scrollHeight : 0;
  const clientWidth =
    typeof htmlEl.clientWidth === 'number' ? htmlEl.clientWidth : 0;
  const clientHeight =
    typeof htmlEl.clientHeight === 'number' ? htmlEl.clientHeight : 0;
  const hasOverflow =
    scrollWidth > clientWidth + 1 || scrollHeight > clientHeight + 1;

  // Viewport: trust IntersectionObserver when available, else compute from rect.
  let inViewport = viewport.inViewport;
  let viewportRatio = viewport.ratio;
  if (!viewport.fromIO) {
    const vw =
      (globalThis as { innerWidth?: number }).innerWidth ??
      document.documentElement?.clientWidth ??
      0;
    const vh =
      (globalThis as { innerHeight?: number }).innerHeight ??
      document.documentElement?.clientHeight ??
      0;
    const ix1 = clamp(rect.left, 0, vw);
    const iy1 = clamp(rect.top, 0, vh);
    const ix2 = clamp(rect.right, 0, vw);
    const iy2 = clamp(rect.bottom, 0, vh);
    const interW = Math.max(0, ix2 - ix1);
    const interH = Math.max(0, iy2 - iy1);
    const interArea = interW * interH;
    const area = width * height;
    inViewport = interArea > 0 && visible;
    viewportRatio = area > 0 ? interArea / area : inViewport ? 1 : 0;
  }

  return {
    id,
    x: rect.x,
    y: rect.y,
    width,
    height,
    centerX,
    centerY,
    rect,
    rotation,
    scale,
    scaleX,
    scaleY,
    opacity,
    visible,
    visibility,
    zIndex,
    inViewport,
    viewportRatio,
    scrollX,
    scrollY,
    scrollWidth,
    scrollHeight,
    hasOverflow,
    inDOM,
    timestamp: now(),
  };
}

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** Per-facet change report produced by {@link diffSnapshots}. */
export interface ChangeFacets {
  readonly move: boolean;
  readonly resize: boolean;
  readonly scroll: boolean;
  readonly rotate: boolean;
  readonly scale: boolean;
  readonly opacity: boolean;
  readonly visibility: boolean;
  readonly zIndex: boolean;
  readonly dx: number;
  readonly dy: number;
  readonly dw: number;
  readonly dh: number;
  readonly dRotation: number;
  readonly dScaleX: number;
  readonly dScaleY: number;
  readonly dOpacity: number;
  readonly dScrollX: number;
  readonly dScrollY: number;
  readonly dzIndex: number;
}

function changed(prev: number, next: number, precision: number): boolean {
  return Math.abs(prev - next) > precision;
}

/**
 * Compare two snapshots. On the first measurement (`prev === null`) every facet
 * is reported unchanged — the snapshot is simply published via `state`.
 */
export function diffSnapshots(
  prev: TrackerSnapshot | null,
  next: TrackerSnapshot,
  precision: number,
): ChangeFacets {
  if (!prev) {
    return {
      move: false,
      resize: false,
      scroll: false,
      rotate: false,
      scale: false,
      opacity: false,
      visibility: false,
      zIndex: false,
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      dRotation: 0,
      dScaleX: 0,
      dScaleY: 0,
      dOpacity: 0,
      dScrollX: 0,
      dScrollY: 0,
      dzIndex: 0,
    };
  }
  const move = changed(prev.x, next.x, precision) || changed(prev.y, next.y, precision);
  const resize =
    changed(prev.width, next.width, precision) ||
    changed(prev.height, next.height, precision);
  const scroll =
    changed(prev.scrollX, next.scrollX, precision) ||
    changed(prev.scrollY, next.scrollY, precision);
  const rotate = changed(prev.rotation, next.rotation, precision);
  const scale =
    changed(prev.scaleX, next.scaleX, precision) ||
    changed(prev.scaleY, next.scaleY, precision);
  const opacity = changed(prev.opacity, next.opacity, precision);
  const visibility = prev.visibility !== next.visibility || prev.visible !== next.visible;
  const zIndex = prev.zIndex !== next.zIndex;

  return {
    move,
    resize,
    scroll,
    rotate,
    scale,
    opacity,
    visibility,
    zIndex,
    dx: next.x - prev.x,
    dy: next.y - prev.y,
    dw: next.width - prev.width,
    dh: next.height - prev.height,
    dRotation: next.rotation - prev.rotation,
    dScaleX: next.scaleX - prev.scaleX,
    dScaleY: next.scaleY - prev.scaleY,
    dOpacity: next.opacity - prev.opacity,
    dScrollX: next.scrollX - prev.scrollX,
    dScrollY: next.scrollY - prev.scrollY,
    dzIndex: next.zIndex - prev.zIndex,
  };
}

/** Human-readable list of facets that changed (drives the `change` event). */
export function changedFacetList(f: ChangeFacets): string[] {
  const list: string[] = [];
  if (f.move) list.push('move');
  if (f.resize) list.push('resize');
  if (f.scroll) list.push('scroll');
  if (f.rotate) list.push('rotate');
  if (f.scale) list.push('scale');
  if (f.opacity) list.push('opacity');
  if (f.visibility) list.push('visibility');
  if (f.zIndex) list.push('zIndex');
  return list;
}
