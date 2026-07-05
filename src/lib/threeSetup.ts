import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { Body, stepBodies } from './physics';
import { PHYSICS_SCALE, DEFAULT_G, SWING_BY_OPTIONS, GRID_SIZE, FLAT_GRID_DIVISIONS } from './constants';
import { InitOptions, ProbeOrientation, ProbeState } from './types';
import { createVoyagerProbe, loadGLBProbe, ProbeObject } from './probeFactory';
import { createSolarSystem, zeroCenterOfMassVelocity, zeroCenterOfMassPosition } from './solarSystem';
import { createStarField } from './starField';
import { createTrail } from './trail';
import { createGravityWellGrid } from './gravityWell';
import { createTrajectoryPrediction } from './prediction';

// Re-export the public API that other modules import from here
export { PHYSICS_SCALE, DEFAULT_G };
export type { ProbeState };

export function initThreeJS(canvas: HTMLCanvasElement, options?: InitOptions) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50000);
    camera.position.set(0, 400, 2200);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Setup post-processing for bloom effect
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // Bloom pass for glowing sun
    composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,  // strength
        0.4,  // radius
        0.85  // threshold
    ));

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7.5);
    scene.add(directional);

    // Simple flat grid for reference
    const grid = new THREE.GridHelper(GRID_SIZE, FLAT_GRID_DIVISIONS, 0x444444, 0x222222);
    grid.visible = options?.gridEnabled ?? true;
    scene.add(grid);

    const gVal = options?.G ?? DEFAULT_G;
    const starMass = options?.starMass ?? PHYSICS_SCALE.SUN_MASS;

    // Central star and planets: meshes, physics bodies, orbit lines, influence zones
    const { bodies, starMesh, planets } = createSolarSystem(scene, { starMass, G: gVal });

    // Gravity well grid, deformed by the bodies' gravitational potential
    const gravityWell = createGravityWellGrid(scene, bodies, () => options?.G ?? DEFAULT_G, options?.gravityGridEnabled ?? false);

    // probe initial (starts at 1.0 AU - Earth orbit distance)
    // Create Voyager-style probe (will be replaced by GLB model if loading succeeds)
    let probe: ProbeObject = createVoyagerProbe();

    const probeR = 100;  // 1.0 AU (same as Earth orbit)
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
        loadGLBProbe(
            modelPath,
            (loadedModel) => {
                // Success: replace the probe with the loaded GLB model
                loadedModel.position.copy(probe.position);
                scene.remove(probe);
                scene.add(loadedModel);
                probe = loadedModel;
                console.log('Probe replaced with GLB model successfully');
            },
            (error) => {
                // Error: keep using the Voyager probe as fallback
                console.error('Failed to load GLB model, using Voyager probe as fallback:', error);
                probe.visible = true;
            },
            options?.orientation
        );
    } else {
        console.log('Using built-in Voyager probe (no GLB model specified)');
    }

    const probeMult = options?.probeSpeedMult ?? 1.05;  // Realistic escape velocity (5% above circular)
    const vCircular = Math.sqrt((gVal * starMass) / probeR);
    const probeBody: Body = { id: 'probe', mass: 1, position: [0, 0, probeR], velocity: [vCircular * probeMult, 0, 0], radius: 0.6, isProbe: true };
    bodies.push(probeBody);

    // Keep the system's center of mass stationary while allowing the star to move
    zeroCenterOfMassVelocity(bodies);

    // OrbitControls for interactive camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.update();

    createStarField(scene);

    const trail = createTrail(scene);

    let simTime = 0;

    const prediction = createTrajectoryPrediction(scene, {
        bodies,
        planets,
        getG: () => options?.G ?? DEFAULT_G,
        getSimTime: () => simTime,
    });

    // Simulation state derived from bodies: expose probe state for HUD and visual sync
    const state: ProbeState = {
        position: probe.position.clone(),
        velocity: new THREE.Vector3(probeBody.velocity[0], probeBody.velocity[1], probeBody.velocity[2]),
        distance: 0,
        fuel: 100,
        slingshots: 0,
        status: 'Idle',
    };

    // Shift the initial center of mass to the origin and sync visuals
    zeroCenterOfMassPosition(bodies);
    (function syncMeshesToBodies() {
        const starBody = bodies.find((b) => b.id === 'star');
        if (starBody) starMesh.position.set(starBody.position[0], starBody.position[1], starBody.position[2]);
        for (const pm of planets) {
            const b = bodies.find((bb) => bb.id === pm.id);
            if (b) pm.mesh.position.set(b.position[0], b.position[1], b.position[2]);
        }
        const pb = bodies.find((b) => b.id === 'probe');
        if (pb) {
            probe.position.set(pb.position[0], pb.position[1], pb.position[2]);
            state.position.copy(probe.position);
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

    // simple visual markers for swing-by events
    const eventMarkers: THREE.Mesh[] = [];

    function updateProbeFromBody(nb: Body, dt: number) {
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

        // Smoothly rotate probe to face velocity direction
        const speed = state.velocity.length();
        if (speed > 0.1) { // Only rotate if moving fast enough
            const direction = state.velocity.clone().normalize();

            // Invert direction if configured (for models that face backwards);
            // default to true for backward compatibility
            const shouldInvert = probe.orientationConfig?.invertDirection ?? true;
            if (shouldInvert) {
                direction.negate();
            }

            // Create a matrix that looks in the velocity direction
            const targetMatrix = new THREE.Matrix4();
            targetMatrix.lookAt(
                new THREE.Vector3(0, 0, 0),  // origin
                direction,
                new THREE.Vector3(0, 1, 0)   // up vector
            );
            const targetQuaternion = new THREE.Quaternion();
            targetQuaternion.setFromRotationMatrix(targetMatrix);

            // Smoothly interpolate (slerp) from current to target rotation
            // Lower value = smoother/slower rotation, higher = faster
            const rotationSpeed = 0.15; // 15% per frame
            probe.quaternion.slerp(targetQuaternion, rotationSpeed);
        }
    }

    function flashSwingByMarker(body: Body) {
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

    function flashProbeEmissive() {
        try {
            const bodyMesh: any = probe.children[0]; // Main body is first child
            const mat: any = bodyMesh?.material;
            if (mat && mat.emissive) {
                const prev = mat.emissive.clone ? mat.emissive.clone() : null;
                mat.emissive.setHex(0xff4444);
                setTimeout(() => {
                    if (prev && mat.emissive && mat.emissive.set) mat.emissive.copy(prev);
                }, 500);
            }
        } catch {
            // ignore material issues
        }
    }

    function stepSimulation(dt: number) {
        // call physics.stepBodies with plain-data bodies
        const gRun = options?.G ?? DEFAULT_G;
        const { bodies: nextBodies, events } = stepBodies(bodies, dt, gRun, simTime, 0.5, SWING_BY_OPTIONS);
        simTime += dt;

        // apply nextBodies back to visuals and local bodies
        for (const nb of nextBodies) {
            const idx = bodies.findIndex((b) => b.id === nb.id);
            // if the body is marked static, don't overwrite its position
            const orig = idx >= 0 ? bodies[idx] : null;
            if (idx >= 0 && !orig?.isStatic) {
                bodies[idx] = nb;
            }
            // apply to meshes
            if (nb.id === 'probe') {
                updateProbeFromBody(nb, dt);
            }
            const pm = planets.find((p) => p.id === nb.id);
            if (pm) {
                pm.mesh.position.set(nb.position[0], nb.position[1], nb.position[2]);
                // Update influence zone position to match planet
                pm.influenceZone.position.copy(pm.mesh.position);
            }
            // (star is movable) synchronize star mesh to its simulated position
            if (nb.id === 'star') {
                starMesh.position.set(nb.position[0], nb.position[1], nb.position[2]);
            }
        }

        prediction.update();
        gravityWell.update();

        // handle events (swing-bys)
        for (const ev of events.swingBys) {
            if (ev.probeId !== 'probe') continue;
            state.slingshots += 1;
            console.log(`Swing-by detected at t=${ev.time.toFixed(2)}: probe around ${ev.bodyId} deltaV=${ev.deltaV.toFixed(3)}`);
            const body = nextBodies.find((b) => b.id === ev.bodyId);
            if (body) flashSwingByMarker(body);
            flashProbeEmissive();
        }
    }

    function applyDeltaV(dv: [number, number, number]) {
        const idx = bodies.findIndex((b) => b.id === 'probe');
        if (idx >= 0) {
            bodies[idx].velocity[0] += dv[0];
            bodies[idx].velocity[1] += dv[1];
            bodies[idx].velocity[2] += dv[2];
        }
    }

    // Toggle gravity grid visibility
    function updateGravityGrid(enabled: boolean) {
        gravityWell.setVisible(enabled);
    }

    // Toggle flat grid visibility
    function updateGrid(enabled: boolean) {
        grid.visible = enabled;
    }

    function dispose() {
        window.removeEventListener('resize', onResize);
        composer.dispose();
        renderer.dispose();
        scene.traverse((obj: any) => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mat = obj.material as any;
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
                else mat.dispose?.();
            }
        });
    }

    // Switch probe model without resetting state
    function switchProbeModel(newModelPath: string | null, orientation?: ProbeOrientation) {
        // Save current state
        const currentPosition = probe.position.clone();
        const currentRotation = probe.quaternion.clone();

        if (newModelPath) {
            loadGLBProbe(
                newModelPath,
                (loadedModel) => {
                    // Apply saved state to new model
                    loadedModel.position.copy(currentPosition);
                    loadedModel.quaternion.copy(currentRotation);
                    scene.remove(probe);
                    scene.add(loadedModel);
                    probe = loadedModel;
                    console.log('Probe model switched successfully');
                },
                (error) => {
                    console.error('Failed to switch probe model:', error);
                },
                orientation
            );
        } else {
            // Use built-in Voyager
            const newProbe = createVoyagerProbe();
            newProbe.position.copy(currentPosition);
            newProbe.quaternion.copy(currentRotation);
            newProbe.orientationConfig = orientation;
            scene.remove(probe);
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
        addTrailPoint: trail.addPoint,
        stepSimulation,
        applyDeltaV,
        updateGravityGrid,
        updateGrid,
        switchProbeModel,
    };
}

// small helper to compute vector length for [x,y,z]
function vecLen(v: [number, number, number]) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export default initThreeJS;
