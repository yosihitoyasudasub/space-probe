import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Body } from '../physics';
import { createGravityWellGrid } from '../gravityWell';

const G = 0.133;

function makeStar(position: [number, number, number] = [0, 0, 0]): Body {
    return { id: 'star', mass: 333000, position, velocity: [0, 0, 0] };
}

// Index of the vertex closest to (x, z) in the grid geometry
function vertexIndexAt(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, x: number, z: number): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < positions.count; i++) {
        const dx = positions.getX(i) - x;
        const dz = positions.getZ(i) - z;
        const d = dx * dx + dz * dz;
        if (d < bestDist) {
            bestDist = d;
            best = i;
        }
    }
    return best;
}

describe('createGravityWellGrid', () => {
    it('deforms the grid into a well around the massive body, with edges near zero', () => {
        const scene = new THREE.Scene();
        const bodies = [makeStar()];
        const grid = createGravityWellGrid(scene, bodies, () => G, false);

        expect(scene.children).toContain(grid.mesh);
        expect(grid.mesh.visible).toBe(false);

        grid.setVisible(true);
        expect(grid.mesh.visible).toBe(true);

        const positions = grid.mesh.geometry.attributes.position;
        // Note: the vertex exactly at the body is skipped by the zero-division
        // guard, so probe the well one grid cell (35 units) away instead.
        const nearIdx = vertexIndexAt(positions, 35, 0);
        const nearY = positions.getY(nearIdx);
        const farIdx = vertexIndexAt(positions, 1750, 0);

        // Deep well next to the body, monotonically shallower with distance,
        // corners at the reference height (~0)
        expect(nearY).toBeLessThan(0);
        expect(nearY).toBeLessThan(positions.getY(farIdx));
        expect(positions.getY(farIdx)).toBeLessThan(0);
        expect(positions.getY(0)).toBeCloseTo(0, 6);
    });

    it('does not recompute while hidden', () => {
        const scene = new THREE.Scene();
        const bodies = [makeStar()];
        const grid = createGravityWellGrid(scene, bodies, () => G, false);

        for (let i = 0; i < 10; i++) grid.update();

        // Still flat (only float noise from the initial plane rotation)
        const positions = grid.mesh.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            expect(Math.abs(positions.getY(i))).toBeLessThan(1e-6);
        }
    });

    it('recomputes only every 4th update call (frame throttling)', () => {
        const scene = new THREE.Scene();
        const star = makeStar();
        const bodies = [star];
        const grid = createGravityWellGrid(scene, bodies, () => G, true);

        // Toggling visible recomputes immediately for the body at the origin
        grid.setVisible(true);
        const positions = grid.mesh.geometry.attributes.position;
        const nearIdx = vertexIndexAt(positions, 35, 0);
        const initialY = positions.getY(nearIdx);
        expect(initialY).toBeLessThan(0);

        // Move the body far away; the well should NOT move for 3 frames...
        star.position = [3000, 0, 0];
        grid.update();
        grid.update();
        grid.update();
        expect(positions.getY(nearIdx)).toBe(initialY);

        // ...and refresh on the 4th
        grid.update();
        expect(positions.getY(nearIdx)).not.toBe(initialY);
    });

    it('ignores the probe body when computing the potential', () => {
        const scene = new THREE.Scene();
        const probeOnly: Body[] = [{ id: 'probe', mass: 1e9, position: [0, 0, 0], velocity: [0, 0, 0], isProbe: true }];
        const grid = createGravityWellGrid(scene, probeOnly, () => G, false);

        grid.setVisible(true);

        const positions = grid.mesh.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            expect(positions.getY(i)).toBe(0);
        }
    });
});
