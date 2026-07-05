import { initThreeJS, PHYSICS_SCALE } from './threeSetup';
import { computeThrustDV, InputState } from './thrust';
import { CameraView, HudSample, InitOptions } from './types';

export type ThreeSetup = ReturnType<typeof initThreeJS>;

export type GameLoopConfig = {
    canvas: HTMLCanvasElement;
    /** Shared input state; mutated by the keyboard here and by external touch UI */
    input: InputState;
    /** Simulation options; re-evaluated on every (re)start */
    getOptions: () => InitOptions;
    getCameraView: () => CameraView;
    /** Physics only advances while this returns true */
    isSimulationStarted: () => boolean;
    /** Receives throttled HUD samples */
    onHudSample?: (sample: HudSample) => void;
};

export type GameLoop = {
    /** Initialize the scene, wire keyboard input, and start the loop */
    start: () => void;
    /** Tear down the current scene and start over with fresh options */
    restart: () => void;
    /** Stop the loop and release all resources */
    dispose: () => void;
    /** Access the live Three.js setup (grid toggles, model switching) */
    getThree: () => ThreeSetup | null;
};

const FIXED_TIME_STEP = 1 / 60; // seconds (60 Hz physics)
const DV_SCALE = 0.02; // thrust per physics step, tune for feel (scene-units/sec)
const TRAIL_INTERVAL_MS = 100;
const HUD_INTERVAL_MS = 200;

/**
 * The game loop, independent of React: owns the Three.js instance lifecycle,
 * the fixed-timestep physics loop, thrust/fuel handling, camera view modes,
 * trail sampling, HUD sampling, and keyboard input.
 */
export function createGameLoop(config: GameLoopConfig): GameLoop {
    let threeObj: ThreeSetup | null = null;
    let rafId: number | null = null;
    let accumulator = 0;
    let lastTime = 0;

    // Throttling state
    let hudLast: { ms: number; velocity: number; distance: number; fuel: number; slingshots: number; status: string } | null = null;
    let trailLastMs = 0;

    function stepPhysicsOnce(three: ThreeSetup) {
        const { state } = three;
        // apply input-driven delta-v before stepping
        const dv = computeThrustDV(state.velocity, config.input, DV_SCALE);

        if (dv[0] !== 0 || dv[1] !== 0 || dv[2] !== 0) {
            // Thrust consumes fuel proportional to delta-v magnitude;
            // with an empty tank the thrust is simply not applied.
            const dvMagnitude = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2]);
            const fuelConsumed = dvMagnitude * PHYSICS_SCALE.FUEL_CONSUMPTION_RATE;

            if (state.fuel > 0) {
                state.fuel = Math.max(0, state.fuel - fuelConsumed);
                three.applyDeltaV(dv);
            }
        }
        three.stepSimulation(FIXED_TIME_STEP);
    }

    function updateCamera(three: ThreeSetup) {
        const { camera, controls, state } = three;
        const view = config.getCameraView();
        if (view === 'top') {
            // Top view: camera above the sun
            camera.position.set(0, 1500, 0);
            camera.lookAt(0, 0, 0);
            controls.enabled = false;
        } else if (view === 'probe') {
            // Probe follow view: camera behind and above the probe
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
            controls.enabled = false;
        } else {
            // Free view: enable orbit controls
            controls.enabled = true;
            controls.update();
        }
    }

    function sampleHud(three: ThreeSetup) {
        if (!config.onHudSample) return;
        const { state } = three;
        const nowMs = performance.now();
        const last = hudLast ?? { ms: 0, velocity: -1, distance: -1, fuel: -1, slingshots: -1, status: '' };

        const speed = state.velocity ? state.velocity.length() : 0;
        const speedKmPerSec = speed * PHYSICS_SCALE.VELOCITY_TO_KM_PER_SEC;
        const shouldUpdateTime = nowMs - last.ms > HUD_INTERVAL_MS;
        const largeChange = Math.abs(speedKmPerSec - last.velocity) > 0.7 || Math.abs(state.distance - last.distance) > 0.1 || Math.abs(state.fuel - last.fuel) > 1 || state.slingshots !== last.slingshots || state.status !== last.status;

        if (shouldUpdateTime || largeChange) {
            config.onHudSample({
                status: state.status,
                velocityKmPerSec: speedKmPerSec,
                distance: state.distance,
                fuel: state.fuel,
                slingshots: state.slingshots,
            });
            hudLast = { ms: nowMs, velocity: speedKmPerSec, distance: state.distance, fuel: state.fuel, slingshots: state.slingshots, status: state.status };
        }
    }

    function animate() {
        const three = threeObj;
        if (!three) return;

        const now = performance.now() / 1000;
        let delta = now - lastTime;
        lastTime = now;

        // clamp delta to avoid spiral of death
        if (delta > 0.25) delta = 0.25;

        accumulator += delta;
        // Only run physics simulation if simulation has started
        if (config.isSimulationStarted()) {
            while (accumulator >= FIXED_TIME_STEP) {
                try {
                    stepPhysicsOnce(three);
                } catch (e) {
                    // swallow physics errors to keep render loop alive
                    console.error('physics step error', e);
                }
                accumulator -= FIXED_TIME_STEP;
            }
        } else {
            // Reset accumulator when simulation is paused to prevent time buildup
            accumulator = 0;
        }

        // synchronize visual probe mesh with simulated state
        try {
            if (three.probe && three.state.position) three.probe.position.copy(three.state.position);
        } catch {
            // ignore copy errors in unusual cases
        }

        // update camera position based on view mode
        try {
            updateCamera(three);
        } catch {
            // ignore camera update errors
        }

        // add trail point periodically
        const nowMsPoint = performance.now();
        if (trailLastMs === 0) trailLastMs = nowMsPoint;
        if (nowMsPoint - trailLastMs > TRAIL_INTERVAL_MS) {
            try {
                three.addTrailPoint(three.state.position);
            } catch {
                // ignore
            }
            trailLastMs = nowMsPoint;
        }

        sampleHud(three);

        three.composer.render();
        rafId = requestAnimationFrame(animate);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'ArrowLeft') config.input.left = true;
        if (e.key === 'ArrowRight') config.input.right = true;
        if (e.key === 'ArrowUp') config.input.up = true;
        if (e.key === 'ArrowDown') config.input.down = true;
        if (e.key === 'r' || e.key === 'R') {
            restart();
        }
    }

    function onKeyUp(e: KeyboardEvent) {
        if (e.key === 'ArrowLeft') config.input.left = false;
        if (e.key === 'ArrowRight') config.input.right = false;
        if (e.key === 'ArrowUp') config.input.up = false;
        if (e.key === 'ArrowDown') config.input.down = false;
    }

    function startLoop() {
        lastTime = performance.now() / 1000;
        accumulator = 0;
        rafId = requestAnimationFrame(animate);
    }

    function stopLoop() {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
    }

    function start() {
        if (threeObj) return; // already started
        threeObj = initThreeJS(config.canvas, config.getOptions());
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        startLoop();
    }

    function restart() {
        if (!threeObj) return;
        stopLoop();
        try {
            threeObj.dispose();
        } catch {}
        threeObj = initThreeJS(config.canvas, config.getOptions());
        startLoop();
    }

    function dispose() {
        stopLoop();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        try {
            threeObj?.dispose();
        } catch {}
        threeObj = null;
    }

    return {
        start,
        restart,
        dispose,
        getThree: () => threeObj,
    };
}
