// This physics module avoids direct dependence on three.js types so it can be
// unit-tested and reused. Positions/velocities are plain number tuples [x,y,z].

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
    const l = vecLen(a) || 1e-12;
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

export function stepBodies(origBodies: Body[], dt: number, G = 1.0, simTime = 0, softening = 0.1, opts?: SwingByOptions): StepResult {
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
        vHalf[i] = vecAdd(bodies[i].velocity, vecScale(accs[i], dt * 0.5));
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
        bodies[i].velocity = vecAdd(vHalf[i], vecScale(accsNew[i], dt * 0.5));
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
            if (other.mass < 1e-6) continue;
            const rx = probe.position[0] - other.position[0];
            const ry = probe.position[1] - other.position[1];
            const rz = probe.position[2] - other.position[2];
            const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
            const encounterMultiplier = opts?.encounterMultiplier ?? 2.5;
            const deltaVThreshold = opts?.deltaVThreshold ?? 0.05;
            const gap = opts?.minGap ?? 0.5;
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
