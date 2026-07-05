import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createTrail } from '../trail';

describe('createTrail', () => {
    it('adds a line to the scene and stays empty with fewer than 2 points', () => {
        const scene = new THREE.Scene();
        const trail = createTrail(scene);

        const line = scene.children.find((c) => c instanceof THREE.Line) as THREE.Line;
        expect(line).toBeDefined();

        trail.addPoint(new THREE.Vector3(0, 0, 0));
        expect(line.geometry.getAttribute('position')).toBeUndefined();
    });

    it('builds a smoothed curve through the sampled points', () => {
        const scene = new THREE.Scene();
        const trail = createTrail(scene);
        const line = scene.children.find((c) => c instanceof THREE.Line) as THREE.Line;

        trail.addPoint(new THREE.Vector3(0, 0, 0));
        trail.addPoint(new THREE.Vector3(10, 0, 0));
        trail.addPoint(new THREE.Vector3(20, 0, 10));

        const attr = line.geometry.getAttribute('position');
        expect(attr).toBeDefined();
        // Catmull-Rom smoothing produces more points than were sampled
        expect(attr.count).toBeGreaterThan(3);
        expect(line.geometry.drawRange.count).toBe(attr.count);

        // The smoothed curve passes through the first and last sampled points
        expect(attr.getX(0)).toBeCloseTo(0, 6);
        expect(attr.getZ(0)).toBeCloseTo(0, 6);
        expect(attr.getX(attr.count - 1)).toBeCloseTo(20, 6);
        expect(attr.getZ(attr.count - 1)).toBeCloseTo(10, 6);
    });
});
