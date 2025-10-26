module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/lib/physics.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/src/lib/threeSetup.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.module.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/controls/OrbitControls.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/loaders/GLTFLoader.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$postprocessing$2f$EffectComposer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/postprocessing/EffectComposer.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$postprocessing$2f$RenderPass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/postprocessing/RenderPass.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$postprocessing$2f$UnrealBloomPass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/physics.ts [app-ssr] (ecmascript)");
;
;
;
;
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
// ====================================================================
// Probe Model Creation Functions
// ====================================================================
/**
 * Create a Voyager-style probe using Three.js primitives
 */ function createVoyagerProbe() {
    const probe = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Group"]();
    // Main body (10-sided cylinder approximation)
    const bodyGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CylinderGeometry"](0.5, 0.5, 0.4, 10);
    const bodyMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0xcccccc,
        metalness: 0.6,
        roughness: 0.4
    });
    const body = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    probe.add(body);
    // Parabolic antenna (dish)
    const dishGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CylinderGeometry"](1.2, 1.2, 0.1, 32);
    const dishMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0xeeeeee,
        metalness: 0.8,
        roughness: 0.2
    });
    const dish = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](dishGeom, dishMat);
    dish.rotation.x = Math.PI / 2;
    dish.position.set(0, 0, 0.3);
    probe.add(dish);
    // Antenna feed (center of dish)
    const feedGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConeGeometry"](0.15, 0.4, 8);
    const feedMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0x888888
    });
    const feed = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](feedGeom, feedMat);
    feed.rotation.x = Math.PI / 2;
    feed.position.set(0, 0, 0.5);
    probe.add(feed);
    // RTG boom (Radioisotope Thermoelectric Generator)
    const rtgBoomGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CylinderGeometry"](0.05, 0.05, 3, 8);
    const rtgBoomMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0x666666
    });
    const rtgBoom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](rtgBoomGeom, rtgBoomMat);
    rtgBoom.rotation.z = Math.PI / 2;
    rtgBoom.position.set(-1.5, -0.3, 0);
    probe.add(rtgBoom);
    // RTG power source (box at end of boom)
    const rtgGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BoxGeometry"](0.2, 0.2, 0.3);
    const rtgMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0x444444,
        emissive: 0x330000
    });
    const rtg = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](rtgGeom, rtgMat);
    rtg.position.set(-3, -0.3, 0);
    probe.add(rtg);
    // Magnetometer boom
    const magBoomGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CylinderGeometry"](0.03, 0.03, 4, 6);
    const magBoomMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0x888888
    });
    const magBoom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](magBoomGeom, magBoomMat);
    magBoom.rotation.z = Math.PI / 2;
    magBoom.position.set(2, 0.2, 0);
    probe.add(magBoom);
    // Magnetometer sensor
    const magSensorGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BoxGeometry"](0.15, 0.15, 0.15);
    const magSensorMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0xffaa00
    });
    const magSensor = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](magSensorGeom, magSensorMat);
    magSensor.position.set(4, 0.2, 0);
    probe.add(magSensor);
    // Science instruments platform
    const instrumentsGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BoxGeometry"](0.4, 0.3, 0.3);
    const instrumentsMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0x999999
    });
    const instruments = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](instrumentsGeom, instrumentsMat);
    instruments.position.set(0, 0.35, 0);
    probe.add(instruments);
    // Scale up for visibility
    probe.scale.set(3, 3, 3);
    return probe;
}
/**
 * Load a GLB model and return it as a Group
 * @param modelPath Path to the GLB file (relative to public folder)
 * @param onLoad Callback when model is loaded successfully
 * @param onError Callback when loading fails
 */ function loadGLBProbe(modelPath, onLoad, onError, orientation) {
    const loader = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$loaders$2f$GLTFLoader$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GLTFLoader"]();
    loader.load(modelPath, (gltf)=>{
        const model = gltf.scene;
        // Calculate bounding box to get model dimensions
        const box = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Box3"]().setFromObject(model);
        const size = box.getSize(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"]());
        const maxDim = Math.max(size.x, size.y, size.z);
        // Auto-normalize: scale to target size
        const targetSize = 15; // Target size in scene units (3x larger for better visibility)
        const normalizedScale = targetSize / maxDim;
        model.scale.setScalar(normalizedScale);
        console.log(`Model dimensions: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        console.log(`Auto-scaling to ${targetSize} units (scale: ${normalizedScale.toFixed(4)})`);
        // Center model at origin (optional, helps with consistent positioning)
        box.setFromObject(model); // Recalculate after scaling
        const center = box.getCenter(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"]());
        model.position.sub(center);
        // Determine longest dimension (axis) for auto-alignment
        let longestAxis = 'z'; // default
        if (size.x > size.y && size.x > size.z) {
            longestAxis = 'x';
        } else if (size.y > size.x && size.y > size.z) {
            longestAxis = 'y';
        }
        console.log(`Longest axis: ${longestAxis} (${longestAxis === 'x' ? size.x.toFixed(2) : longestAxis === 'y' ? size.y.toFixed(2) : size.z.toFixed(2)} units)`);
        // Apply manual rotation if specified
        if (orientation?.rotationY !== undefined) {
            model.rotation.y = orientation.rotationY;
            console.log(`Applied manual rotation Y: ${orientation.rotationY.toFixed(2)} radians`);
        }
        // Auto-align longest dimension with forward direction (Z-axis)
        if (orientation?.autoAlign) {
            if (longestAxis === 'x') {
                // Rotate 90 degrees to align X with Z
                model.rotation.y = Math.PI / 2;
                console.log('Auto-aligned: Rotated X-axis to face forward');
            } else if (longestAxis === 'y') {
                // Rotate 90 degrees around X to align Y with Z
                model.rotation.x = Math.PI / 2;
                console.log('Auto-aligned: Rotated Y-axis to face forward');
            }
        // If longestAxis === 'z', no additional rotation needed
        } else {
            // Fallback to default 180 degree rotation if not auto-aligning
            model.rotation.y = Math.PI;
        }
        // Store orientation config on model for use in velocity tracking
        model.orientationConfig = orientation;
        // Brighten all materials in the model
        model.traverse((child)=>{
            if (child.isMesh && child.material) {
                const material = child.material;
                // Handle both single material and array of materials
                const materials = Array.isArray(material) ? material : [
                    material
                ];
                materials.forEach((mat)=>{
                    // Check if material color is dark or light
                    let isDark = false;
                    const hsl = {
                        h: 0,
                        s: 0,
                        l: 0
                    };
                    if (mat.color) {
                        mat.color.getHSL(hsl);
                        isDark = hsl.l < 0.5; // Lightness < 0.5 = dark color
                        // Increase color brightness
                        mat.color.multiplyScalar(1.1);
                    }
                    // Add emissive color only for dark models for consistent brightness
                    if (mat.emissive !== undefined && isDark) {
                        // Set emissive to a fraction of the base color for self-illumination
                        const emissiveColor = mat.color ? mat.color.clone().multiplyScalar(0.5) : new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Color"](0x333333);
                        mat.emissive = emissiveColor;
                        console.log(`Applied emissive to dark material (L=${hsl.l.toFixed(2)})`);
                    } else if (mat.emissive !== undefined && !isDark) {
                        console.log(`Skipped emissive for bright material (L=${hsl.l.toFixed(2)})`);
                    }
                    // Adjust other properties for better visibility
                    if (mat.metalness !== undefined) {
                        mat.metalness = Math.min(mat.metalness * 1.2, 1.0);
                    }
                    if (mat.roughness !== undefined) {
                        mat.roughness = Math.max(mat.roughness * 0.7, 0.3);
                    }
                });
            }
        });
        console.log('GLB model loaded successfully:', modelPath);
        onLoad(model);
    }, (progress)=>{
        // Loading progress (optional)
        const percent = progress.loaded / progress.total * 100;
        console.log(`Loading model: ${percent.toFixed(0)}%`);
    }, (error)=>{
        console.error('Error loading GLB model:', error);
        onError(error);
    });
}
function initThreeJS(canvas, options) {
    const scene = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Scene"]();
    const camera = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PerspectiveCamera"](60, window.innerWidth / window.innerHeight, 0.1, 50000);
    camera.position.set(0, 400, 2200);
    const renderer = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WebGLRenderer"]({
        canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Setup post-processing for bloom effect
    const composer = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$postprocessing$2f$EffectComposer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EffectComposer"](renderer);
    const renderPass = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$postprocessing$2f$RenderPass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RenderPass"](scene, camera);
    composer.addPass(renderPass);
    // Bloom pass for glowing sun
    const bloomPass = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$postprocessing$2f$UnrealBloomPass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UnrealBloomPass"](new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector2"](window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85 // threshold
    );
    composer.addPass(bloomPass);
    const ambient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AmbientLight"](0xffffff, 0.6);
    scene.add(ambient);
    const directional = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DirectionalLight"](0xffffff, 0.8);
    directional.position.set(5, 10, 7.5);
    scene.add(directional);
    // Simple grid for reference (large enough to show outer planets)
    const grid = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GridHelper"](7000, 1000, 0x444444, 0x222222);
    grid.visible = options?.gridEnabled ?? false;
    scene.add(grid);
    // ====================================================================
    // Gravity Well Grid (curved based on gravitational potential)
    // ====================================================================
    const gridSize = 7000;
    const gridDivisions = 200; // High resolution for smooth curvature
    const gravityWellGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PlaneGeometry"](gridSize, gridSize, gridDivisions, gridDivisions);
    gravityWellGeometry.rotateX(-Math.PI / 2); // Rotate to horizontal (XZ plane)
    // Wireframe material for the gravity well
    const gravityWellMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshBasicMaterial"]({
        color: 0xd3d3d3,
        wireframe: true,
        transparent: true,
        opacity: 0.05
    });
    const gravityWellMesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](gravityWellGeometry, gravityWellMaterial);
    gravityWellMesh.visible = options?.gravityGridEnabled ?? false;
    scene.add(gravityWellMesh);
    // Store original positions for reset
    const originalPositions = new Float32Array(gravityWellGeometry.attributes.position.array);
    // Create a list of bodies: central star, planets, probe
    const bodies = [];
    const planetMeshes = [];
    // central star at origin (can be overridden via options)
    const starMass = options?.starMass ?? PHYSICS_SCALE.SUN_MASS;
    const starGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SphereGeometry"](5, 24, 24);
    const starMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
        color: 0xffee88,
        emissive: 0xffaa00,
        emissiveIntensity: 2.5 // Strong emissive intensity for bloom
    });
    const starMesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](starGeom, starMat);
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
        const geom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SphereGeometry"](pd.radius, 16, 16);
        const mat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshStandardMaterial"]({
            color: pd.color
        });
        const mesh = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](geom, mat);
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
    // Create Voyager-style probe (will be replaced by GLB model if loading succeeds)
    let probe = createVoyagerProbe();
    const probeR = 100; // 1.0 AU (same as Earth orbit)
    probe.position.set(0, 0, probeR);
    // Store orientation config on built-in Voyager probe
    probe.orientationConfig = options?.orientation;
    // Attempt to load GLB model from public/models/ directory
    // If loading fails or probeModelPath is null, use the Voyager probe
    const modelPath = options?.probeModelPath;
    if (modelPath) {
        // Hide Voyager while loading GLB model
        probe.visible = false;
    }
    scene.add(probe);
    if (modelPath) {
        loadGLBProbe(modelPath, (loadedModel)=>{
            // Success: replace the probe with the loaded GLB model
            console.log('GLB model loaded, replacing probe');
            // Copy position from current probe to loaded model
            loadedModel.position.copy(probe.position);
            // Remove old probe from scene
            scene.remove(probe);
            // Add loaded model to scene
            scene.add(loadedModel);
            // Update probe reference to point to loaded model
            probe = loadedModel;
            console.log('Probe replaced with GLB model successfully');
        }, (error)=>{
            // Error: keep using the Voyager probe as fallback
            console.log('Failed to load GLB model, using Voyager probe as fallback');
            console.error('GLB loading error:', error);
            // Show Voyager probe on loading failure
            probe.visible = true;
        }, options?.orientation);
    } else {
        console.log('Using built-in Voyager probe (no GLB model specified)');
    }
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
    const controls = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OrbitControls"](camera, renderer.domElement);
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
        const starGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BufferGeometry"]();
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
        starGeometry.setAttribute('position', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BufferAttribute"](starPositions, 3));
        starGeometry.setAttribute('color', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BufferAttribute"](starColors, 3));
        const starMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PointsMaterial"]({
            size: 10,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });
        const stars = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Points"](starGeometry, starMaterial);
        scene.add(stars);
    }
    createStarField();
    // Trail (orbit path) - sample points stored as Vector3 and rendered smooth via Catmull-Rom
    const trailPoints = [];
    const trailGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BufferGeometry"]();
    const trailMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LineBasicMaterial"]({
        color: 0x00ff88
    });
    const trailLine = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Line"](trailGeometry, trailMaterial);
    scene.add(trailLine);
    function addTrailPoint(p) {
        const maxPoints = 2000;
        trailPoints.push(p.clone());
        if (trailPoints.length > maxPoints) {
            trailPoints.shift();
        }
        if (trailPoints.length >= 2) {
            const curve = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CatmullRomCurve3"](trailPoints, false, 'catmullrom', 0.5);
            const divisions = Math.min(Math.max(trailPoints.length * 6, 64), 3000);
            const smoothPoints = curve.getPoints(divisions);
            const positions = [];
            for(let i = 0; i < smoothPoints.length; i++){
                positions.push(smoothPoints[i].x, smoothPoints[i].y, smoothPoints[i].z);
            }
            trailGeometry.setAttribute('position', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Float32BufferAttribute"](positions, 3));
            trailGeometry.setDrawRange(0, positions.length / 3);
            trailGeometry.computeBoundingSphere();
        }
    }
    // ====================================================================
    // Velocity Vector Visualization
    // ====================================================================
    // Display probe's velocity as an arrow (direction and magnitude)
    // Temporarily disabled
    /*
    const velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0), // initial direction
        probe.position,              // origin
        10,                          // length
        0xff0000,                    // color (red)
        3,                           // head length
        2                            // head width
    );
    scene.add(velocityArrow);
    */ /*
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
                velocityArrow.setColor(new THREE.Color(0, t, 1 - t));
            } else if (speedRatio < 0.66) {
                // Green to yellow
                const t = (speedRatio - 0.33) / 0.33;
                velocityArrow.setColor(new THREE.Color(t, 1, 0));
            } else {
                // Yellow to red
                const t = (speedRatio - 0.66) / 0.34;
                velocityArrow.setColor(new THREE.Color(1, 1 - t, 0));
            }

            velocityArrow.position.copy(state.position);
            velocityArrow.visible = true;
        } else {
            velocityArrow.visible = false;
        }
    }
    */ // ====================================================================
    // Swing-by Influence Zones Visualization
    // ====================================================================
    // Display encounter radius around each planet as a torus (donut ring)
    const influenceZones = [];
    for (const pm of planetMeshes){
        const planetData = solarDefs.find((pd)=>pd.id === pm.id);
        if (!planetData) continue;
        const encounterRadius = planetData.radius * 2.5; // encounterMultiplier
        // Create torus (ring)
        const torusGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TorusGeometry"](encounterRadius, encounterRadius * 0.08, 8, 64 // tubular segments
        );
        const torusMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshBasicMaterial"]({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.25,
            side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DoubleSide"]
        });
        const torus = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](torusGeometry, torusMaterial);
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
            points.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"](x, 0, z));
        }
        // Create line geometry
        const orbitGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BufferGeometry"]().setFromPoints(points);
        const orbitMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LineBasicMaterial"]({
            color: pd.color,
            transparent: true,
            opacity: 0.3,
            linewidth: 1
        });
        const orbitLine = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Line"](orbitGeometry, orbitMaterial);
        scene.add(orbitLine);
        orbitLines.push(orbitLine);
    }
    // ====================================================================
    // Predicted Trajectory Visualization (Phase 2)
    // ====================================================================
    // Display future trajectory based on current velocity and gravity
    const predictionPoints = [];
    const predictionGeometry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BufferGeometry"]();
    const predictionMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LineDashedMaterial"]({
        color: 0xffaa00,
        dashSize: 3,
        gapSize: 2,
        linewidth: 1,
        transparent: true,
        opacity: 0.6
    });
    const predictionLine = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Line"](predictionGeometry, predictionMaterial);
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
        const texture = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CanvasTexture"](canvas);
        const spriteMaterial = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SpriteMaterial"]({
            map: texture,
            transparent: true
        });
        const sprite = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sprite"](spriteMaterial);
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
        const predictedBodies = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cloneBodies"])(bodies);
        const probeIndex = predictedBodies.findIndex((b)=>b.id === 'probe');
        if (probeIndex < 0) return;
        // Run simulation forward for predictionTime seconds
        const predictionTime = 15; // seconds
        const predictionSteps = 150; // number of points
        const dt = predictionTime / predictionSteps;
        predictionPoints.length = 0;
        predictionPoints.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"](predictedBodies[probeIndex].position[0], predictedBodies[probeIndex].position[1], predictedBodies[probeIndex].position[2]));
        // Reset success probabilities
        for (const indicator of successIndicators){
            indicator.probability = 0;
        }
        const gRun = options?.G ?? DEFAULT_G;
        let predSimTime = simTime;
        // Simulate future trajectory
        for(let i = 0; i < predictionSteps; i++){
            const { bodies: nextBodies, events } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stepBodies"])(predictedBodies, dt, gRun, predSimTime, 0.5, swingOptions);
            predSimTime += dt;
            // Copy nextBodies back to predictedBodies (safely handle type)
            for(let j = 0; j < nextBodies.length; j++){
                predictedBodies[j] = {
                    ...nextBodies[j]
                };
            }
            // Store probe position
            const probePos = predictedBodies[probeIndex].position;
            predictionPoints.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"](probePos[0], probePos[1], probePos[2]));
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
            predictionGeometry.setAttribute('position', new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Float32BufferAttribute"](positions, 3));
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
                    const texture = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CanvasTexture"](canvas);
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
        velocity: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"](probeBody.velocity[0], probeBody.velocity[1], probeBody.velocity[2]),
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
        composer.setSize(window.innerWidth, window.innerHeight);
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
        const { bodies: nextBodies, events } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$physics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stepBodies"])(bodies, dt, gRun, simTime, 0.5, swingOptions);
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
                // Smoothly rotate probe to face velocity direction
                const speed = state.velocity.length();
                if (speed > 0.1) {
                    // Calculate target direction from velocity vector
                    let direction = state.velocity.clone().normalize();
                    // Check if model has orientation config with invertDirection flag
                    const orientationConfig = probe.orientationConfig;
                    const shouldInvert = orientationConfig?.invertDirection ?? true; // default to true for backward compatibility
                    // Invert direction if configured (for models that face backwards)
                    if (shouldInvert) {
                        direction.negate();
                    }
                    // Create a matrix that looks in the velocity direction
                    const targetMatrix = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Matrix4"]();
                    targetMatrix.lookAt(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"](0, 0, 0), direction, new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Vector3"](0, 1, 0) // up vector
                    );
                    // Extract target quaternion from matrix
                    const targetQuaternion = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Quaternion"]();
                    targetQuaternion.setFromRotationMatrix(targetMatrix);
                    // Smoothly interpolate (slerp) from current to target rotation
                    // Lower value = smoother/slower rotation, higher = faster
                    const rotationSpeed = 0.15; // 15% per frame
                    probe.quaternion.slerp(targetQuaternion, rotationSpeed);
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
        // updateVelocityArrow(); // Temporarily disabled
        // Update predicted trajectory (Phase 2)
        updatePredictedTrajectory();
        // Update gravity well grid if enabled
        updateGravityWellGrid();
        // handle events (swing-bys)
        if (events && events.swingBys && events.swingBys.length) {
            for (const ev of events.swingBys){
                if (ev.probeId === 'probe') {
                    state.slingshots += 1;
                    console.log(`Swing-by detected at t=${ev.time.toFixed(2)}: probe around ${ev.bodyId} deltaV=${ev.deltaV.toFixed(3)}`);
                    // find body position for marker
                    const body = nextBodies.find((b)=>b.id === ev.bodyId);
                    if (body) {
                        const markerGeom = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SphereGeometry"](0.8, 8, 8);
                        const markerMat = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MeshBasicMaterial"]({
                            color: 0xff0000
                        });
                        const marker = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$module$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mesh"](markerGeom, markerMat);
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
                    // flash probe material if available (main body)
                    try {
                        const bodyMesh = probe.children[0]; // Main body is first child
                        const mat = bodyMesh?.material;
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
    // ====================================================================
    // Gravity Well Grid Update Function
    // ====================================================================
    function updateGravityWellGrid() {
        if (!gravityWellMesh.visible) return;
        const positions = gravityWellGeometry.attributes.position.array;
        const gVal = options?.G ?? DEFAULT_G;
        const depthScale = 50; // Scale factor for visual effect (adjust for visibility)
        // Reset to original positions
        for(let i = 0; i < positions.length; i++){
            positions[i] = originalPositions[i];
        }
        // Calculate reference potential at grid corners (far from bodies)
        const halfSize = gridSize / 2;
        const cornerPositions = [
            [
                halfSize,
                halfSize
            ],
            [
                halfSize,
                -halfSize
            ],
            [
                -halfSize,
                halfSize
            ],
            [
                -halfSize,
                -halfSize
            ]
        ];
        let referencePotential = 0;
        for (const [cx, cz] of cornerPositions){
            let cornerPotential = 0;
            for (const body of bodies){
                if (body.isProbe) continue;
                const dx = cx - body.position[0];
                const dz = cz - body.position[2];
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance > 0.1) {
                    cornerPotential += -(gVal * body.mass) / distance;
                }
            }
            referencePotential += cornerPotential;
        }
        referencePotential /= cornerPositions.length; // Average
        // Apply gravitational deformation for each vertex
        for(let i = 0; i < positions.length; i += 3){
            const x = positions[i];
            const z = positions[i + 2];
            let totalPotential = 0;
            // Calculate gravitational potential from all massive bodies
            for (const body of bodies){
                if (body.isProbe) continue; // Skip probe (negligible mass)
                const dx = x - body.position[0];
                const dz = z - body.position[2];
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance > 0.1) {
                    // Gravitational potential: -GM/r (negative, creates a well)
                    const potential = -(gVal * body.mass) / distance;
                    totalPotential += potential;
                }
            }
            // Apply depth relative to reference (grid edges at Y=0)
            const relativeDepth = totalPotential - referencePotential;
            positions[i + 1] = relativeDepth * depthScale;
        }
        gravityWellGeometry.attributes.position.needsUpdate = true;
        gravityWellGeometry.computeVertexNormals(); // Update normals for proper lighting
    }
    // Toggle gravity grid visibility
    function updateGravityGrid(enabled) {
        gravityWellMesh.visible = enabled;
        if (enabled) {
            updateGravityWellGrid();
        }
    }
    // Toggle flat grid visibility
    function updateGrid(enabled) {
        grid.visible = enabled;
    }
    function dispose() {
        window.removeEventListener('resize', onResize);
        composer.dispose();
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
    // Switch probe model without resetting state
    function switchProbeModel(newModelPath, orientation) {
        // Save current state
        const currentPosition = probe.position.clone();
        const currentRotation = probe.quaternion.clone();
        // Create new probe model
        let newProbe;
        if (newModelPath) {
            // Load GLB model
            loadGLBProbe(newModelPath, (loadedModel)=>{
                // Apply saved state to new model
                loadedModel.position.copy(currentPosition);
                loadedModel.quaternion.copy(currentRotation);
                // Remove old probe
                scene.remove(probe);
                // Add new probe
                scene.add(loadedModel);
                probe = loadedModel;
                console.log('Probe model switched successfully');
            }, (error)=>{
                console.error('Failed to switch probe model:', error);
            }, orientation);
        } else {
            // Use built-in Voyager
            newProbe = createVoyagerProbe();
            newProbe.position.copy(currentPosition);
            newProbe.quaternion.copy(currentRotation);
            // Store orientation config on Voyager model too
            newProbe.orientationConfig = orientation;
            // Remove old probe
            scene.remove(probe);
            // Add new probe
            scene.add(newProbe);
            probe = newProbe;
            console.log('Switched to built-in Voyager probe');
        }
    }
    return {
        scene,
        camera,
        renderer,
        composer,
        dispose,
        state,
        probe,
        controls,
        addTrailPoint,
        stepSimulation,
        updateGravityGrid,
        updateGrid,
        switchProbeModel
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
}),
"[project]/src/components/GameCanvas.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/threeSetup.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/page.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const GameCanvas = ({ hudSetters, probeSpeedMult = 1.05, gravityG = 1.0, starMass = 4000, cameraView = 'free', gravityGridEnabled = false, setGravityGridEnabled, gridEnabled = false, setGridEnabled, selectedModel = 'space_fighter', isSimulationStarted = false })=>{
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const rafRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const cameraViewRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(cameraView);
    const isSimulationStartedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(isSimulationStarted);
    // Update cameraViewRef when cameraView changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        cameraViewRef.current = cameraView;
    }, [
        cameraView
    ]);
    // Update isSimulationStartedRef when isSimulationStarted changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        isSimulationStartedRef.current = isSimulationStarted;
    }, [
        isSimulationStarted
    ]);
    // Update gravity grid when gravityGridEnabled changes
    const gravityGridRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (gravityGridRef.current && gravityGridRef.current.updateGravityGrid) {
            gravityGridRef.current.updateGravityGrid(gravityGridEnabled);
        }
    }, [
        gravityGridEnabled
    ]);
    // Update flat grid when gridEnabled changes
    const gridRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (gridRef.current && gridRef.current.updateGrid) {
            gridRef.current.updateGrid(gridEnabled);
        }
    }, [
        gridEnabled
    ]);
    // Store switchProbeModel function
    const switchProbeModelRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Handle probe model switching
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (switchProbeModelRef.current && switchProbeModelRef.current.switchProbeModel) {
            const modelData = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROBE_MODELS"].find((m)=>m.value === selectedModel);
            const probeModelPath = modelData?.path ?? null;
            const orientation = modelData?.orientation;
            switchProbeModelRef.current.switchProbeModel(probeModelPath, orientation);
        }
    }, [
        selectedModel
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const hudUpdateRef = {
            current: undefined
        };
        const trailRef = {
            current: undefined
        };
        // Get model path from selected model
        const modelData = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROBE_MODELS"].find((m)=>m.value === selectedModel);
        const probeModelPath = modelData?.path ?? null;
        const orientation = modelData?.orientation;
        // pass simulation tuning options to initThreeJS
        let threeObj = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initThreeJS"](canvas, {
            probeSpeedMult,
            G: gravityG,
            starMass,
            gravityGridEnabled,
            gridEnabled,
            probeModelPath,
            orientation
        });
        let { scene, camera, renderer, composer, dispose, state, probe, controls, addTrailPoint, stepSimulation, updateGravityGrid, updateGrid, switchProbeModel } = threeObj;
        gravityGridRef.current = {
            updateGravityGrid
        };
        gridRef.current = {
            updateGrid
        };
        switchProbeModelRef.current = {
            switchProbeModel
        };
        // input state
        const inputState = {
            left: false,
            right: false,
            up: false,
            down: false
        };
        // Expose input state to window for touch controls
        window.__gameInputState = inputState;
        // Expose restart function for touch controls
        const restartSimulation = ()=>{
            try {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
            } catch (e) {}
            try {
                dispose();
            } catch (e) {}
            // Reset grid states to hidden
            if (setGravityGridEnabled) setGravityGridEnabled(false);
            if (setGridEnabled) setGridEnabled(false);
            // Initialize with grids hidden
            threeObj = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initThreeJS"](canvas, {
                probeSpeedMult,
                G: gravityG,
                starMass,
                gravityGridEnabled: false,
                gridEnabled: false,
                probeModelPath,
                orientation
            });
            ({ scene, camera, renderer, composer, dispose, state, probe, controls, addTrailPoint, stepSimulation, updateGravityGrid, updateGrid, switchProbeModel } = threeObj);
            // Update refs after restart
            gravityGridRef.current = {
                updateGravityGrid
            };
            gridRef.current = {
                updateGrid
            };
            switchProbeModelRef.current = {
                switchProbeModel
            };
            // Restart animation loop
            lastTime = performance.now() / 1000;
            accumulator = 0;
            rafRef.current = requestAnimationFrame(animate);
        };
        window.__restartSimulation = restartSimulation;
        const onKeyDown = (e)=>{
            if (e.key === 'ArrowLeft') inputState.left = true;
            if (e.key === 'ArrowRight') inputState.right = true;
            if (e.key === 'ArrowUp') inputState.up = true;
            if (e.key === 'ArrowDown') inputState.down = true;
            if (e.key === 'r' || e.key === 'R') {
                restartSimulation();
            }
        };
        const onKeyUp = (e)=>{
            if (e.key === 'ArrowLeft') inputState.left = false;
            if (e.key === 'ArrowRight') inputState.right = false;
            if (e.key === 'ArrowUp') inputState.up = false;
            if (e.key === 'ArrowDown') inputState.down = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        // Fixed timestep physics loop (e.g., 60 Hz)
        const fixedTimeStep = 1 / 60; // seconds
        let accumulator = 0;
        let lastTime = performance.now() / 1000;
        const animate = ()=>{
            const now = performance.now() / 1000;
            let delta = now - lastTime;
            lastTime = now;
            // clamp delta to avoid spiral of death
            if (delta > 0.25) delta = 0.25;
            accumulator += delta;
            // Only run physics simulation if simulation has started
            if (isSimulationStartedRef.current) {
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
                            const fuelConsumed = dvMagnitude * __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].FUEL_CONSUMPTION_RATE;
                            // Check if enough fuel available
                            if (state.fuel > 0) {
                                // Consume fuel
                                state.fuel = Math.max(0, state.fuel - fuelConsumed);
                                // Apply thrust
                                try {
                                    // call exported helper bound in threeSetup
                                    window.__applyDeltaVToProbe ? window.__applyDeltaVToProbe(dv) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initThreeJS"].applyDeltaVToProbe?.(dv);
                                } catch (e) {
                                    try {
                                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initThreeJS"].applyDeltaVToProbe?.(dv);
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
            } else {
                // Reset accumulator when simulation is paused to prevent time buildup
                accumulator = 0;
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
                            const camOffset = velNorm.multiplyScalar(-70); // 70 units behind
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
                const speedKmPerSec = speed * __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].VELOCITY_TO_KM_PER_SEC;
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
            composer.render();
            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return ()=>{
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            dispose();
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            // Cleanup window properties
            delete window.__gameInputState;
            delete window.__restartSimulation;
        };
    }, [
        hudSetters,
        probeSpeedMult,
        gravityG,
        starMass
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
        ref: canvasRef,
        style: {
            display: 'block',
            width: '100vw',
            height: '100vh'
        }
    }, void 0, false, {
        fileName: "[project]/src/components/GameCanvas.tsx",
        lineNumber: 351,
        columnNumber: 12
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = GameCanvas;
}),
"[project]/src/components/MiniChart.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
;
;
const MiniChart = ({ data, color, label, unit, width = 250, height = 80 })=>{
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas || data.length < 2) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        // Get min/max values for scaling
        const values = data.map((d)=>d.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const valueRange = maxValue - minValue || 1;
        const times = data.map((d)=>d.time);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const timeRange = maxTime - minTime || 1;
        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for(let i = 0; i <= 4; i++){
            const y = height / 4 * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        // Draw the line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((point, index)=>{
            const x = (point.time - minTime) / timeRange * width;
            const y = height - (point.value - minValue) / valueRange * height;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        // Draw current value indicator
        if (data.length > 0) {
            const lastPoint = data[data.length - 1];
            const x = width;
            const y = height - (lastPoint.value - minValue) / valueRange * height;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x - 2, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [
        data,
        color,
        width,
        height
    ]);
    // Get current, min, max values
    const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
    const maxValue = data.length > 0 ? Math.max(...data.map((d)=>d.value)) : 0;
    const minValue = data.length > 0 ? Math.min(...data.map((d)=>d.value)) : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mini-chart",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "chart-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "chart-label",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/src/components/MiniChart.tsx",
                        lineNumber: 94,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "chart-current",
                        style: {
                            color
                        },
                        children: [
                            currentValue.toFixed(2),
                            " ",
                            unit
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/MiniChart.tsx",
                        lineNumber: 95,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/MiniChart.tsx",
                lineNumber: 93,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                ref: canvasRef,
                width: width,
                height: height
            }, void 0, false, {
                fileName: "[project]/src/components/MiniChart.tsx",
                lineNumber: 99,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "chart-stats",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-min",
                        children: [
                            "Min: ",
                            minValue.toFixed(2)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/MiniChart.tsx",
                        lineNumber: 101,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "stat-max",
                        children: [
                            "Max: ",
                            maxValue.toFixed(2)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/MiniChart.tsx",
                        lineNumber: 102,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/MiniChart.tsx",
                lineNumber: 100,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/MiniChart.tsx",
        lineNumber: 92,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = MiniChart;
}),
"[project]/src/components/MissionProgress.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
const MissionProgress = ({ distance, velocity, slingshots, fuel })=>{
    const missions = [
        {
            id: 'reach-1au',
            title: '1 AU到達',
            description: '地球の公転軌道半径に到達',
            target: 1,
            current: distance,
            unit: 'AU',
            completed: distance >= 1
        },
        {
            id: 'reach-5au',
            title: '5 AU到達',
            description: '木星軌道付近に到達',
            target: 5,
            current: distance,
            unit: 'AU',
            completed: distance >= 5
        },
        {
            id: 'speed-20',
            title: '高速飛行',
            description: '20 km/s以上の速度を達成',
            target: 20,
            current: velocity,
            unit: 'km/s',
            completed: velocity >= 20
        },
        {
            id: 'slingshot-3',
            title: 'スイングバイマスター',
            description: '3回以上のスイングバイ実行',
            target: 3,
            current: slingshots,
            unit: '回',
            completed: slingshots >= 3
        },
        {
            id: 'fuel-efficient',
            title: '燃料節約',
            description: '燃料50%以上残して5 AU到達',
            target: 5,
            current: distance,
            unit: 'AU',
            completed: distance >= 5 && fuel >= 50
        }
    ];
    const completedCount = missions.filter((m)=>m.completed).length;
    const totalMissions = missions.length;
    const completionPercentage = completedCount / totalMissions * 100;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mission-progress",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mission-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        children: "ミッション進捗"
                    }, void 0, false, {
                        fileName: "[project]/src/components/MissionProgress.tsx",
                        lineNumber: 81,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overall-progress",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "progress-text",
                                children: [
                                    completedCount,
                                    " / ",
                                    totalMissions,
                                    " 完了"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/MissionProgress.tsx",
                                lineNumber: 83,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "progress-bar-container",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "progress-bar-fill",
                                    style: {
                                        width: `${completionPercentage}%`
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/MissionProgress.tsx",
                                    lineNumber: 87,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/components/MissionProgress.tsx",
                                lineNumber: 86,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/MissionProgress.tsx",
                        lineNumber: 82,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/MissionProgress.tsx",
                lineNumber: 80,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mission-list",
                children: missions.map((mission)=>{
                    const progress = Math.min(mission.current / mission.target * 100, 100);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `mission-item ${mission.completed ? 'completed' : ''}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mission-info",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mission-title",
                                        children: [
                                            mission.completed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checkmark",
                                                children: "✓"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/MissionProgress.tsx",
                                                lineNumber: 104,
                                                columnNumber: 59
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            mission.title
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/MissionProgress.tsx",
                                        lineNumber: 103,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mission-description",
                                        children: mission.description
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/MissionProgress.tsx",
                                        lineNumber: 107,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/MissionProgress.tsx",
                                lineNumber: 102,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mission-status",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "mission-value",
                                        children: [
                                            mission.current.toFixed(1),
                                            " / ",
                                            mission.target,
                                            " ",
                                            mission.unit
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/MissionProgress.tsx",
                                        lineNumber: 110,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mission-progress-bar",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mission-progress-fill",
                                            style: {
                                                width: `${progress}%`
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/MissionProgress.tsx",
                                            lineNumber: 114,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/MissionProgress.tsx",
                                        lineNumber: 113,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/MissionProgress.tsx",
                                lineNumber: 109,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, mission.id, true, {
                        fileName: "[project]/src/components/MissionProgress.tsx",
                        lineNumber: 98,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0));
                })
            }, void 0, false, {
                fileName: "[project]/src/components/MissionProgress.tsx",
                lineNumber: 94,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/MissionProgress.tsx",
        lineNumber: 79,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = MissionProgress;
}),
"[project]/src/components/ControlsHelp.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
const ControlsHelp = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "controls-help",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "help-content",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "← : Left thrust"
                }, void 0, false, {
                    fileName: "[project]/src/components/ControlsHelp.tsx",
                    lineNumber: 7,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "→ : Right thrust"
                }, void 0, false, {
                    fileName: "[project]/src/components/ControlsHelp.tsx",
                    lineNumber: 8,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "↑ : Speed up"
                }, void 0, false, {
                    fileName: "[project]/src/components/ControlsHelp.tsx",
                    lineNumber: 9,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "↓ : Slow down"
                }, void 0, false, {
                    fileName: "[project]/src/components/ControlsHelp.tsx",
                    lineNumber: 10,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "R : Restart"
                }, void 0, false, {
                    fileName: "[project]/src/components/ControlsHelp.tsx",
                    lineNumber: 11,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ControlsHelp.tsx",
            lineNumber: 6,
            columnNumber: 13
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/components/ControlsHelp.tsx",
        lineNumber: 5,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = ControlsHelp;
}),
"[project]/src/components/SettingsPanel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
const SettingsPanel = ({ probeSpeedMult, setProbeSpeedMult, gravityG, setGravityG, starMass, setStarMass, gravityGridEnabled = false, setGravityGridEnabled = ()=>{}, gridEnabled = false, setGridEnabled = ()=>{} })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "settings-panel",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "settings-content",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "setting-item",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            children: [
                                "Probe speed multiplier: ",
                                probeSpeedMult.toFixed(2)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/SettingsPanel.tsx",
                            lineNumber: 32,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "range",
                            min: "0.95",
                            max: "1.50",
                            step: "0.01",
                            value: probeSpeedMult,
                            onChange: (e)=>setProbeSpeedMult(Number(e.target.value))
                        }, void 0, false, {
                            fileName: "[project]/src/components/SettingsPanel.tsx",
                            lineNumber: 33,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/SettingsPanel.tsx",
                    lineNumber: 31,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "setting-item",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            children: [
                                "Gravity G: ",
                                gravityG.toFixed(3)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/SettingsPanel.tsx",
                            lineNumber: 43,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "range",
                            min: "0.01",
                            max: "1.0",
                            step: "0.01",
                            value: gravityG,
                            onChange: (e)=>setGravityG(Number(e.target.value))
                        }, void 0, false, {
                            fileName: "[project]/src/components/SettingsPanel.tsx",
                            lineNumber: 44,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/SettingsPanel.tsx",
                    lineNumber: 42,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "setting-item",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            children: [
                                "Star mass: ",
                                Math.round(starMass).toLocaleString()
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/SettingsPanel.tsx",
                            lineNumber: 54,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "range",
                            min: "50000",
                            max: "500000",
                            step: "5000",
                            value: starMass,
                            onChange: (e)=>setStarMass(Number(e.target.value))
                        }, void 0, false, {
                            fileName: "[project]/src/components/SettingsPanel.tsx",
                            lineNumber: 55,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/SettingsPanel.tsx",
                    lineNumber: 53,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "setting-item",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "gravity-grid-checkbox",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                checked: gravityGridEnabled,
                                onChange: (e)=>setGravityGridEnabled(e.target.checked)
                            }, void 0, false, {
                                fileName: "[project]/src/components/SettingsPanel.tsx",
                                lineNumber: 66,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Show gravity well grid"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SettingsPanel.tsx",
                                lineNumber: 71,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/SettingsPanel.tsx",
                        lineNumber: 65,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/components/SettingsPanel.tsx",
                    lineNumber: 64,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "setting-item",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "gravity-grid-checkbox",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                checked: gridEnabled,
                                onChange: (e)=>setGridEnabled(e.target.checked)
                            }, void 0, false, {
                                fileName: "[project]/src/components/SettingsPanel.tsx",
                                lineNumber: 76,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Show flat grid"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SettingsPanel.tsx",
                                lineNumber: 81,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/SettingsPanel.tsx",
                        lineNumber: 75,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/components/SettingsPanel.tsx",
                    lineNumber: 74,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/SettingsPanel.tsx",
            lineNumber: 30,
            columnNumber: 13
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/components/SettingsPanel.tsx",
        lineNumber: 29,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = SettingsPanel;
}),
"[project]/src/components/HUD.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/page.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MiniChart$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/MiniChart.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MissionProgress$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/MissionProgress.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ControlsHelp$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ControlsHelp.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SettingsPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/SettingsPanel.tsx [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
const HUD = ({ status = 'Idle', velocity = 0, distance = 0, fuel = 100, slingshots = 0, velocityHistory = [], distanceHistory = [], probeSpeedMult = 1.05, setProbeSpeedMult = ()=>{}, gravityG = 0.133, setGravityG = ()=>{}, starMass = 333000, setStarMass = ()=>{}, gravityGridEnabled = false, setGravityGridEnabled = ()=>{}, gridEnabled = true, setGridEnabled = ()=>{}, selectedModel = 'space_fighter', setSelectedModel = ()=>{}, isSimulationStarted = false, setIsSimulationStarted = ()=>{} })=>{
    const [showCharts, setShowCharts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showMissions, setShowMissions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showHelp, setShowHelp] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showSettings, setShowSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleChartsToggle = ()=>{
        setShowCharts(!showCharts);
        if (!showCharts) {
            setShowMissions(false);
            setShowHelp(false);
            setShowSettings(false);
        }
    };
    const handleMissionsToggle = ()=>{
        setShowMissions(!showMissions);
        if (!showMissions) {
            setShowCharts(false);
            setShowHelp(false);
            setShowSettings(false);
        }
    };
    const handleHelpToggle = ()=>{
        setShowHelp(!showHelp);
        if (!showHelp) {
            setShowCharts(false);
            setShowMissions(false);
            setShowSettings(false);
        }
    };
    const handleSettingsToggle = ()=>{
        setShowSettings(!showSettings);
        if (!showSettings) {
            setShowCharts(false);
            setShowMissions(false);
            setShowHelp(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            !isSimulationStarted && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "start-screen",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "start-button",
                    onClick: ()=>setIsSimulationStarted(true),
                    children: "Free mode Start"
                }, void 0, false, {
                    fileName: "[project]/src/components/HUD.tsx",
                    lineNumber: 101,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 100,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: "ui",
                className: "hud-container hud-compact",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hud-compact-line",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-item",
                                children: [
                                    "STS:",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `stat-value status-${status.toLowerCase().replace(' ', '-')}`,
                                        children: status
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/HUD.tsx",
                                        lineNumber: 114,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 112,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-separator",
                                children: "|"
                            }, void 0, false, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 118,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-item",
                                children: [
                                    "V:",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "stat-value",
                                        children: velocity.toFixed(1)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/HUD.tsx",
                                        lineNumber: 120,
                                        columnNumber: 27
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    "km/s"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 119,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-separator",
                                children: "|"
                            }, void 0, false, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 122,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-item",
                                children: [
                                    "D:",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "stat-value",
                                        children: distance.toFixed(0)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/HUD.tsx",
                                        lineNumber: 124,
                                        columnNumber: 27
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    "AU"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 123,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-separator",
                                children: "|"
                            }, void 0, false, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 126,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-item",
                                children: [
                                    "Fuel:",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `stat-value ${fuel < 20 ? 'low-fuel' : ''}`,
                                        children: fuel.toFixed(1)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/HUD.tsx",
                                        lineNumber: 129,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 127,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 111,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hud-compact-line",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hud-toggle-buttons",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: `toggle-btn ${showCharts ? 'active' : ''}`,
                                    onClick: handleChartsToggle,
                                    title: "Toggle charts",
                                    children: "Charts"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/HUD.tsx",
                                    lineNumber: 138,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: `toggle-btn ${showMissions ? 'active' : ''}`,
                                    onClick: handleMissionsToggle,
                                    title: "Toggle mission progress",
                                    children: "Missions"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/HUD.tsx",
                                    lineNumber: 145,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: `toggle-btn ${showHelp ? 'active' : ''}`,
                                    onClick: handleHelpToggle,
                                    title: "Show controls",
                                    children: "Controls"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/HUD.tsx",
                                    lineNumber: 152,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: `toggle-btn ${showSettings ? 'active' : ''}`,
                                    onClick: handleSettingsToggle,
                                    title: "Simulation settings",
                                    children: "Settings"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/HUD.tsx",
                                    lineNumber: 159,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "model-selector",
                                    title: "Select probe model",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: selectedModel,
                                        onChange: (e)=>setSelectedModel(e.target.value),
                                        className: "model-dropdown",
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$page$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROBE_MODELS"].map((model)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: model.value,
                                                children: model.label
                                            }, model.value, false, {
                                                fileName: "[project]/src/components/HUD.tsx",
                                                lineNumber: 173,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/HUD.tsx",
                                        lineNumber: 167,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/HUD.tsx",
                                    lineNumber: 166,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/HUD.tsx",
                            lineNumber: 137,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 136,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 109,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            showCharts && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hud-charts-panel",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MiniChart$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        data: velocityHistory,
                        color: "#00ff88",
                        label: "Velocity",
                        unit: "km/s"
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 185,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MiniChart$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        data: distanceHistory,
                        color: "#00aaff",
                        label: "Distance",
                        unit: "AU"
                    }, void 0, false, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 191,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chart-slingshots",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "chart-label",
                                children: "Swing-by count:"
                            }, void 0, false, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 198,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "chart-current",
                                style: {
                                    color: '#0f0'
                                },
                                children: slingshots
                            }, void 0, false, {
                                fileName: "[project]/src/components/HUD.tsx",
                                lineNumber: 199,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/HUD.tsx",
                        lineNumber: 197,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 184,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            showMissions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hud-missions-panel",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MissionProgress$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    distance: distance,
                    velocity: velocity,
                    slingshots: slingshots,
                    fuel: fuel
                }, void 0, false, {
                    fileName: "[project]/src/components/HUD.tsx",
                    lineNumber: 206,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 205,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            showHelp && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hud-help-panel",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ControlsHelp$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/src/components/HUD.tsx",
                    lineNumber: 217,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 216,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            showSettings && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hud-settings-panel",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SettingsPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    probeSpeedMult: probeSpeedMult,
                    setProbeSpeedMult: setProbeSpeedMult,
                    gravityG: gravityG,
                    setGravityG: setGravityG,
                    starMass: starMass,
                    setStarMass: setStarMass,
                    gravityGridEnabled: gravityGridEnabled,
                    setGravityGridEnabled: setGravityGridEnabled,
                    gridEnabled: gridEnabled,
                    setGridEnabled: setGridEnabled
                }, void 0, false, {
                    fileName: "[project]/src/components/HUD.tsx",
                    lineNumber: 223,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/HUD.tsx",
                lineNumber: 222,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true);
};
const __TURBOPACK__default__export__ = HUD;
}),
"[project]/src/components/CameraControls.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
const CameraControls = ({ cameraView, setCameraView })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "camera-controls",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: `camera-btn ${cameraView === 'free' ? 'active' : ''}`,
                onClick: ()=>setCameraView('free'),
                title: "Free Camera View",
                children: "Free"
            }, void 0, false, {
                fileName: "[project]/src/components/CameraControls.tsx",
                lineNumber: 12,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: `camera-btn ${cameraView === 'top' ? 'active' : ''}`,
                onClick: ()=>setCameraView('top'),
                title: "Top View",
                children: "Top"
            }, void 0, false, {
                fileName: "[project]/src/components/CameraControls.tsx",
                lineNumber: 19,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: `camera-btn ${cameraView === 'probe' ? 'active' : ''}`,
                onClick: ()=>setCameraView('probe'),
                title: "Follow Probe View",
                children: "Follow"
            }, void 0, false, {
                fileName: "[project]/src/components/CameraControls.tsx",
                lineNumber: 26,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/CameraControls.tsx",
        lineNumber: 11,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = CameraControls;
}),
"[project]/src/components/TouchControls.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
const TouchControls = ()=>{
    const handleTouchStart = (key)=>(e)=>{
            e.preventDefault();
            if (key === 'restart') {
                // Call restart function
                if (window.__restartSimulation) {
                    window.__restartSimulation();
                }
            } else {
                // Set input state
                const inputState = window.__gameInputState;
                if (inputState) {
                    inputState[key] = true;
                }
            }
        };
    const handleTouchEnd = (key)=>(e)=>{
            e.preventDefault();
            const inputState = window.__gameInputState;
            if (inputState) {
                inputState[key] = false;
            }
        };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "touch-arrows",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "touch-row",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "touch-btn touch-btn-up",
                            onTouchStart: handleTouchStart('up'),
                            onTouchEnd: handleTouchEnd('up'),
                            onMouseDown: handleTouchStart('up'),
                            onMouseUp: handleTouchEnd('up'),
                            onMouseLeave: handleTouchEnd('up'),
                            children: "↑"
                        }, void 0, false, {
                            fileName: "[project]/src/components/TouchControls.tsx",
                            lineNumber: 33,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/TouchControls.tsx",
                        lineNumber: 32,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "touch-row",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "touch-btn touch-btn-left",
                                onTouchStart: handleTouchStart('left'),
                                onTouchEnd: handleTouchEnd('left'),
                                onMouseDown: handleTouchStart('left'),
                                onMouseUp: handleTouchEnd('left'),
                                onMouseLeave: handleTouchEnd('left'),
                                children: "←"
                            }, void 0, false, {
                                fileName: "[project]/src/components/TouchControls.tsx",
                                lineNumber: 45,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "touch-btn touch-btn-down",
                                onTouchStart: handleTouchStart('down'),
                                onTouchEnd: handleTouchEnd('down'),
                                onMouseDown: handleTouchStart('down'),
                                onMouseUp: handleTouchEnd('down'),
                                onMouseLeave: handleTouchEnd('down'),
                                children: "↓"
                            }, void 0, false, {
                                fileName: "[project]/src/components/TouchControls.tsx",
                                lineNumber: 55,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "touch-btn touch-btn-right",
                                onTouchStart: handleTouchStart('right'),
                                onTouchEnd: handleTouchEnd('right'),
                                onMouseDown: handleTouchStart('right'),
                                onMouseUp: handleTouchEnd('right'),
                                onMouseLeave: handleTouchEnd('right'),
                                children: "→"
                            }, void 0, false, {
                                fileName: "[project]/src/components/TouchControls.tsx",
                                lineNumber: 65,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/TouchControls.tsx",
                        lineNumber: 44,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/TouchControls.tsx",
                lineNumber: 31,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "touch-restart",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "touch-btn touch-btn-restart",
                    onTouchStart: handleTouchStart('restart'),
                    onMouseDown: handleTouchStart('restart'),
                    children: "R"
                }, void 0, false, {
                    fileName: "[project]/src/components/TouchControls.tsx",
                    lineNumber: 80,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/TouchControls.tsx",
                lineNumber: 79,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true);
};
const __TURBOPACK__default__export__ = TouchControls;
}),
"[project]/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PROBE_MODELS",
    ()=>PROBE_MODELS,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GameCanvas$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GameCanvas.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$HUD$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/HUD.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CameraControls$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CameraControls.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$TouchControls$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/TouchControls.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/threeSetup.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
const PROBE_MODELS = [
    {
        value: 'voyager',
        label: 'Voyager (Built-in)',
        path: null,
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'space_fighter',
        label: 'Space Fighter',
        path: '/models/space_fighter.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'space_shuttle',
        label: 'Space Shuttle',
        path: '/models/space_shuttle.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'space_shuttle_2',
        label: 'Space Shuttle 2',
        path: '/models/space_shuttle_2.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'space_ship',
        label: 'Space Ship',
        path: '/models/space_ship.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'space_ship_2',
        label: 'Space Ship 2',
        path: '/models/space_ship_2.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'space_fighter_3',
        label: 'Space Fighter 3',
        path: '/models/space_fighter_3.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'lego_scooter',
        label: 'LEGO Space Scooter',
        path: '/models/lego_885_-_space_scooter.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'sputnik',
        label: 'Retro Sputnik',
        path: '/models/space_retro_sputnik.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    },
    {
        value: 'station_2001',
        label: 'Space Station (2001)',
        path: '/models/space_station_v_2001_a_space_odyssey.glb',
        orientation: {
            autoAlign: true,
            invertDirection: true
        }
    }
];
const Page = ()=>{
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('Stopped');
    const [velocity, setVelocity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [distance, setDistance] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [fuel, setFuel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(100);
    const [slingshots, setSlingshots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    // Simulation control
    const [isSimulationStarted, setIsSimulationStarted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // 履歴データの保存（最大100ポイント）
    const [velocityHistory, setVelocityHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [distanceHistory, setDistanceHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const startTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(Date.now());
    // simulation tuning parameters (editable via Controls)
    const [probeSpeedMult, setProbeSpeedMult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1.05);
    const [gravityG, setGravityG] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].G);
    const [starMass, setStarMass] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$threeSetup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PHYSICS_SCALE"].SUN_MASS);
    const [cameraView, setCameraView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('free');
    const [gravityGridEnabled, setGravityGridEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [gridEnabled, setGridEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedModel, setSelectedModel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('space_fighter');
    // 履歴データ付きセッター
    const setVelocityWithHistory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value)=>{
        setVelocity(value);
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // 秒単位
        setVelocityHistory((prev)=>{
            const updated = [
                ...prev,
                {
                    time: elapsed,
                    value
                }
            ];
            return updated.slice(-100); // 最大100ポイント
        });
    }, []);
    const setDistanceWithHistory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value)=>{
        setDistance(value);
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDistanceHistory((prev)=>{
            const updated = [
                ...prev,
                {
                    time: elapsed,
                    value
                }
            ];
            return updated.slice(-100);
        });
    }, []);
    // stable setters object to pass down (memoized so reference is stable)
    const hudSetters = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(()=>({
            setStatus,
            setVelocity: setVelocityWithHistory,
            setDistance: setDistanceWithHistory,
            setFuel,
            setSlingshots
        }), [
        setStatus,
        setVelocityWithHistory,
        setDistanceWithHistory,
        setFuel,
        setSlingshots
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GameCanvas$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                hudSetters: hudSetters,
                probeSpeedMult: probeSpeedMult,
                gravityG: gravityG,
                starMass: starMass,
                cameraView: cameraView,
                gravityGridEnabled: gravityGridEnabled,
                setGravityGridEnabled: setGravityGridEnabled,
                gridEnabled: gridEnabled,
                setGridEnabled: setGridEnabled,
                selectedModel: selectedModel,
                isSimulationStarted: isSimulationStarted
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 91,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$HUD$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                status: status,
                velocity: velocity,
                distance: distance,
                fuel: fuel,
                slingshots: slingshots,
                velocityHistory: velocityHistory,
                distanceHistory: distanceHistory,
                probeSpeedMult: probeSpeedMult,
                setProbeSpeedMult: setProbeSpeedMult,
                gravityG: gravityG,
                setGravityG: setGravityG,
                starMass: starMass,
                setStarMass: setStarMass,
                gravityGridEnabled: gravityGridEnabled,
                setGravityGridEnabled: setGravityGridEnabled,
                gridEnabled: gridEnabled,
                setGridEnabled: setGridEnabled,
                selectedModel: selectedModel,
                setSelectedModel: setSelectedModel,
                isSimulationStarted: isSimulationStarted,
                setIsSimulationStarted: setIsSimulationStarted
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 92,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CameraControls$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                cameraView: cameraView,
                setCameraView: setCameraView
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 115,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$TouchControls$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 116,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 90,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = Page;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b699b231._.js.map