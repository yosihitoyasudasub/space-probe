import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Body, cloneBodies, stepBodies } from './physics';

// ====================================================================
// Physics Scale Factors and Units
// ====================================================================
// This simulation uses a scaled unit system for game playability:
// - Mass: Earth mass = 1.0, Sun mass = 333,000 (realistic ratio)
// - Distance: 1 AU = 100 scene units
// - Time: Accelerated by factor of ~1,000,000 (1 real second ≈ 11.6 simulation days)
// - This gives Earth orbital period of ~30 seconds (vs 365 days in reality)
// ====================================================================

export const PHYSICS_SCALE = {
    // Mass scale: Earth mass = 1.0
    EARTH_MASS: 1.0,
    SUN_MASS: 333000,  // Realistic Sun/Earth mass ratio

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
    VELOCITY_TO_KM_PER_SEC: 1.43,  // multiply scene velocity by this to get km/s

    // Fuel consumption rate: % consumed per unit delta-v
    // With dvScale = 0.02, single direction thrust consumes 0.02% per frame
    // Total fuel = 100%, allows ~5000 frames (~83 seconds at 60fps) of continuous thrust
    FUEL_CONSUMPTION_RATE: 1.0,
};

// Legacy constant for backward compatibility
export const DEFAULT_G = PHYSICS_SCALE.G;

export type ProbeState = {
    position: THREE.Vector3;
    velocity: THREE.Vector3; // vector velocity in scene units/sec
    distance: number; // accumulated path length
    fuel: number; // percent
    slingshots: number;
    status: string;
};

export function initThreeJS(canvas: HTMLCanvasElement, options?: { probeSpeedMult?: number; G?: number; starMass?: number }) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50000);
    camera.position.set(0, 400, 2200);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7.5);
    scene.add(directional);

    // Simple grid for reference (large enough to show outer planets)
    const grid = new THREE.GridHelper(7000, 140, 0x444444, 0x222222);
    scene.add(grid);

    // Create a list of bodies: central star, planets, probe
    const bodies: Body[] = [];
    const planetMeshes: { id: string; mesh: THREE.Mesh }[] = [];

    // central star at origin (can be overridden via options)
    const starMass = options?.starMass ?? PHYSICS_SCALE.SUN_MASS;
    const starGeom = new THREE.SphereGeometry(5, 24, 24);
    const starMat = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0x220000 });
    const starMesh = new THREE.Mesh(starGeom, starMat);
    starMesh.position.set(0, 0, 0);
    scene.add(starMesh);
    // allow the star to move under gravity (we'll initialize COM-zero velocities below)
    bodies.push({ id: 'star', mass: starMass, position: [0, 0, 0], velocity: [0, 0, 0], radius: 5, isProbe: false });

    // Solar system-like planets (units: 1 AU = 100 scene units)
    const AU = PHYSICS_SCALE.AU;
    const solarDefs = [
        { id: 'Mercury', rAU: 0.39, radius: 3, color: 0xaaaaaa, phase: 0, mass: 0.055 },
        { id: 'Venus',   rAU: 0.72, radius: 5, color: 0xffddaa, phase: 0.5, mass: 0.815 },
        { id: 'Earth',   rAU: 1.00, radius: 5.5, color: 0x3366ff, phase: 1.0, mass: 1.0 },
        { id: 'Mars',    rAU: 1.52, radius: 4, color: 0xff6633, phase: 1.6, mass: 0.107 },
        { id: 'Jupiter', rAU: 5.20, radius: 14, color: 0xffcc77, phase: 2.2, mass: 317.8 },
        { id: 'Saturn',  rAU: 9.58, radius: 12, color: 0xffee88, phase: 3.0, mass: 95.16 },
        { id: 'Uranus',  rAU:19.20, radius: 9, color: 0x88ccff, phase: 4.0, mass: 14.5 },
        { id: 'Neptune', rAU:30.05, radius: 9, color: 0x3366aa, phase: 5.0, mass: 17.1 },
    ];

    const starMassScaled = starMass; // use starMass as mass scale
    for (const pd of solarDefs) {
        const pdR = pd.rAU * AU;
        const geom = new THREE.SphereGeometry(pd.radius, 16, 16);
        const mat = new THREE.MeshStandardMaterial({ color: pd.color });
        const mesh = new THREE.Mesh(geom, mat);
        const x = Math.sin(pd.phase) * pdR;
        const z = Math.cos(pd.phase) * pdR;
        mesh.position.set(x, 0, z);
        scene.add(mesh);
        planetMeshes.push({ id: pd.id, mesh });
    const gVal = options?.G ?? DEFAULT_G;
    const v = Math.sqrt((gVal * starMassScaled) / pdR);
        const vx = v * Math.cos(pd.phase);
        const vz = -v * Math.sin(pd.phase);
        bodies.push({ id: pd.id, mass: pd.mass, position: [x, 0, z], velocity: [vx, 0, vz], radius: pd.radius });
    }

    // probe initial (starts at 1.0 AU - Earth orbit distance)
    const probeGeom = new THREE.SphereGeometry(0.6, 10, 10);
    const probeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const probe = new THREE.Mesh(probeGeom, probeMat);
    const probeR = 100;  // 1.0 AU (same as Earth orbit)
    probe.position.set(0, 0, probeR);
    scene.add(probe);
    const gVal = options?.G ?? DEFAULT_G;
    const probeMult = options?.probeSpeedMult ?? 1.05;  // Realistic escape velocity (5% above circular)
    const vCircular = Math.sqrt((gVal * starMass) / probeR);
    const probeBody: Body = { id: 'probe', mass: 1, position: [0, 0, probeR], velocity: [vCircular * probeMult, 0, 0], radius: 0.6, isProbe: true };
    bodies.push(probeBody);

    // --- CENTER-OF-MASS (COM) velocity zeroing ---
    // After creating all bodies, compute total momentum and apply a uniform
    // velocity offset so total momentum is zero. This keeps the system's
    // center-of-mass stationary while allowing the star to move.
    (function zeroCOM() {
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
            // subtract COM velocity from each body so net momentum becomes zero
            for (const b of bodies) {
                b.velocity[0] -= vx;
                b.velocity[1] -= vy;
                b.velocity[2] -= vz;
            }
            console.log('COM-zero velocity applied, offset:', vx.toFixed(6), vy.toFixed(6), vz.toFixed(6));
        }
    })();

    // (COM position zeroing will be performed once after state is created)

    // OrbitControls for interactive camera
    const controls = new OrbitControls(camera, renderer.domElement);
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
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            // Position: random spherical distribution
            const radius = 5000 + Math.random() * 10000; // 5000-15000 range
            const theta = Math.random() * Math.PI * 2;   // 0-2π
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

        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);
    }

    createStarField();

    // Trail (orbit path) - sample points stored as Vector3 and rendered smooth via Catmull-Rom
    const trailPoints: THREE.Vector3[] = [];
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88 });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);

    function addTrailPoint(p: THREE.Vector3) {
        const maxPoints = 2000;
        trailPoints.push(p.clone());
        if (trailPoints.length > maxPoints) {
            trailPoints.shift();
        }

        if (trailPoints.length >= 2) {
            const curve = new THREE.CatmullRomCurve3(trailPoints, false, 'catmullrom', 0.5);
            const divisions = Math.min(Math.max(trailPoints.length * 6, 64), 3000);
            const smoothPoints = curve.getPoints(divisions);
            const positions: number[] = [];
            for (let i = 0; i < smoothPoints.length; i++) {
                positions.push(smoothPoints[i].x, smoothPoints[i].y, smoothPoints[i].z);
            }
            trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            trailGeometry.setDrawRange(0, positions.length / 3);
            trailGeometry.computeBoundingSphere();
        }
    }

    // ====================================================================
    // Velocity Vector Visualization
    // ====================================================================
    // Display probe's velocity as an arrow (direction and magnitude)
    const velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0), // initial direction
        probe.position,              // origin
        10,                          // length
        0xff0000,                    // color (red)
        3,                           // head length
        2                            // head width
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

    // ====================================================================
    // Swing-by Influence Zones Visualization
    // ====================================================================
    // Display encounter radius around each planet as a torus (donut ring)
    const influenceZones: THREE.Mesh[] = [];

    for (const pm of planetMeshes) {
        const planetData = solarDefs.find(pd => pd.id === pm.id);
        if (!planetData) continue;

        const encounterRadius = planetData.radius * 2.5; // encounterMultiplier

        // Create torus (ring)
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
        torus.position.copy(pm.mesh.position);
        scene.add(torus);
        influenceZones.push(torus);

        // Store reference for updating position
        (pm as any).influenceZone = torus;
    }

    // ====================================================================
    // Planetary Orbit Visualization
    // ====================================================================
    // Display circular orbits for each planet
    const orbitLines: THREE.Line[] = [];

    for (const pd of solarDefs) {
        const orbitRadius = pd.rAU * AU;
        const segments = 128; // Number of points in the circle
        const points: THREE.Vector3[] = [];

        // Create circle points
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * orbitRadius;
            const z = Math.sin(theta) * orbitRadius;
            points.push(new THREE.Vector3(x, 0, z));
        }

        // Create line geometry
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

    // ====================================================================
    // Predicted Trajectory Visualization (Phase 2)
    // ====================================================================
    // Display future trajectory based on current velocity and gravity
    const predictionPoints: THREE.Vector3[] = [];
    const predictionGeometry = new THREE.BufferGeometry();
    const predictionMaterial = new THREE.LineDashedMaterial({
        color: 0xffaa00,
        dashSize: 3,
        gapSize: 2,
        linewidth: 1,
        transparent: true,
        opacity: 0.6
    });
    const predictionLine = new THREE.Line(predictionGeometry, predictionMaterial);
    scene.add(predictionLine);

    // Success prediction indicators (text sprites near planets)
    const successIndicators: { planetId: string; mesh: THREE.Sprite; probability: number }[] = [];

    function createTextSprite(text: string, color: number = 0xffffff): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 128;
        context.font = 'Bold 48px Arial';
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(20, 10, 1);
        return sprite;
    }

    // Create success indicators for each planet
    for (const pm of planetMeshes) {
        const sprite = createTextSprite('', 0x00ff00);
        sprite.visible = false;
        scene.add(sprite);
        successIndicators.push({ planetId: pm.id, mesh: sprite, probability: 0 });
    }

    let lastPredictionUpdate = 0;
    const predictionUpdateInterval = 500; // Update every 500ms

    function updatePredictedTrajectory() {
        const now = performance.now();
        if (now - lastPredictionUpdate < predictionUpdateInterval) return;
        lastPredictionUpdate = now;

        // Clone current bodies state for prediction
        const predictedBodies = cloneBodies(bodies);
        const probeIndex = predictedBodies.findIndex(b => b.id === 'probe');
        if (probeIndex < 0) return;

        // Run simulation forward for predictionTime seconds
        const predictionTime = 15; // seconds
        const predictionSteps = 150; // number of points
        const dt = predictionTime / predictionSteps;

        predictionPoints.length = 0;
        predictionPoints.push(new THREE.Vector3(
            predictedBodies[probeIndex].position[0],
            predictedBodies[probeIndex].position[1],
            predictedBodies[probeIndex].position[2]
        ));

        // Reset success probabilities
        for (const indicator of successIndicators) {
            indicator.probability = 0;
        }

        const gRun = options?.G ?? DEFAULT_G;
        let predSimTime = simTime;

        // Simulate future trajectory
        for (let i = 0; i < predictionSteps; i++) {
            const { bodies: nextBodies, events } = stepBodies(predictedBodies, dt, gRun, predSimTime, 0.5, swingOptions);
            predSimTime += dt;

            // Copy nextBodies back to predictedBodies (safely handle type)
            for (let j = 0; j < nextBodies.length; j++) {
                predictedBodies[j] = { ...nextBodies[j] } as any;
            }

            // Store probe position
            const probePos = predictedBodies[probeIndex].position;
            predictionPoints.push(new THREE.Vector3(probePos[0], probePos[1], probePos[2]));

            // Check for predicted swing-bys
            if (events && events.swingBys && events.swingBys.length > 0) {
                for (const ev of events.swingBys) {
                    if (ev.probeId === 'probe') {
                        const indicator = successIndicators.find(ind => ind.planetId === ev.bodyId);
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
            const positions: number[] = [];
            for (const point of predictionPoints) {
                positions.push(point.x, point.y, point.z);
            }
            predictionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            predictionGeometry.computeBoundingSphere();
            predictionLine.computeLineDistances(); // Required for dashed lines
            predictionLine.visible = true;
        } else {
            predictionLine.visible = false;
        }

        // Update success indicators
        for (const indicator of successIndicators) {
            if (indicator.probability > 0) {
                const pm = planetMeshes.find(p => p.id === indicator.planetId);
                if (pm) {
                    // Position indicator above planet
                    const planetData = solarDefs.find(pd => pd.id === indicator.planetId);
                    const offset = planetData ? planetData.radius * 4 : 30;
                    indicator.mesh.position.set(
                        pm.mesh.position.x,
                        pm.mesh.position.y + offset,
                        pm.mesh.position.z
                    );

                    // Update text based on probability
                    const probabilityText = `${Math.round(indicator.probability)}%`;
                    const color = indicator.probability > 70 ? 0x00ff00 :
                                  indicator.probability > 40 ? 0xffaa00 : 0xff0000;

                    // Update sprite texture
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d')!;
                    canvas.width = 256;
                    canvas.height = 128;
                    context.font = 'Bold 48px Arial';
                    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(probabilityText, 128, 64);

                    const texture = new THREE.CanvasTexture(canvas);
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
    const state: ProbeState = {
        position: probe.position.clone(),
        velocity: new THREE.Vector3(probeBody.velocity[0], probeBody.velocity[1], probeBody.velocity[2]),
        distance: 0,
        fuel: 100,
        slingshots: 0,
        status: 'Idle',
    };

    // --- CENTER-OF-MASS (COM) position zeroing ---
    // Shift all body positions so that the initial center-of-mass position is at the origin.
    (function zeroCOMPosition() {
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
            // subtract COM position from each body's position
            for (const b of bodies) {
                b.position[0] -= cx;
                b.position[1] -= cy;
                b.position[2] -= cz;
            }
            // adjust visual meshes to match new positions
            try {
                starMesh.position.set(bodies.find((b) => b.id === 'star')!.position[0], bodies.find((b) => b.id === 'star')!.position[1], bodies.find((b) => b.id === 'star')!.position[2]);
                for (const pm of planetMeshes) {
                    const b = bodies.find((bb) => bb.id === pm.id);
                    if (b) pm.mesh.position.set(b.position[0], b.position[1], b.position[2]);
                }
                // probe
                const pb = bodies.find((b) => b.id === 'probe');
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
        encounterMultiplier: 2.5,   // Slightly wider detection radius
        deltaVThreshold: 0.01,      // Lower threshold to catch smaller effects (was 0.03)
        minGap: 0.4                 // Shorter cooldown between detections
    };

    // simple visual markers for swing-by events
    const eventMarkers: THREE.Mesh[] = [];

    function stepSimulation(dt: number) {
        // call physics.stepBodies with plain-data bodies
        const gRun = options?.G ?? DEFAULT_G;
        const { bodies: nextBodies, events } = stepBodies(bodies, dt, gRun, simTime, 0.5, swingOptions);
        simTime += dt;

        // apply nextBodies back to visuals and local bodies
        for (const nb of nextBodies) {
                const idx = bodies.findIndex((b) => b.id === nb.id);
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
                state.distance += vecLen([nb.velocity[0] * dt, nb.velocity[1] * dt, nb.velocity[2] * dt]);
                // Update status: check fuel first, then velocity
                if (state.fuel <= 0) {
                    state.status = 'Fuel Depleted';
                } else {
                    state.status = state.velocity.length() > 1e-3 ? 'Running' : 'Idle';
                }
            }
            // update planet meshes (check if this body's id is in planetMeshes array)
            const pm = planetMeshes.find((p) => p.id === nb.id);
            if (pm) {
                pm.mesh.position.set(nb.position[0], nb.position[1], nb.position[2]);
                // Update influence zone position to match planet
                if ((pm as any).influenceZone) {
                    (pm as any).influenceZone.position.copy(pm.mesh.position);
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
            for (const ev of events.swingBys) {
                if (ev.probeId === 'probe') {
                    state.slingshots += 1;
                    console.log(`Swing-by detected at t=${ev.time.toFixed(2)}: probe around ${ev.bodyId} deltaV=${ev.deltaV.toFixed(3)}`);
                    // find body position for marker
                    const body = nextBodies.find((b) => b.id === ev.bodyId);
                    if (body) {
                        const markerGeom = new THREE.SphereGeometry(0.8, 8, 8);
                        const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                        const marker = new THREE.Mesh(markerGeom, markerMat);
                        marker.position.set(body.position[0], body.position[1], body.position[2]);
                        scene.add(marker);
                        eventMarkers.push(marker);
                        // fade out marker after 1.2s
                        setTimeout(() => {
                            scene.remove(marker);
                            const i = eventMarkers.indexOf(marker);
                            if (i >= 0) eventMarkers.splice(i, 1);
                        }, 1200);
                    }
                    // flash probe material if available
                    try {
                        const mat: any = probe.material;
                        if (mat && mat.emissive) {
                            const prev = mat.emissive.clone ? mat.emissive.clone() : null;
                            mat.emissive.setHex(0xff4444);
                            setTimeout(() => {
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
        const mod = (dv: [number, number, number]) => {
            const idx = bodies.findIndex((b) => b.id === 'probe');
            if (idx >= 0) {
                bodies[idx].velocity[0] += dv[0];
                bodies[idx].velocity[1] += dv[1];
                bodies[idx].velocity[2] += dv[2];
            }
        };
        try {
            // expose on window so consumer code in GameCanvas can call it reliably
            (window as any).__applyDeltaVToProbe = mod;
        } catch (e) {
            // ignore if window isn't available
        }
    })();

    function dispose() {
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        scene.traverse((obj: any) => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mat = obj.material as any;
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose && m.dispose());
                else mat.dispose && mat.dispose();
            }
        });
    }

    return { scene, camera, renderer, dispose, state, probe, controls, addTrailPoint, stepSimulation };
}

// small helper to allow external callers to apply delta-v to the probe
// We'll export a typed wrapper that others can call if they capture the
// init's return value; but for convenience also provide this function
// that will be replaced when initThreeJS is called.
export function applyDeltaVToProbe(_dv: [number, number, number]) {
    // no-op placeholder; actual implementation bound in initThreeJS's closure
    console.warn('applyDeltaVToProbe called before init; ignoring');
}

// small helper to compute vector length for [x,y,z]
function vecLen(v: [number, number, number]) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export default initThreeJS;
