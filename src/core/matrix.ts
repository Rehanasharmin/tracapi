/**
 * Decompose a CSS `transform` string into rotation/scale components.
 *
 * Handles `none`, `matrix(...)`, and `matrix3d(...)`. Shear is folded into the
 * scale factors (the common rotate + scale cases decompose exactly).
 * @internal
 */

export interface TransformDecomposition {
  /** Rotation in degrees, normalized to (-180, 180]. */
  rotation: number;
  /** Horizontal scale. */
  scaleX: number;
  /** Vertical scale (negative when the transform reflects). */
  scaleY: number;
  /** Uniform scale — geometric mean of `|scaleX|` and `|scaleY|`. */
  scale: number;
  /** Horizontal translation in pixels. */
  translateX: number;
  /** Vertical translation in pixels. */
  translateY: number;
}

export const IDENTITY_TRANSFORM: TransformDecomposition = {
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  translateX: 0,
  translateY: 0,
};

/** Parse `matrix(...)` / `matrix3d(...)` into a flat number array. */
export function parseMatrix(transform: string): number[] | null {
  const m = transform.match(
    /matrix(?:3d)?\(([^)]*)\)/,
  );
  if (!m) return null;
  const values = m[1].split(',').map((s) => parseFloat(s.trim()));
  if (values.some((v) => Number.isNaN(v))) return null;
  return values;
}

/** Decompose a computed `transform` value. */
export function decomposeTransform(
  transform: string | null | undefined,
): TransformDecomposition {
  if (!transform || transform === 'none' || transform === 'matrix(none)') {
    return { ...IDENTITY_TRANSFORM };
  }
  const values = parseMatrix(transform);
  if (!values) return { ...IDENTITY_TRANSFORM };

  let a: number, b: number, c: number, d: number, tx: number, ty: number;
  if (values.length === 16) {
    // matrix3d is column-major: m11,m12,m13,m14, m21,m22,...  a=m11,b=m12,c=m21,d=m22
    a = values[0];
    b = values[1];
    c = values[4];
    d = values[5];
    tx = values[12];
    ty = values[13];
  } else if (values.length === 6) {
    [a, b, c, d, tx, ty] = values;
  } else {
    return { ...IDENTITY_TRANSFORM };
  }

  const scaleX = Math.hypot(a, b);
  // Guard against a zero-scale transform.
  if (scaleX === 0) {
    return { rotation: 0, scaleX: 0, scaleY: Math.hypot(c, d), scale: 0, translateX: tx, translateY: ty };
  }

  const rotation = normalizeDegrees((Math.atan2(b, a) * 180) / Math.PI);
  let scaleY = Math.hypot(c, d);
  const determinant = a * d - b * c;
  if (determinant < 0) scaleY = -scaleY;
  const scale = Math.sqrt(Math.abs(scaleX * scaleY));

  return { rotation, scaleX, scaleY, scale, translateX: tx, translateY: ty };
}

/** Normalize an angle in degrees into the (-180, 180] range. */
export function normalizeDegrees(deg: number): number {
  let n = deg % 360;
  if (n <= -180) n += 360;
  if (n > 180) n -= 360;
  return n;
}
