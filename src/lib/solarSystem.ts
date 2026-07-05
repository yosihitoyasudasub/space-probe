import * as THREE from 'three';
import { Body } from './physics';
import { PHYSICS_SCALE, SWING_BY_OPTIONS } from './constants';

export type SolarDef = {
    id: string;
    rAU: number;
    radius: number;
    color: number;
    phase: number;
    mass: number;
};

// Solar system-like planets (units: 1 AU = 100 scene units)
export const SOLAR_DEFS: SolarDef[] = [
    { id: 'Mercury', rAU: 0.39, radius: 3, color: 0xaaaaaa, phase: 0, mass: 0.055 },
    { id: 'Venus',   rAU: 0.72, radius: 5, color: 0xffddaa, phase: 0.5, mass: 0.815 },
    { id: 'Earth',   rAU: 1.00, radius: 5.5, color: 0x3366ff, phase: 1.0, mass: 1.0 },
    { id: 'Mars',    rAU: 1.52, radius: 4, color: 0xff6633, phase: 1.6, mass: 0.107 },
    { id: 'Jupiter', rAU: 5.20, radius: 14, color: 0xffcc77, phase: 2.2, mass: 317.8 },
    { id: 'Saturn',  rAU: 9.58, radius: 12, color: 0xffee88, phase: 3.0, mass: 95.16 },
    { id: 'Uranus',  rAU:19.20, radius: 9, color: 0x88ccff, phase: 4.0, mass: 14.5 },
    { id: 'Neptune', rAU:30.05, radius: 9, color: 0x3366aa, phase: 5.0, mass: 17.1 },
];

export type PlanetEntry = {
    id: string;
    def: SolarDef;
    mesh: THREE.Mesh;
    influenceZone: THREE.Mesh;
};

export type SolarSystem = {
    bodies: Body[];
    starMesh: THREE.Mesh;
    planets: PlanetEntry[];
};

/**
 * Create the central star and planets: meshes, physics bodies with circular
 * orbit velocities, per-planet orbit lines, and swing-by influence zones.
 */
export function createSolarSystem(scene: THREE.Scene, opts: { starMass: number; G: number }): SolarSystem {
    const bodies: Body[] = [];
    const planets: PlanetEntry[] = [];

    // central star at origin
    const starGeom = new THREE.SphereGeometry(5, 24, 24);
    const starMat = new THREE.MeshStandardMaterial({
        color: 0xffee88,
        emissive: 0xffaa00,  // Bright orange emissive for bloom effect
        emissiveIntensity: 2.5  // Strong emissive intensity for bloom
    });
    const starMesh = new THREE.Mesh(starGeom, starMat);
    starMesh.position.set(0, 0, 0);
    scene.add(starMesh);
    // allow the star to move under gravity (COM-zero velocities applied by caller)
    bodies.push({ id: 'star', mass: opts.starMass, position: [0, 0, 0], velocity: [0, 0, 0], radius: 5, isProbe: false });

    const AU = PHYSICS_SCALE.AU;
    for (const pd of SOLAR_DEFS) {
        const pdR = pd.rAU * AU;
        const geom = new THREE.SphereGeometry(pd.radius, 16, 16);
        const mat = new THREE.MeshStandardMaterial({ color: pd.color });
        const mesh = new THREE.Mesh(geom, mat);
        const x = Math.sin(pd.phase) * pdR;
        const z = Math.cos(pd.phase) * pdR;
        mesh.position.set(x, 0, z);
        scene.add(mesh);

        // circular orbit velocity around the star
        const v = Math.sqrt((opts.G * opts.starMass) / pdR);
        const vx = v * Math.cos(pd.phase);
        const vz = -v * Math.sin(pd.phase);
        bodies.push({ id: pd.id, mass: pd.mass, position: [x, 0, z], velocity: [vx, 0, vz], radius: pd.radius });

        planets.push({ id: pd.id, def: pd, mesh, influenceZone: createInfluenceZone(scene, pd, mesh.position) });
    }

    createOrbitLines(scene);

    return { bodies, starMesh, planets };
}

// ====================================================================
// Swing-by Influence Zones Visualization
// ====================================================================
// Display encounter radius around each planet as a torus (donut ring)
function createInfluenceZone(scene: THREE.Scene, pd: SolarDef, position: THREE.Vector3): THREE.Mesh {
    const encounterRadius = pd.radius * SWING_BY_OPTIONS.encounterMultiplier;

    const torusGeometry = new THREE.TorusGeometry(
        encounterRadius,           // radius
        encounterRadius * 0.08,    // tube thickness (8% of radius)
        8,                         // radial segments
        64                         // tubular segments
    );

    const torusMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
    });

    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    // Rotate to align with XZ plane (horizontal)
    torus.rotation.x = Math.PI / 2;
    torus.position.copy(position);
    scene.add(torus);
    return torus;
}

// ====================================================================
// Planetary Orbit Visualization
// ====================================================================
// Display circular orbits for each planet
function createOrbitLines(scene: THREE.Scene): THREE.Line[] {
    const orbitLines: THREE.Line[] = [];

    for (const pd of SOLAR_DEFS) {
        const orbitRadius = pd.rAU * PHYSICS_SCALE.AU;
        const segments = 128; // Number of points in the circle
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
        }

        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: pd.color,
            transparent: true,
            opacity: 0.3,
            linewidth: 1
        });

        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbitLine);
        orbitLines.push(orbitLine);
    }

    return orbitLines;
}

// --- CENTER-OF-MASS (COM) velocity zeroing ---
// Compute total momentum and apply a uniform velocity offset so total
// momentum is zero. This keeps the system's center-of-mass stationary
// while allowing the star to move.
export function zeroCenterOfMassVelocity(bodies: Body[]): void {
    let totalPx = 0, totalPy = 0, totalPz = 0;
    let totalMass = 0;
    for (const b of bodies) {
        totalPx += b.mass * b.velocity[0];
        totalPy += b.mass * b.velocity[1];
        totalPz += b.mass * b.velocity[2];
        totalMass += b.mass;
    }
    if (totalMass > 0) {
        const vx = totalPx / totalMass;
        const vy = totalPy / totalMass;
        const vz = totalPz / totalMass;
        for (const b of bodies) {
            b.velocity[0] -= vx;
            b.velocity[1] -= vy;
            b.velocity[2] -= vz;
        }
        console.log('COM-zero velocity applied, offset:', vx.toFixed(6), vy.toFixed(6), vz.toFixed(6));
    }
}

// --- CENTER-OF-MASS (COM) position zeroing ---
// Shift all body positions so that the center-of-mass position is at the origin.
export function zeroCenterOfMassPosition(bodies: Body[]): void {
    let mx = 0, my = 0, mz = 0;
    let totalMass = 0;
    for (const b of bodies) {
        mx += b.mass * b.position[0];
        my += b.mass * b.position[1];
        mz += b.mass * b.position[2];
        totalMass += b.mass;
    }
    if (totalMass > 0) {
        const cx = mx / totalMass;
        const cy = my / totalMass;
        const cz = mz / totalMass;
        for (const b of bodies) {
            b.position[0] -= cx;
            b.position[1] -= cy;
            b.position[2] -= cz;
        }
        console.log('COM-zero position applied:', cx.toFixed(3), cy.toFixed(3), cz.toFixed(3));
    }
}
