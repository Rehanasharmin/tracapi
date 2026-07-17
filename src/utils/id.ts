let counter = 0;

/**
 * Generate a short, monotonically unique id.
 *
 * @internal
 */
export function generateId(prefix = 'hot'): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
