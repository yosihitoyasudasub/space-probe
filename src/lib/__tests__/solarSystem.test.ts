import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Body } from '../physics';
import { createSolarSystem, SOLAR_DEFS, zeroCenterOfMassVelocity, zeroCenterOfMassPosition } from '../solarSystem';

function totalMomentum(bodies: Body[]): [number, number, number] {
    return bodies.reduce(
        (p, b) => [p[0] + b.mass * b.velocity[0], p[1] + b.mass * b.velocity[1], p[2] + b.mass * b.velocity[2]],
        [0, 0, 0]
    );
}

describe('zeroCenterOfMassVelocity', () => {
    it('zeroes total momentum while preserving relative velocities', () => {
        const bodies: Body[] = [
            { id: 'a', mass: 2, position: [0, 0, 0], velocity: [1, 0, 0] },
            { id: 'b', mass: 1, position: [10, 0, 0], velocity: [0, 2, 0] },
        ];
        const relBefore = [
            bodies[1].velocity[0] - bodies[0].velocity[0],
            bodies[1].velocity[1] - bodies[0].velocity[1],
            bodies[1].velocity[2] - bodies[0].velocity[2],
        ];

        zeroCenterOfMassVelocity(bodies);

        const p = totalMomentum(bodies);
        expect(p[0]).toBeCloseTo(0, 10);
        expect(p[1]).toBeCloseTo(0, 10);
        expect(p[2]).toBeCloseTo(0, 10);

        // uniform offset: relative velocity between bodies is unchanged
        expect(bodies[1].velocity[0] - bodies[0].velocity[0]).toBeCloseTo(relBefore[0], 10);
        expect(bodies[1].velocity[1] - bodies[0].velocity[1]).toBeCloseTo(relBefore[1], 10);
        expect(bodies[1].velocity[2] - bodies[0].velocity[2]).toBeCloseTo(relBefore[2], 10);
    });
});

describe('zeroCenterOfMassPosition', () => {
    it('moves the center of mass to the origin while preserving relative geometry', () => {
        const bodies: Body[] = [
            { id: 'a', mass: 3, position: [10, 0, 0], velocity: [0, 0, 0] },
            { id: 'b', mass: 1, position: [10, 0, 40], velocity: [0, 0, 0] },
        ];

        zeroCenterOfMassPosition(bodies);

        const com = bodies.reduce(
            (c, b) => [c[0] + b.mass * b.position[0], c[1] + b.mass * b.position[1], c[2] + b.mass * b.position[2]],
            [0, 0, 0]
        );
        expect(com[0]).toBeCloseTo(0, 10);
        expect(com[1]).toBeCloseTo(0, 10);
        expect(com[2]).toBeCloseTo(0, 10);

        // uniform shift: distance between bodies is unchanged
        const dx = bodies[1].position[0] - bodies[0].position[0];
        const dz = bodies[1].position[2] - bodies[0].position[2];
        expect(Math.sqrt(dx * dx + dz * dz)).toBeCloseTo(40, 10);
    });
});

describe('createSolarSystem', () => {
    const G = 0.133;
    const starMass = 333000;

    it('creates the star and one body plus mesh per planet', () => {
        const scene = new THREE.Scene();
        const { bodies, starMesh, planets } = createSolarSystem(scene, { starMass, G });

        expect(bodies).toHaveLength(1 + SOLAR_DEFS.length);
        expect(bodies[0]).toMatchObject({ id: 'star', mass: starMass });
        expect(planets).toHaveLength(SOLAR_DEFS.length);
        expect(scene.children).toContain(starMesh);
        for (const pm of planets) {
            expect(scene.children).toContain(pm.mesh);
            expect(scene.children).toContain(pm.influenceZone);
        }
    });

    it('gives each planet circular orbit speed sqrt(G*M/r) tangent to its radius', () => {
        const scene = new THREE.Scene();
        const { bodies } = createSolarSystem(scene, { starMass, G });

        for (const pd of SOLAR_DEFS) {
            const body = bodies.find((b) => b.id === pd.id)!;
            const r = Math.sqrt(body.position[0] ** 2 + body.position[2] ** 2);
            expect(r).toBeCloseTo(pd.rAU * 100, 6);

            const speed = Math.sqrt(body.velocity[0] ** 2 + body.velocity[2] ** 2);
            expect(speed).toBeCloseTo(Math.sqrt((G * starMass) / r), 6);

            // velocity is perpendicular to the radius vector (circular orbit)
            const dot = body.position[0] * body.velocity[0] + body.position[2] * body.velocity[2];
            expect(dot).toBeCloseTo(0, 6);
        }
    });
});
