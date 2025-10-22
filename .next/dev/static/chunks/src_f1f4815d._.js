(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/physics.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// This physics module avoids direct dependence on three.js types so it can be
// unit-tested and reused. Positions/velocities are plain number tuples [x,y,z].
__turbopack_context__.s([
    "cloneBodies",
    ()=>cloneBodies,
    "stepBodies",
    ()=>stepBodies
]);
function vecClone(v) {
    return [
        v[0],
        v[1],
        v[2]
    ];
}
function vecAdd(a, b) {
    return [
        a[0] + b[0],
        a[1] + b[1],
        a[2] + b[2]
    ];
}
function vecSub(a, b) {
    return [
        a[0] - b[0],
        a[1] - b[1],
        a[2] - b[2]
    ];
}
function vecScale(a, s) {
    return [
        a[0] * s,
        a[1] * s,
        a[2] * s
    ];
}
function vecLenSq(a) {
    return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}
function vecLen(a) {
    return Math.sqrt(vecLenSq(a));
}
function vecNormalize(a) {
    const l = vecLen(a) || 1e-12;
    return [
        a[0] / l,
        a[1] / l,
        a[2] / l
    ];
}
function cloneBodies(bodies) {
    return bodies.map((b)=>({
            ...b,
            position: vecClone(b.position),
            velocity: vecClone(b.velocity),
            _lastEncounterAt: b._lastEncounterAt || 0,
            isStatic: b.isStatic
        }));
}
function stepBodies(origBodies, dt, G = 1.0, simTime = 0, softening = 0.1, opts) {
    const bodies = cloneBodies(origBodies);
    const n = bodies.length;
    // compute accelerations at current positions
    const accs = new Array(n).fill(0).map(()=>[
            0,
            0,
            0
        ]);
    const computeAcc = (i, positions)=>{
        let ax = 0, ay = 0, az = 0;
        const pi = positions[i];
        if (bodies[i].isStatic) return [
            0,
            0,
            0
        ];
        for(let j = 0; j < n; j++){
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
        return [
            ax,
            ay,
            az
        ];
    };
    const positions = bodies.map((b)=>vecClone(b.position));
    for(let i = 0; i < n; i++)accs[i] = computeAcc(i, positions);
    // half-step velocity
    const vHalf = new Array(n).fill(0).map(()=>[
            0,
            0,
            0
        ]);
    for(let i = 0; i < n; i++){
        if (bodies[i].isStatic) {
            vHalf[i] = vecClone(bodies[i].velocity);
            continue;
        }
        vHalf[i] = vecAdd(bodies[i].velocity, vecScale(accs[i], dt * 0.5));
        // full-step position
        bodies[i].position = vecAdd(bodies[i].position, vecScale(vHalf[i], dt));
    }
    // accelerations at new positions
    const newPositions = bodies.map((b)=>vecClone(b.position));
    const accsNew = new Array(n).fill(0).map(()=>[
            0,
            0,
            0
        ]);
    for(let i = 0; i < n; i++)accsNew[i] = computeAcc(i, newPositions);
    // finish velocity
    for(let i = 0; i < n; i++){
        if (bodies[i].isStatic) continue;
        bodies[i].velocity = vecAdd(vHalf[i], vecScale(accsNew[i], dt * 0.5));
    }
    const events = {
        swingBys: []
    };
    // swing-by detection: probe close pass and positive delta speed
    for(let i = 0; i < n; i++){
        if (!bodies[i].isProbe) continue;
        const probe = bodies[i];
        const speedBefore = vecLen(vHalf[i]);
        const speedAfter = vecLen(probe.velocity);
        for(let j = 0; j < n; j++){
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
                    events.swingBys.push({
                        probeId: probe.id,
                        bodyId: other.id,
                        deltaV,
                        time: simTime
                    });
                    other._lastEncounterAt = simTime;
                }
            }
        }
    }
    return {
        bodies,
        events
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/threeSetup.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_G",
    ()=>DEFAULT_G,
    "PHYSICS_SCALE",
    ()=>PHYSICS_SCALE,
    "applyDeltaVToProbe",
    ()=>applyDeltaVToProbe,
    "default",
    ()=>__TURBOPACK__default__export__,
    "initThreeJS",
    ()=>initThreeJS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.module.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/controls/OrbitControls.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/physics.ts [app-client] (ecmascript)");
;
;
;
const PHYSICS_SCALE = {
    // Mass scale: Earth mass = 1.0
    EARTH_MASS: 1.0,
    SUN_MASS: 333000,
    // Distance scale: 1 AU = 100 scene units
    AU: 100,
    // Time scale: ~1 million times faster than reality
    // (Earth completes orbit in ~30 seconds instead of 365 days)
    TIME_SCALE: 1e6,
    // Gravity constant adjusted for our unit system
    // This value gives realistic orbital mechanics with scaled time
    G: 0.133,
    // Velocity conversion: scene units/sec to km/s
    // Based on Earth orbital velocity: ~21 scene units/sec = 30 km/s (real)
    VELOCITY_TO_KM_PER_SEC: 1.43,
    // Fuel consumption rate: % consumed per unit delta-v
    // With dvScale = 0.02, single direction thrust consumes 0.02% per frame
    // Total fuel = 100%, allows ~5000 frames (~83 seconds at 60fps) of continuous thrust
    FUEL_CONSUMPTION_RATE: 1.0
};
const DEFAULT_G = PHYSICS_SCALE.G;
function initThreeJS(canvas, options) {
    const scene = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Scene"]();
    const camera = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PerspectiveCamera"](60, window.innerWidth / window.innerHeight, 0.1, 50000);
    camera.position.set(0, 400, 2200);
    const renderer = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WebGLRenderer"]({
        canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const ambient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AmbientLight"](0xffffff, 0.6);
    scene.add(ambient);
    const directional = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DirectionalLight"](0xffffff, 0.8);
    directional.position.set(5, 10, 7.5);
    scene.add(directional);
    // Simple grid for reference (large enough to show outer planets)
    const grid = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GridHelper"](7000, 140, 0x444444, 0x222222);
    scene.add(grid);
    // Create a list of bodies: central star, planets, probe
    const bodies = [];
    const planetMeshes = [];
    // central star at origin (can be overridden via options)
    const starMass = options?.starMass ?? PHYSICS_SCALE.SUN_MASS;
    const starGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SphereGeometry"](5, 24, 24);
    const starMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0xffee88,
        emissive: 0x220000
    });
    const starMesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mesh"](starGeom, starMat);
    starMesh.position.set(0, 0, 0);
    scene.add(starMesh);
    // allow the star to move under gravity (we'll initialize COM-zero velocities below)
    bodies.push({
        id: 'star',
        mass: starMass,
        position: [
            0,
            0,
            0
        ],
        velocity: [
            0,
            0,
            0
        ],
        radius: 5,
        isProbe: false
    });
    // Solar system-like planets (units: 1 AU = 100 scene units)
    const AU = PHYSICS_SCALE.AU;
    const solarDefs = [
        {
            id: 'Mercury',
            rAU: 0.39,
            radius: 3,
            color: 0xaaaaaa,
            phase: 0,
            mass: 0.055
        },
        {
            id: 'Venus',
            rAU: 0.72,
            radius: 5,
            color: 0xffddaa,
            phase: 0.5,
            mass: 0.815
        },
        {
            id: 'Earth',
            rAU: 1.00,
            radius: 5.5,
            color: 0x3366ff,
            phase: 1.0,
            mass: 1.0
        },
        {
            id: 'Mars',
            rAU: 1.52,
            radius: 4,
            color: 0xff6633,
            phase: 1.6,
            mass: 0.107
        },
        {
            id: 'Jupiter',
            rAU: 5.20,
            radius: 14,
            color: 0xffcc77,
            phase: 2.2,
            mass: 317.8
        },
        {
            id: 'Saturn',
            rAU: 9.58,
            radius: 12,
            color: 0xffee88,
            phase: 3.0,
            mass: 95.16
        },
        {
            id: 'Uranus',
            rAU: 19.20,
            radius: 9,
            color: 0x88ccff,
            phase: 4.0,
            mass: 14.5
        },
        {
            id: 'Neptune',
            rAU: 30.05,
            radius: 9,
            color: 0x3366aa,
            phase: 5.0,
            mass: 17.1
        }
    ];
    const starMassScaled = starMass; // use starMass as mass scale
    for (const pd of solarDefs){
        const pdR = pd.rAU * AU;
        const geom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SphereGeometry"](pd.radius, 16, 16);
        const mat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
            color: pd.color
        });
        const mesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mesh"](geom, mat);
        const x = Math.sin(pd.phase) * pdR;
        const z = Math.cos(pd.phase) * pdR;
        mesh.position.set(x, 0, z);
        scene.add(mesh);
        planetMeshes.push({
            id: pd.id,
            mesh
        });
        const gVal = options?.G ?? DEFAULT_G;
        const v = Math.sqrt(gVal * starMassScaled / pdR);
        const vx = v * Math.cos(pd.phase);
        const vz = -v * Math.sin(pd.phase);
        bodies.push({
            id: pd.id,
            mass: pd.mass,
            position: [
                x,
                0,
                z
            ],
            velocity: [
                vx,
                0,
                vz
            ],
            radius: pd.radius
        });
    }
    // probe initial (starts at 1.0 AU - Earth orbit distance)
    const probeGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SphereGeometry"](0.6, 10, 10);
    const probeMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0xffaa00
    });
    const probe = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mesh"](probeGeom, probeMat);
    const probeR = 100; // 1.0 AU (same as Earth orbit)
    probe.position.set(0, 0, probeR);
    scene.add(probe);
    const gVal = options?.G ?? DEFAULT_G;
    const probeMult = options?.probeSpeedMult ?? 1.05; // Realistic escape velocity (5% above circular)
    const vCircular = Math.sqrt(gVal * starMass / probeR);
    const probeBody = {
        id: 'probe',
        mass: 1,
        position: [
            0,
            0,
            probeR
        ],
        velocity: [
            vCircular * probeMult,
            0,
            0
        ],
        radius: 0.6,
        isProbe: true
    };
    bodies.push(probeBody);
    // --- CENTER-OF-MASS (COM) velocity zeroing ---
    // After creating all bodies, compute total momentum and apply a uniform
    // velocity offset so total momentum is zero. This keeps the system's
    // center-of-mass stationary while allowing the star to move.
    (function zeroCOM() {
        let totalPx = 0, totalPy = 0, totalPz = 0;
        let totalMass = 0;
        for (const b of bodies){
            totalPx += b.mass * b.velocity[0];
            totalPy += b.mass * b.velocity[1];
            totalPz += b.mass * b.velocity[2];
            totalMass += b.mass;
        }
        if (totalMass > 0) {
            const vx = totalPx / totalMass;
            const vy = totalPy / totalMass;
            const vz = totalPz / totalMass;
            // subtract COM velocity from each body so net momentum becomes zero
            for (const b of bodies){
                b.velocity[0] -= vx;
                b.velocity[1] -= vy;
                b.velocity[2] -= vz;
            }
            console.log('COM-zero velocity applied, offset:', vx.toFixed(6), vy.toFixed(6), vz.toFixed(6));
        }
    })();
    // (COM position zeroing will be performed once after state is created)
    // OrbitControls for interactive camera
    const controls = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["OrbitControls"](camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.update();
    // ====================================================================
    // Star Field for Speed Sensation
    // ====================================================================
    // Create background stars with color variation for visual depth
    function createStarField() {
        const starCount = 8000;
        const starGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferGeometry"]();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        for(let i = 0; i < starCount; i++){
            // Position: random spherical distribution
            const radius = 5000 + Math.random() * 10000; // 5000-15000 range
            const theta = Math.random() * Math.PI * 2; // 0-2π
            const phi = Math.acos(2 * Math.random() - 1); // 0-π (uniform sphere)
            starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i * 3 + 2] = radius * Math.cos(phi);
            // Color: mostly white, occasionally bluish or yellowish
            const colorChoice = Math.random();
            if (colorChoice < 0.7) {
                // White
                starColors[i * 3] = 1;
                starColors[i * 3 + 1] = 1;
                starColors[i * 3 + 2] = 1;
            } else if (colorChoice < 0.85) {
                // Bluish white
                starColors[i * 3] = 0.8;
                starColors[i * 3 + 1] = 0.9;
                starColors[i * 3 + 2] = 1;
            } else {
                // Yellowish white
                starColors[i * 3] = 1;
                starColors[i * 3 + 1] = 0.95;
                starColors[i * 3 + 2] = 0.8;
            }
        }
        starGeometry.setAttribute('position', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferAttribute"](starPositions, 3));
        starGeometry.setAttribute('color', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferAttribute"](starColors, 3));
        const starMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PointsMaterial"]({
            size: 2,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });
        const stars = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Points"](starGeometry, starMaterial);
        scene.add(stars);
    }
    createStarField();
    // Trail (orbit path) - sample points stored as Vector3 and rendered smooth via Catmull-Rom
    const trailPoints = [];
    const trailGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferGeometry"]();
    const trailMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineBasicMaterial"]({
        color: 0x00ff88
    });
    const trailLine = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"](trailGeometry, trailMaterial);
    scene.add(trailLine);
    function addTrailPoint(p) {
        const maxPoints = 2000;
        trailPoints.push(p.clone());
        if (trailPoints.length > maxPoints) {
            trailPoints.shift();
        }
        if (trailPoints.length >= 2) {
            const curve = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CatmullRomCurve3"](trailPoints, false, 'catmullrom', 0.5);
            const divisions = Math.min(Math.max(trailPoints.length * 6, 64), 3000);
            const smoothPoints = curve.getPoints(divisions);
            const positions = [];
            for(let i = 0; i < smoothPoints.length; i++){
                positions.push(smoothPoints[i].x, smoothPoints[i].y, smoothPoints[i].z);
            }
            trailGeometry.setAttribute('position', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Float32BufferAttribute"](positions, 3));
            trailGeometry.setDrawRange(0, positions.length / 3);
            trailGeometry.computeBoundingSphere();
        }
    }
    // ====================================================================
    // Velocity Vector Visualization
    // ====================================================================
    // Display probe's velocity as an arrow (direction and magnitude)
    const velocityArrow = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ArrowHelper"](new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"](1, 0, 0), probe.position, 10, 0xff0000, 3, 2 // head width
    );
    scene.add(velocityArrow);
    function updateVelocityArrow() {
        const speed = state.velocity.length();
        if (speed > 0.001) {
            const direction = state.velocity.clone().normalize();
            velocityArrow.setDirection(direction);
            // Scale arrow length with speed (but cap at reasonable size)
            const arrowLength = Math.min(speed * 2, 50);
            velocityArrow.setLength(arrowLength, 3, 2);
            // Color based on speed (blue -> green -> yellow -> red)
            const speedRatio = Math.min(speed / 50, 1); // normalize to 0-1
            if (speedRatio < 0.33) {
                // Blue to green
                const t = speedRatio / 0.33;
                velocityArrow.setColor(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Color"](0, t, 1 - t));
            } else if (speedRatio < 0.66) {
                // Green to yellow
                const t = (speedRatio - 0.33) / 0.33;
                velocityArrow.setColor(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Color"](t, 1, 0));
            } else {
                // Yellow to red
                const t = (speedRatio - 0.66) / 0.34;
                velocityArrow.setColor(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Color"](1, 1 - t, 0));
            }
            velocityArrow.position.copy(state.position);
            velocityArrow.visible = true;
        } else {
            velocityArrow.visible = false;
        }
    }
    // ====================================================================
    // Swing-by Influence Zones Visualization
    // ====================================================================
    // Display encounter radius around each planet as a torus (donut ring)
    const influenceZones = [];
    for (const pm of planetMeshes){
        const planetData = solarDefs.find((pd)=>pd.id === pm.id);
        if (!planetData) continue;
        const encounterRadius = planetData.radius * 2.5; // encounterMultiplier
        // Create torus (ring)
        const torusGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TorusGeometry"](encounterRadius, encounterRadius * 0.08, 8, 64 // tubular segments
        );
        const torusMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MeshBasicMaterial"]({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.25,
            side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DoubleSide"]
        });
        const torus = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mesh"](torusGeometry, torusMaterial);
        // Rotate to align with XZ plane (horizontal)
        torus.rotation.x = Math.PI / 2;
        torus.position.copy(pm.mesh.position);
        scene.add(torus);
        influenceZones.push(torus);
        // Store reference for updating position
        pm.influenceZone = torus;
    }
    // ====================================================================
    // Planetary Orbit Visualization
    // ====================================================================
    // Display circular orbits for each planet
    const orbitLines = [];
    for (const pd of solarDefs){
        const orbitRadius = pd.rAU * AU;
        const segments = 128; // Number of points in the circle
        const points = [];
        // Create circle points
        for(let i = 0; i <= segments; i++){
            const theta = i / segments * Math.PI * 2;
            const x = Math.cos(theta) * orbitRadius;
            const z = Math.sin(theta) * orbitRadius;
            points.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"](x, 0, z));
        }
        // Create line geometry
        const orbitGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferGeometry"]().setFromPoints(points);
        const orbitMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineBasicMaterial"]({
            color: pd.color,
            transparent: true,
            opacity: 0.3,
            linewidth: 1
        });
        const orbitLine = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"](orbitGeometry, orbitMaterial);
        scene.add(orbitLine);
        orbitLines.push(orbitLine);
    }
    // ====================================================================
    // Predicted Trajectory Visualization (Phase 2)
    // ====================================================================
    // Display future trajectory based on current velocity and gravity
    const predictionPoints = [];
    const predictionGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BufferGeometry"]();
    const predictionMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineDashedMaterial"]({
        color: 0xffaa00,
        dashSize: 3,
        gapSize: 2,
        linewidth: 1,
        transparent: true,
        opacity: 0.6
    });
    const predictionLine = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"](predictionGeometry, predictionMaterial);
    scene.add(predictionLine);
    // Success prediction indicators (text sprites near planets)
    const successIndicators = [];
    function createTextSprite(text, color = 0xffffff) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        context.font = 'Bold 48px Arial';
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 64);
        const texture = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CanvasTexture"](canvas);
        const spriteMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SpriteMaterial"]({
            map: texture,
            transparent: true
        });
        const sprite = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sprite"](spriteMaterial);
        sprite.scale.set(20, 10, 1);
        return sprite;
    }
    // Create success indicators for each planet
    for (const pm of planetMeshes){
        const sprite = createTextSprite('', 0x00ff00);
        sprite.visible = false;
        scene.add(sprite);
        successIndicators.push({
            planetId: pm.id,
            mesh: sprite,
            probability: 0
        });
    }
    let lastPredictionUpdate = 0;
    const predictionUpdateInterval = 500; // Update every 500ms
    function updatePredictedTrajectory() {
        const now = performance.now();
        if (now - lastPredictionUpdate < predictionUpdateInterval) return;
        lastPredictionUpdate = now;
        // Clone current bodies state for prediction
        const predictedBodies = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneBodies"])(bodies);
        const probeIndex = predictedBodies.findIndex((b)=>b.id === 'probe');
        if (probeIndex < 0) return;
        // Run simulation forward for predictionTime seconds
        const predictionTime = 15; // seconds
        const predictionSteps = 150; // number of points
        const dt = predictionTime / predictionSteps;
        predictionPoints.length = 0;
        predictionPoints.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"](predictedBodies[probeIndex].position[0], predictedBodies[probeIndex].position[1], predictedBodies[probeIndex].position[2]));
        // Reset success probabilities
        for (const indicator of successIndicators){
            indicator.probability = 0;
        }
        const gRun = options?.G ?? DEFAULT_G;
        let predSimTime = simTime;
        // Simulate future trajectory
        for(let i = 0; i < predictionSteps; i++){
            const { bodies: nextBodies, events } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepBodies"])(predictedBodies, dt, gRun, predSimTime, 0.5, swingOptions);
            predSimTime += dt;
            // Copy nextBodies back to predictedBodies (safely handle type)
            for(let j = 0; j < nextBodies.length; j++){
                predictedBodies[j] = {
                    ...nextBodies[j]
                };
            }
            // Store probe position
            const probePos = predictedBodies[probeIndex].position;
            predictionPoints.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"](probePos[0], probePos[1], probePos[2]));
            // Check for predicted swing-bys
            if (events && events.swingBys && events.swingBys.length > 0) {
                for (const ev of events.swingBys){
                    if (ev.probeId === 'probe') {
                        const indicator = successIndicators.find((ind)=>ind.planetId === ev.bodyId);
                        if (indicator) {
                            // Calculate success probability based on deltaV
                            const probability = Math.min(ev.deltaV / 1.0, 1.0) * 100;
                            indicator.probability = Math.max(indicator.probability, probability);
                        }
                    }
                }
            }
        }
        // Update prediction line geometry
        if (predictionPoints.length >= 2) {
            const positions = [];
            for (const point of predictionPoints){
                positions.push(point.x, point.y, point.z);
            }
            predictionGeometry.setAttribute('position', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Float32BufferAttribute"](positions, 3));
            predictionGeometry.computeBoundingSphere();
            predictionLine.computeLineDistances(); // Required for dashed lines
            predictionLine.visible = true;
        } else {
            predictionLine.visible = false;
        }
        // Update success indicators
        for (const indicator of successIndicators){
            if (indicator.probability > 0) {
                const pm = planetMeshes.find((p)=>p.id === indicator.planetId);
                if (pm) {
                    // Position indicator above planet
                    const planetData = solarDefs.find((pd)=>pd.id === indicator.planetId);
                    const offset = planetData ? planetData.radius * 4 : 30;
                    indicator.mesh.position.set(pm.mesh.position.x, pm.mesh.position.y + offset, pm.mesh.position.z);
                    // Update text based on probability
                    const probabilityText = `${Math.round(indicator.probability)}%`;
                    const color = indicator.probability > 70 ? 0x00ff00 : indicator.probability > 40 ? 0xffaa00 : 0xff0000;
                    // Update sprite texture
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = 256;
                    canvas.height = 128;
                    context.font = 'Bold 48px Arial';
                    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(probabilityText, 128, 64);
                    const texture = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CanvasTexture"](canvas);
                    indicator.mesh.material.map = texture;
                    indicator.mesh.material.needsUpdate = true;
                    indicator.mesh.visible = true;
                }
            } else {
                indicator.mesh.visible = false;
            }
        }
    }
    // Simulation state derived from bodies: expose probe state for HUD and visual sync
    const state = {
        position: probe.position.clone(),
        velocity: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vector3"](probeBody.velocity[0], probeBody.velocity[1], probeBody.velocity[2]),
        distance: 0,
        fuel: 100,
        slingshots: 0,
        status: 'Idle'
    };
    // --- CENTER-OF-MASS (COM) position zeroing ---
    // Shift all body positions so that the initial center-of-mass position is at the origin.
    (function zeroCOMPosition() {
        let mx = 0, my = 0, mz = 0;
        let totalMass = 0;
        for (const b of bodies){
            mx += b.mass * b.position[0];
            my += b.mass * b.position[1];
            mz += b.mass * b.position[2];
            totalMass += b.mass;
        }
        if (totalMass > 0) {
            const cx = mx / totalMass;
            const cy = my / totalMass;
            const cz = mz / totalMass;
            // subtract COM position from each body's position
            for (const b of bodies){
                b.position[0] -= cx;
                b.position[1] -= cy;
                b.position[2] -= cz;
            }
            // adjust visual meshes to match new positions
            try {
                starMesh.position.set(bodies.find((b)=>b.id === 'star').position[0], bodies.find((b)=>b.id === 'star').position[1], bodies.find((b)=>b.id === 'star').position[2]);
                for (const pm of planetMeshes){
                    const b = bodies.find((bb)=>bb.id === pm.id);
                    if (b) pm.mesh.position.set(b.position[0], b.position[1], b.position[2]);
                }
                // probe
                const pb = bodies.find((b)=>b.id === 'probe');
                if (pb) {
                    probe.position.set(pb.position[0], pb.position[1], pb.position[2]);
                    state.position.copy(probe.position);
                }
            } catch (e) {
            // ignore if meshes not ready
            }
            console.log('COM-zero position applied:', cx.toFixed(3), cy.toFixed(3), cz.toFixed(3));
        }
    })();
    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    window.addEventListener('resize', onResize);
    let simTime = 0;
    // swing-by tuning options (tweak these values)
    // With realistic Sun/planet mass ratios, swing-by effects are smaller for inner planets
    // but significant for gas giants (Jupiter, Saturn). Threshold adjusted accordingly.
    const swingOptions = {
        encounterMultiplier: 2.5,
        deltaVThreshold: 0.01,
        minGap: 0.4 // Shorter cooldown between detections
    };
    // simple visual markers for swing-by events
    const eventMarkers = [];
    function stepSimulation(dt) {
        // call physics.stepBodies with plain-data bodies
        const gRun = options?.G ?? DEFAULT_G;
        const { bodies: nextBodies, events } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepBodies"])(bodies, dt, gRun, simTime, 0.5, swingOptions);
        simTime += dt;
        // apply nextBodies back to visuals and local bodies
        for (const nb of nextBodies){
            const idx = bodies.findIndex((b)=>b.id === nb.id);
            // if the body is marked static (e.g., the central star), don't overwrite its position
            const orig = idx >= 0 ? bodies[idx] : null;
            if (idx >= 0 && !orig?.isStatic) {
                bodies[idx] = nb;
            }
            // apply to mesh
            if (nb.id === 'probe') {
                probe.position.set(nb.position[0], nb.position[1], nb.position[2]);
                state.position.copy(probe.position);
                state.velocity.set(nb.velocity[0], nb.velocity[1], nb.velocity[2]);
                // accumulate distance -- simple approximation
                state.distance += vecLen([
                    nb.velocity[0] * dt,
                    nb.velocity[1] * dt,
                    nb.velocity[2] * dt
                ]);
                // Update status: check fuel first, then velocity
                if (state.fuel <= 0) {
                    state.status = 'Fuel Depleted';
                } else {
                    state.status = state.velocity.length() > 1e-3 ? 'Running' : 'Idle';
                }
            }
            // update planet meshes (check if this body's id is in planetMeshes array)
            const pm = planetMeshes.find((p)=>p.id === nb.id);
            if (pm) {
                pm.mesh.position.set(nb.position[0], nb.position[1], nb.position[2]);
                // Update influence zone position to match planet
                if (pm.influenceZone) {
                    pm.influenceZone.position.copy(pm.mesh.position);
                }
            }
            // (star is now movable) synchronize star mesh to its simulated position
            if (nb.id === 'star') {
                starMesh.position.set(nb.position[0], nb.position[1], nb.position[2]);
            }
        }
        // Update velocity arrow visualization
        updateVelocityArrow();
        // Update predicted trajectory (Phase 2)
        updatePredictedTrajectory();
        // handle events (swing-bys)
        if (events && events.swingBys && events.swingBys.length) {
            for (const ev of events.swingBys){
                if (ev.probeId === 'probe') {
                    state.slingshots += 1;
                    console.log(`Swing-by detected at t=${ev.time.toFixed(2)}: probe around ${ev.bodyId} deltaV=${ev.deltaV.toFixed(3)}`);
                    // find body position for marker
                    const body = nextBodies.find((b)=>b.id === ev.bodyId);
                    if (body) {
                        const markerGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SphereGeometry"](0.8, 8, 8);
                        const markerMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MeshBasicMaterial"]({
                            color: 0xff0000
                        });
                        const marker = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mesh"](markerGeom, markerMat);
                        marker.position.set(body.position[0], body.position[1], body.position[2]);
                        scene.add(marker);
                        eventMarkers.push(marker);
                        // fade out marker after 1.2s
                        setTimeout(()=>{
                            scene.remove(marker);
                            const i = eventMarkers.indexOf(marker);
                            if (i >= 0) eventMarkers.splice(i, 1);
                        }, 1200);
                    }
                    // flash probe material if available
                    try {
                        const mat = probe.material;
                        if (mat && mat.emissive) {
                            const prev = mat.emissive.clone ? mat.emissive.clone() : null;
                            mat.emissive.setHex(0xff4444);
                            setTimeout(()=>{
                                if (prev && mat.emissive && mat.emissive.set) mat.emissive.copy(prev);
                            }, 500);
                        }
                    } catch (e) {
                    // ignore material issues
                    }
                }
            }
        }
    }
    // bind the exported applyDeltaVToProbe to modify the local bodies array
    (function bindApply() {
        const mod = (dv)=>{
            const idx = bodies.findIndex((b)=>b.id === 'probe');
            if (idx >= 0) {
                bodies[idx].velocity[0] += dv[0];
                bodies[idx].velocity[1] += dv[1];
                bodies[idx].velocity[2] += dv[2];
            }
        };
        try {
            // expose on window so consumer code in GameCanvas can call it reliably
            window.__applyDeltaVToProbe = mod;
        } catch (e) {
        // ignore if window isn't available
        }
    })();
    function dispose() {
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        scene.traverse((obj)=>{
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mat = obj.material;
                if (Array.isArray(mat)) mat.forEach((m)=>m.dispose && m.dispose());
                else mat.dispose && mat.dispose();
            }
        });
    }
    return {
        scene,
        camera,
        renderer,
        dispose,
        state,
        probe,
        controls,
        addTrailPoint,
        stepSimulation
    };
}
function applyDeltaVToProbe(_dv) {
    // no-op placeholder; actual implementation bound in initThreeJS's closure
    console.warn('applyDeltaVToProbe called before init; ignoring');
}
// small helper to compute vector length for [x,y,z]
function vecLen(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
const __TURBOPACK__default__export__ = initThreeJS;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/GameCanvas.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/threeSetup.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const GameCanvas = ({ hudSetters, probeSpeedMult = 1.05, gravityG = 1.0, starMass = 4000, cameraView = 'free' })=>{
    _s();
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const rafRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const cameraViewRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(cameraView);
    // Update cameraViewRef when cameraView changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "GameCanvas.useEffect": ()=>{
            cameraViewRef.current = cameraView;
        }
    }["GameCanvas.useEffect"], [
        cameraView
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "GameCanvas.useEffect": ()=>{
            const canvas = canvasRef.current;
            if (!canvas) return;
            const hudUpdateRef = {
                current: undefined
            };
            const trailRef = {
                current: undefined
            };
            // pass simulation tuning options to initThreeJS
            let threeObj = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initThreeJS"](canvas, {
                probeSpeedMult,
                G: gravityG,
                starMass
            });
            let { scene, camera, renderer, dispose, state, probe, controls, addTrailPoint, stepSimulation } = threeObj;
            // input state
            const inputState = {
                left: false,
                right: false,
                up: false,
                down: false
            };
            const onKeyDown = {
                "GameCanvas.useEffect.onKeyDown": (e)=>{
                    if (e.key === 'ArrowLeft') inputState.left = true;
                    if (e.key === 'ArrowRight') inputState.right = true;
                    if (e.key === 'ArrowUp') inputState.up = true;
                    if (e.key === 'ArrowDown') inputState.down = true;
                    if (e.key === 'r' || e.key === 'R') {
                        // restart: dispose and reinit
                        try {
                            if (rafRef.current) cancelAnimationFrame(rafRef.current);
                        } catch (e) {}
                        try {
                            dispose();
                        } catch (e) {}
                        threeObj = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initThreeJS"](canvas, {
                            probeSpeedMult,
                            G: gravityG,
                            starMass
                        });
                        ({ scene, camera, renderer, dispose, state, probe, controls, addTrailPoint, stepSimulation } = threeObj);
                        // Restart animation loop
                        lastTime = performance.now() / 1000;
                        accumulator = 0;
                        rafRef.current = requestAnimationFrame(animate);
                    }
                }
            }["GameCanvas.useEffect.onKeyDown"];
            const onKeyUp = {
                "GameCanvas.useEffect.onKeyUp": (e)=>{
                    if (e.key === 'ArrowLeft') inputState.left = false;
                    if (e.key === 'ArrowRight') inputState.right = false;
                    if (e.key === 'ArrowUp') inputState.up = false;
                    if (e.key === 'ArrowDown') inputState.down = false;
                }
            }["GameCanvas.useEffect.onKeyUp"];
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
            // Fixed timestep physics loop (e.g., 60 Hz)
            const fixedTimeStep = 1 / 60; // seconds
            let accumulator = 0;
            let lastTime = performance.now() / 1000;
            const animate = {
                "GameCanvas.useEffect.animate": ()=>{
                    const now = performance.now() / 1000;
                    let delta = now - lastTime;
                    lastTime = now;
                    // clamp delta to avoid spiral of death
                    if (delta > 0.25) delta = 0.25;
                    accumulator += delta;
                    while(accumulator >= fixedTimeStep){
                        try {
                            // apply input-driven delta-v before stepping
                            const dvScale = 0.02; // tune this for feel (scene-units/sec)
                            let dv = [
                                0,
                                0,
                                0
                            ];
                            // Calculate thrust direction based on current velocity (velocity-relative control)
                            if (state && state.velocity) {
                                const vx = state.velocity.x;
                                const vy = state.velocity.y;
                                const vz = state.velocity.z;
                                const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
                                if (speed > 0.001) {
                                    // Normalize velocity to get forward direction
                                    const fx = vx / speed;
                                    const fy = vy / speed;
                                    const fz = vz / speed;
                                    // Calculate right direction (cross product with up vector [0,1,0])
                                    // right = cross(forward, up) = [fz, 0, -fx]
                                    const rx = fz;
                                    const ry = 0;
                                    const rz = -fx;
                                    // Normalize right vector
                                    const rLen = Math.sqrt(rx * rx + rz * rz);
                                    const rnx = rLen > 0.001 ? rx / rLen : 1;
                                    const rnz = rLen > 0.001 ? rz / rLen : 0;
                                    // Apply thrust based on input
                                    if (inputState.left) {
                                        // Thrust to the left (opposite of right direction)
                                        dv[0] += rnx * dvScale;
                                        dv[2] += rnz * dvScale;
                                    }
                                    if (inputState.right) {
                                        // Thrust to the right
                                        dv[0] -= rnx * dvScale;
                                        dv[2] -= rnz * dvScale;
                                    }
                                    if (inputState.up) {
                                        // Thrust forward (in velocity direction)
                                        dv[0] += fx * dvScale;
                                        dv[2] += fz * dvScale;
                                    }
                                    if (inputState.down) {
                                        // Thrust backward (brake)
                                        dv[0] -= fx * dvScale;
                                        dv[2] -= fz * dvScale;
                                    }
                                } else {
                                    // Fallback to world-axis control when stationary
                                    if (inputState.left) dv[0] -= dvScale;
                                    if (inputState.right) dv[0] += dvScale;
                                    if (inputState.up) dv[2] -= dvScale;
                                    if (inputState.down) dv[2] += dvScale;
                                }
                            }
                            if (dv[0] !== 0 || dv[1] !== 0 || dv[2] !== 0) {
                                // Calculate fuel consumption based on delta-v magnitude
                                const dvMagnitude = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2]);
                                const fuelConsumed = dvMagnitude * __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].FUEL_CONSUMPTION_RATE;
                                // Check if enough fuel available
                                if (state.fuel > 0) {
                                    // Consume fuel
                                    state.fuel = Math.max(0, state.fuel - fuelConsumed);
                                    // Apply thrust
                                    try {
                                        // call exported helper bound in threeSetup
                                        window.__applyDeltaVToProbe ? window.__applyDeltaVToProbe(dv) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initThreeJS"].applyDeltaVToProbe?.(dv);
                                    } catch (e) {
                                        try {
                                            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initThreeJS"].applyDeltaVToProbe?.(dv);
                                        } catch (e) {}
                                    }
                                }
                            // If fuel depleted, thrust is not applied (status will be set in stepSimulation)
                            }
                            stepSimulation(fixedTimeStep);
                        } catch (e) {
                            // swallow physics errors to keep render loop alive
                            console.error('physics step error', e);
                        }
                        accumulator -= fixedTimeStep;
                    }
                    // synchronize visual probe mesh with simulated state
                    try {
                        if (probe && state.position) probe.position.copy(state.position);
                    } catch (e) {
                    // ignore copy errors in unusual cases
                    }
                    // update camera position based on view mode
                    try {
                        if (cameraViewRef.current === 'top') {
                            // Top view: camera above the sun
                            camera.position.set(0, 1500, 0);
                            camera.lookAt(0, 0, 0);
                            controls.enabled = false;
                        } else if (cameraViewRef.current === 'probe') {
                            // Probe follow view: camera behind and above the probe
                            if (probe && state.position) {
                                const probePos = state.position;
                                const vel = state.velocity;
                                const speed = vel ? vel.length() : 0;
                                if (speed > 0.1) {
                                    // Position camera behind the probe based on velocity direction
                                    const velNorm = vel.clone().normalize();
                                    const camOffset = velNorm.multiplyScalar(-150); // 150 units behind
                                    const camPos = probePos.clone().add(camOffset);
                                    camPos.y += 80; // 80 units above
                                    camera.position.copy(camPos);
                                    camera.lookAt(probePos.x, probePos.y, probePos.z);
                                } else {
                                    // If probe is stationary, use fixed offset
                                    camera.position.set(probePos.x, probePos.y + 80, probePos.z + 150);
                                    camera.lookAt(probePos.x, probePos.y, probePos.z);
                                }
                            }
                            controls.enabled = false;
                        } else {
                            // Free view: enable orbit controls
                            controls.enabled = true;
                            controls.update();
                        }
                    } catch (e) {
                    // ignore camera update errors
                    }
                    // add trail point periodically (every 100ms)
                    if (addTrailPoint) {
                        const nowMsPoint = performance.now();
                        if (!trailRef.current) trailRef.current = {
                            lastMs: nowMsPoint
                        };
                        if (nowMsPoint - trailRef.current.lastMs > 100) {
                            try {
                                addTrailPoint(state.position);
                            } catch (e) {
                            // ignore
                            }
                            trailRef.current.lastMs = nowMsPoint;
                        }
                    }
                    // update HUD if setters provided (throttled)
                    if (hudSetters) {
                        const nowMs = performance.now();
                        const lastMs = hudUpdateRef.current && hudUpdateRef.current.lastMs || 0;
                        const lastVals = hudUpdateRef.current && hudUpdateRef.current.lastVals || {
                            velocity: -1,
                            distance: -1,
                            fuel: -1,
                            slingshots: -1,
                            status: ''
                        };
                        const speed = state.velocity ? state.velocity.length() : 0;
                        const speedKmPerSec = speed * __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].VELOCITY_TO_KM_PER_SEC;
                        const shouldUpdateTime = nowMs - lastMs > 200; // 200ms throttle
                        const largeChange = Math.abs(speedKmPerSec - lastVals.velocity) > 0.7 || Math.abs(state.distance - lastVals.distance) > 0.1 || Math.abs(state.fuel - lastVals.fuel) > 1 || state.slingshots !== lastVals.slingshots || state.status !== lastVals.status;
                        if (shouldUpdateTime || largeChange) {
                            hudSetters.setVelocity(speedKmPerSec);
                            hudSetters.setDistance(state.distance);
                            hudSetters.setFuel(state.fuel);
                            hudSetters.setSlingshots(state.slingshots);
                            hudSetters.setStatus(state.status);
                            hudUpdateRef.current = {
                                lastMs: nowMs,
                                lastVals: {
                                    velocity: speedKmPerSec,
                                    distance: state.distance,
                                    fuel: state.fuel,
                                    slingshots: state.slingshots,
                                    status: state.status
                                }
                            };
                        }
                    }
                    renderer.render(scene, camera);
                    rafRef.current = requestAnimationFrame(animate);
                }
            }["GameCanvas.useEffect.animate"];
            rafRef.current = requestAnimationFrame(animate);
            return ({
                "GameCanvas.useEffect": ()=>{
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                    dispose();
                    window.removeEventListener('keydown', onKeyDown);
                    window.removeEventListener('keyup', onKeyUp);
                }
            })["GameCanvas.useEffect"];
        }
    }["GameCanvas.useEffect"], [
        hudSetters,
        probeSpeedMult,
        gravityG,
        starMass
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
        ref: canvasRef,
        style: {
            display: 'block',
            width: '100vw',
            height: '100vh'
        }
    }, void 0, false, {
        fileName: "[project]/src/components/GameCanvas.tsx",
        lineNumber: 276,
        columnNumber: 12
    }, ("TURBOPACK compile-time value", void 0));
};
_s(GameCanvas, "wApZ5/PxGGrPw8aU9zDnZeMjMSE=");
_c = GameCanvas;
const __TURBOPACK__default__export__ = GameCanvas;
var _c;
__turbopack_context__.k.register(_c, "GameCanvas");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/HUD.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
const HUD = ({ status = 'Idle', velocity = 0, distance = 0, fuel = 100, slingshots = 0 })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        id: "ui",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                children: "探査機データ"
            }, void 0, false, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 20,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-label",
                        children: "状態:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 21,
                        columnNumber: 16
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-value",
                        children: status
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 21,
                        columnNumber: 55
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-label",
                        children: "速度:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 22,
                        columnNumber: 16
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-value",
                        children: velocity.toFixed(1)
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 22,
                        columnNumber: 55
                    }, ("TURBOPACK compile-time value", void 0)),
                    " km/s"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 22,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-label",
                        children: "距離:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 23,
                        columnNumber: 16
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-value",
                        children: distance.toFixed(2)
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 23,
                        columnNumber: 55
                    }, ("TURBOPACK compile-time value", void 0)),
                    " AU"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-label",
                        children: "燃料:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 24,
                        columnNumber: 16
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-value",
                        children: fuel.toFixed(1)
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 24,
                        columnNumber: 55
                    }, ("TURBOPACK compile-time value", void 0)),
                    "%"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 24,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-label",
                        children: "スイングバイ:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 25,
                        columnNumber: 16
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-value",
                        children: slingshots
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 25,
                        columnNumber: 59
                    }, ("TURBOPACK compile-time value", void 0)),
                    " 回"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 25,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/HUD.tsx",
        lineNumber: 19,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c = HUD;
const __TURBOPACK__default__export__ = HUD;
var _c;
__turbopack_context__.k.register(_c, "HUD");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Controls.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
const Controls = ({ probeSpeedMult, setProbeSpeedMult, gravityG, setGravityG, starMass, setStarMass, cameraView, setCameraView })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        id: "controls",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                children: "操作方法"
            }, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 19,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "← : 進行方向の左に推進"
            }, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 20,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "→ : 進行方向の右に推進"
            }, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "↑ : 進行方向に加速"
            }, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 22,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "↓ : 進行方向に減速（ブレーキ）"
            }, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "R : リスタート"
            }, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 24,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                style: {
                    fontSize: '0.85em',
                    marginTop: '8px',
                    color: '#888'
                },
                children: "※矢印キーは常に探査機の速度方向を基準にします"
            }, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 25,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("hr", {}, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 29,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        children: "カメラ視点:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 31,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            marginTop: '8px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCameraView('free'),
                                style: {
                                    padding: '8px 12px',
                                    backgroundColor: cameraView === 'free' ? '#4CAF50' : '#555',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                },
                                children: "自由視点（マウス操作）"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Controls.tsx",
                                lineNumber: 33,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCameraView('top'),
                                style: {
                                    padding: '8px 12px',
                                    backgroundColor: cameraView === 'top' ? '#4CAF50' : '#555',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                },
                                children: "真上視点（太陽中心）"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Controls.tsx",
                                lineNumber: 47,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCameraView('probe'),
                                style: {
                                    padding: '8px 12px',
                                    backgroundColor: cameraView === 'probe' ? '#4CAF50' : '#555',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                },
                                children: "探査機追従視点"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Controls.tsx",
                                lineNumber: 61,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 32,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 30,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("hr", {}, void 0, false, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 78,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        children: [
                            "Probe speed multiplier: ",
                            probeSpeedMult.toFixed(2)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 80,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "range",
                        min: "0.95",
                        max: "1.50",
                        step: "0.01",
                        value: probeSpeedMult,
                        onChange: (e)=>setProbeSpeedMult(Number(e.target.value))
                    }, void 0, false, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 81,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 79,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        children: [
                            "Gravity G: ",
                            gravityG.toFixed(3)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 84,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "range",
                        min: "0.01",
                        max: "1.0",
                        step: "0.01",
                        value: gravityG,
                        onChange: (e)=>setGravityG(Number(e.target.value))
                    }, void 0, false, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 85,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 83,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        children: [
                            "Star mass: ",
                            Math.round(starMass).toLocaleString()
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 88,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "range",
                        min: "50000",
                        max: "500000",
                        step: "5000",
                        value: starMass,
                        onChange: (e)=>setStarMass(Number(e.target.value))
                    }, void 0, false, {
                        fileName: "[project]/src/components/Controls.tsx",
                        lineNumber: 89,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Controls.tsx",
                lineNumber: 87,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Controls.tsx",
        lineNumber: 18,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Controls;
const __TURBOPACK__default__export__ = Controls;
var _c;
__turbopack_context__.k.register(_c, "Controls");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GameCanvas$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GameCanvas.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$HUD$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/HUD.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Controls$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Controls.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/threeSetup.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const Page = ()=>{
    _s();
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('Idle');
    const [velocity, setVelocity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [distance, setDistance] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [fuel, setFuel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(100);
    const [slingshots, setSlingshots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    // simulation tuning parameters (editable via Controls)
    const [probeSpeedMult, setProbeSpeedMult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1.05);
    const [gravityG, setGravityG] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].G);
    const [starMass, setStarMass] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].SUN_MASS);
    const [cameraView, setCameraView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('free');
    // stable setters object to pass down (memoized so reference is stable)
    const hudSetters = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Page.useMemo[hudSetters]": ()=>({
                setStatus,
                setVelocity,
                setDistance,
                setFuel,
                setSlingshots
            })
    }["Page.useMemo[hudSetters]"], [
        setStatus,
        setVelocity,
        setDistance,
        setFuel,
        setSlingshots
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GameCanvas$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                hudSetters: hudSetters,
                probeSpeedMult: probeSpeedMult,
                gravityG: gravityG,
                starMass: starMass,
                cameraView: cameraView
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 30,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$HUD$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                status: status,
                velocity: velocity,
                distance: distance,
                fuel: fuel,
                slingshots: slingshots
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 31,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Controls$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                probeSpeedMult: probeSpeedMult,
                setProbeSpeedMult: setProbeSpeedMult,
                gravityG: gravityG,
                setGravityG: setGravityG,
                starMass: starMass,
                setStarMass: setStarMass,
                cameraView: cameraView,
                setCameraView: setCameraView
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 32,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 29,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Page, "rGdLGrF+CSz4nWkgIfEUftjJFLk=");
_c = Page;
const __TURBOPACK__default__export__ = Page;
var _c;
__turbopack_context__.k.register(_c, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_f1f4815d._.js.map