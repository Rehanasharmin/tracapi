import { describe, it, expect } from 'vitest';
import {
  decomposeTransform,
  parseMatrix,
  normalizeDegrees,
  IDENTITY_TRANSFORM,
} from '../src/core/matrix';

describe('matrix', () => {
  it('parses matrix()', () => {
    expect(parseMatrix('matrix(1, 0, 0, 1, 10, 20)')).toEqual([1, 0, 0, 1, 10, 20]);
  });

  it('parses matrix3d()', () => {
    const v = parseMatrix('matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 5,6,0,1)');
    expect(v).toHaveLength(16);
    expect(v?.[12]).toBe(5);
    expect(v?.[13]).toBe(6);
  });

  it('returns identity for none / empty', () => {
    expect(decomposeTransform('none')).toEqual(IDENTITY_TRANSFORM);
    expect(decomposeTransform(null)).toEqual(IDENTITY_TRANSFORM);
    expect(decomposeTransform('')).toEqual(IDENTITY_TRANSFORM);
  });

  it('extracts pure rotation (matrix)', () => {
    // rotate(90deg) ≈ matrix(0,1,-1,0,0,0)
    const r = decomposeTransform('matrix(0, 1, -1, 0, 0, 0)');
    expect(r.rotation).toBeCloseTo(90);
    expect(r.scaleX).toBeCloseTo(1);
    expect(r.scaleY).toBeCloseTo(1);
  });

  it('extracts uniform scale', () => {
    const r = decomposeTransform('matrix(2, 0, 0, 2, 0, 0)');
    expect(r.scaleX).toBeCloseTo(2);
    expect(r.scaleY).toBeCloseTo(2);
    expect(r.scale).toBeCloseTo(2);
    expect(r.rotation).toBeCloseTo(0);
  });

  it('extracts non-uniform scale (geometric mean)', () => {
    const r = decomposeTransform('matrix(2, 0, 0, 3, 0, 0)');
    expect(r.scaleX).toBeCloseTo(2);
    expect(r.scaleY).toBeCloseTo(3);
    expect(r.scale).toBeCloseTo(Math.sqrt(6));
  });

  it('handles matrix3d 2D-plane rotation', () => {
    // rotate(90deg) as matrix3d
    const r = decomposeTransform('matrix3d(0,1,0,0, -1,0,0,0, 0,0,1,0, 0,0,0,1)');
    expect(r.rotation).toBeCloseTo(90);
    expect(r.scale).toBeCloseTo(1);
  });

  it('reads translation', () => {
    const r = decomposeTransform('matrix(1, 0, 0, 1, 12, -8)');
    expect(r.translateX).toBe(12);
    expect(r.translateY).toBe(-8);
  });

  it('normalizeDegrees wraps into (-180, 180]', () => {
    expect(normalizeDegrees(370)).toBeCloseTo(10);
    expect(normalizeDegrees(-190)).toBeCloseTo(170);
    expect(normalizeDegrees(180)).toBeCloseTo(180);
    expect(normalizeDegrees(-180)).toBeCloseTo(180);
  });
});
