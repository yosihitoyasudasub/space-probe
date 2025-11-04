// This physics module avoids direct dependence on three.js types so it can be
// unit-tested and reused. Positions/velocities are plain number tuples [x,y,z].

// ====================================================================
// Physics Constants
// ====================================================================
// These constants define the core physical parameters of the simulation.
// All values use the scaled unit system defined in threeSetup.ts:PHYSICS_SCALE

export const PHYSICS_CONSTANTS = {
    // Minimum vector length threshold to avoid division by zero in normalization
    MIN_VECTOR_LENGTH: 1e-12,

    // Default gravitational constant (dimensionless, scaled for game units)
    // This should match PHYSICS_SCALE.G from threeSetup.ts
    DEFAULT_G: 1.0,

    // Softening length (scene units) to prevent singularities in gravity calculations
    // When bodies get very close, softening smooths out the 1/r^2 force to prevent
    // infinite accelerations. Typical value: 0.1 scene units (≈0.001 AU)
    DEFAULT_SOFTENING: 0.1,

    // Velocity Verlet / Leapfrog integration half-step coefficient
    // This is an algorithmic constant (always 0.5 for this integrator)
    LEAPFROG_HALF_STEP: 0.5,

    // Minimum mass threshold (in Earth masses) to be considered in calculations
    // Bodies with mass below this are treated as massless (e.g., probes)
    MIN_PLANET_MASS: 1e-6,

    // Default swing-by detection parameters
    DEFAULT_SWING_BY_OPTIONS: {
        // Encounter radius = planet.radius * encounterMultiplier
        // Larger values make swing-by detection more forgiving
        encounterMultiplier: 2.5,

        // Minimum speed increase (scene units/s) to count as a swing-by
        // Lower values detect weaker gravity assists
        deltaVThreshold: 0.05,

        // Cooldown time (seconds) before the same body can trigger another swing-by
        // Prevents multiple rapid detections during a single flyby
        minGap: 0.5
    }
} as const;

export type Vec3 = [number, number, number];

export type Body = {
    id: string;
    mass: number;
    position: Vec3;
    velocity: Vec3;
    radius?: number; // visual / encounter radius
    isProbe?: boolean;
    isStatic?: boolean; // if true, body should not be moved by simulation (e.g., sun)
    _lastEncounterAt?: number;
};

export type StepResult = {
    bodies: Body[];
    events: { swingBys: Array<{ probeId: string; bodyId: string; deltaV: number; time: number }> };
};

function vecClone(v: Vec3): Vec3 {
    return [v[0], v[1], v[2]];
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecSub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecScale(a: Vec3, s: number): Vec3 {
    return [a[0] * s, a[1] * s, a[2] * s];
}

function vecLenSq(a: Vec3): number {
    return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

function vecLen(a: Vec3): number {
    return Math.sqrt(vecLenSq(a));
}

function vecNormalize(a: Vec3): Vec3 {
    const l = vecLen(a) || PHYSICS_CONSTANTS.MIN_VECTOR_LENGTH;
    return [a[0] / l, a[1] / l, a[2] / l];
}

export function cloneBodies(bodies: Body[]) {
    return bodies.map((b) => ({ ...b, position: vecClone(b.position), velocity: vecClone(b.velocity), _lastEncounterAt: b._lastEncounterAt || 0, isStatic: b.isStatic }));
}

// Leapfrog / velocity-Verlet style integrator for N-body
export type SwingByOptions = {
    encounterMultiplier?: number; // multiplies body.radius to form encounter distance
    deltaVThreshold?: number; // minimum positive delta-v to count as swing-by
    minGap?: number; // seconds before same body can trigger again
};

export function stepBodies(origBodies: Body[], dt: number, G: number = PHYSICS_CONSTANTS.DEFAULT_G, simTime: number = 0, softening: number = PHYSICS_CONSTANTS.DEFAULT_SOFTENING, opts?: SwingByOptions): StepResult {
    const bodies = cloneBodies(origBodies);
    const n = bodies.length;

    // compute accelerations at current positions
    const accs: Vec3[] = new Array(n).fill(0).map(() => [0, 0, 0]);

    const computeAcc = (i: number, positions: Vec3[]) => {
        let ax = 0,
            ay = 0,
            az = 0;
        const pi = positions[i];
        if (bodies[i].isStatic) return [0, 0, 0] as Vec3;
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const pj = positions[j];
            const rx = pj[0] - pi[0];
            const ry = pj[1] - pi[1];
            const rz = pj[2] - pi[2];
            const dist2 = rx * rx + ry * ry + rz * rz + softening * softening;
            const invDist = 1.0 / Math.sqrt(dist2);
            const invDist3 = invDist / dist2; // 1/r^3
            const s = G * bodies[j].mass * invDist3;
            ax += rx * s;
            ay += ry * s;
            az += rz * s;
        }
        return [ax, ay, az] as Vec3;
    };

    const positions = bodies.map((b) => vecClone(b.position));
    for (let i = 0; i < n; i++) accs[i] = computeAcc(i, positions);

    // half-step velocity
    const vHalf: Vec3[] = new Array(n).fill(0).map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
        if (bodies[i].isStatic) {
            vHalf[i] = vecClone(bodies[i].velocity);
            continue;
        }
        vHalf[i] = vecAdd(bodies[i].velocity, vecScale(accs[i], dt * PHYSICS_CONSTANTS.LEAPFROG_HALF_STEP));
        // full-step position
        bodies[i].position = vecAdd(bodies[i].position, vecScale(vHalf[i], dt));
    }

    // accelerations at new positions
    const newPositions = bodies.map((b) => vecClone(b.position));
    const accsNew: Vec3[] = new Array(n).fill(0).map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) accsNew[i] = computeAcc(i, newPositions);

    // finish velocity
    for (let i = 0; i < n; i++) {
        if (bodies[i].isStatic) continue;
        bodies[i].velocity = vecAdd(vHalf[i], vecScale(accsNew[i], dt * PHYSICS_CONSTANTS.LEAPFROG_HALF_STEP));
    }

    const events: StepResult['events'] = { swingBys: [] };

    // swing-by detection: probe close pass and positive delta speed
    for (let i = 0; i < n; i++) {
        if (!bodies[i].isProbe) continue;
        const probe = bodies[i];
        const speedBefore = vecLen(vHalf[i]);
        const speedAfter = vecLen(probe.velocity);
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const other = bodies[j];
            if (other.mass < PHYSICS_CONSTANTS.MIN_PLANET_MASS) continue;
            const rx = probe.position[0] - other.position[0];
            const ry = probe.position[1] - other.position[1];
            const rz = probe.position[2] - other.position[2];
            const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
            const encounterMultiplier = opts?.encounterMultiplier ?? PHYSICS_CONSTANTS.DEFAULT_SWING_BY_OPTIONS.encounterMultiplier;
            const deltaVThreshold = opts?.deltaVThreshold ?? PHYSICS_CONSTANTS.DEFAULT_SWING_BY_OPTIONS.deltaVThreshold;
            const gap = opts?.minGap ?? PHYSICS_CONSTANTS.DEFAULT_SWING_BY_OPTIONS.minGap;
            const encounterRadius = Math.max((other.radius || 1) * encounterMultiplier, 1.0);
            const lastAt = other._lastEncounterAt || 0;
            if (dist <= encounterRadius && simTime - lastAt > gap) {
                const deltaV = speedAfter - speedBefore;
                if (deltaV > deltaVThreshold) {
                    events.swingBys.push({ probeId: probe.id, bodyId: other.id, deltaV, time: simTime });
                    other._lastEncounterAt = simTime;
                }
            }
        }
    }

    return { bodies, events };
}
