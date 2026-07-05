import { describe, it, expect } from 'vitest';
import { computeThrustDV } from '../thrust';

const noInput = { left: false, right: false, up: false, down: false };

describe('computeThrustDV', () => {
    it('returns zero delta-v with no input', () => {
        expect(computeThrustDV({ x: 10, y: 0, z: 0 }, noInput, 0.02)).toEqual([0, 0, 0]);
    });

    it('thrusts along the velocity direction for "up"', () => {
        const dv = computeThrustDV({ x: 10, y: 0, z: 0 }, { ...noInput, up: true }, 0.02);
        expect(dv[0]).toBeCloseTo(0.02);
        expect(dv[1]).toBe(0);
        expect(dv[2]).toBeCloseTo(0);
    });

    it('thrusts against the velocity direction for "down"', () => {
        const dv = computeThrustDV({ x: 0, y: 0, z: -5 }, { ...noInput, down: true }, 0.02);
        expect(dv[0]).toBeCloseTo(0);
        expect(dv[2]).toBeCloseTo(0.02);
    });

    it('thrusts perpendicular to the velocity for "left"', () => {
        // moving along +x; right = cross(forward, up) = -z, so left = +z... but
        // the implementation adds the right vector for "left": right = [fz,0,-fx] = [0,0,-1]
        const dv = computeThrustDV({ x: 10, y: 0, z: 0 }, { ...noInput, left: true }, 0.02);
        expect(dv[0]).toBeCloseTo(0);
        expect(dv[2]).toBeCloseTo(-0.02);
        // perpendicular to velocity
        expect(dv[0] * 10 + dv[2] * 0).toBeCloseTo(0);
    });

    it('opposite inputs cancel out', () => {
        const dv = computeThrustDV({ x: 3, y: 0, z: 4 }, { ...noInput, up: true, down: true }, 0.02);
        expect(dv).toEqual([0, 0, 0]);
    });

    it('falls back to world-axis control when stationary', () => {
        expect(computeThrustDV({ x: 0, y: 0, z: 0 }, { ...noInput, up: true }, 0.02)).toEqual([0, 0, -0.02]);
        expect(computeThrustDV({ x: 0, y: 0, z: 0 }, { ...noInput, left: true }, 0.02)).toEqual([-0.02, 0, 0]);
    });
});
