"use client";

import React, { useEffect, useRef } from 'react';
import { initThreeJS, PHYSICS_SCALE } from '../lib/threeSetup';
import { CameraView } from '../lib/types';
import { findProbeModel } from '../lib/probeModels';
import { computeThrustDV, InputState } from '../lib/thrust';

type HUDSetters = {
    setStatus: React.Dispatch<React.SetStateAction<string>>;
    setVelocity: (value: number) => void;
    setDistance: (value: number) => void;
    setFuel: React.Dispatch<React.SetStateAction<number>>;
    setSlingshots: React.Dispatch<React.SetStateAction<number>>;
};

interface Props {
    hudSetters?: HUDSetters;
    probeSpeedMult?: number;
    gravityG?: number;
    starMass?: number;
    cameraView?: CameraView;
    gravityGridEnabled?: boolean;
    gridEnabled?: boolean;
    selectedModel?: string;
    isSimulationStarted?: boolean;
    /** Shared input state mutated by TouchControls, read every physics step */
    inputStateRef?: React.RefObject<InputState>;
    /** Receives the restart handler so external UI (TouchControls) can trigger it */
    restartRef?: React.RefObject<(() => void) | null>;
}

type ThreeSetup = ReturnType<typeof initThreeJS>;

const GameCanvas: React.FC<Props> = ({ hudSetters, probeSpeedMult = 1.05, gravityG = 1.0, starMass = 4000, cameraView = 'free', gravityGridEnabled = false, gridEnabled = true, selectedModel = 'space_fighter', isSimulationStarted = false, inputStateRef, restartRef }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const threeObjRef = useRef<ThreeSetup | null>(null);

    // Mirror frequently-changing props into refs so the long-lived animation
    // loop (and restart) always sees the current values without re-mounting.
    const cameraViewRef = useRef<CameraView>(cameraView);
    const isSimulationStartedRef = useRef<boolean>(isSimulationStarted);
    const gravityGridEnabledRef = useRef<boolean>(gravityGridEnabled);
    const gridEnabledRef = useRef<boolean>(gridEnabled);
    const selectedModelRef = useRef<string>(selectedModel);

    useEffect(() => {
        cameraViewRef.current = cameraView;
    }, [cameraView]);

    useEffect(() => {
        isSimulationStartedRef.current = isSimulationStarted;
    }, [isSimulationStarted]);

    // Update gravity grid when gravityGridEnabled changes
    useEffect(() => {
        gravityGridEnabledRef.current = gravityGridEnabled;
        threeObjRef.current?.updateGravityGrid(gravityGridEnabled);
    }, [gravityGridEnabled]);

    // Update flat grid when gridEnabled changes
    useEffect(() => {
        gridEnabledRef.current = gridEnabled;
        threeObjRef.current?.updateGrid(gridEnabled);
    }, [gridEnabled]);

    // Handle probe model switching
    useEffect(() => {
        const isFirstRender = selectedModelRef.current === selectedModel && !threeObjRef.current;
        selectedModelRef.current = selectedModel;
        if (isFirstRender) return;
        const modelData = findProbeModel(selectedModel);
        threeObjRef.current?.switchProbeModel(modelData?.path ?? null, modelData?.orientation);
    }, [selectedModel]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Throttling state local to this effect instance
        let hudLast: { ms: number; velocity: number; distance: number; fuel: number; slingshots: number; status: string } | null = null;
        let trailLastMs = 0;

        const buildOptions = () => {
            const modelData = findProbeModel(selectedModelRef.current);
            return {
                probeSpeedMult,
                G: gravityG,
                starMass,
                gravityGridEnabled: gravityGridEnabledRef.current,
                gridEnabled: gridEnabledRef.current,
                probeModelPath: modelData?.path ?? null,
                orientation: modelData?.orientation,
            };
        };

        let threeObj = initThreeJS(canvas, buildOptions());
        threeObjRef.current = threeObj;

        // input state shared with TouchControls (falls back to a local object
        // when no ref is provided)
        const inputState: InputState = inputStateRef?.current ?? { left: false, right: false, up: false, down: false };

        const restartSimulation = () => {
            try {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
            } catch {}
            try {
                threeObj.dispose();
            } catch {}
            threeObj = initThreeJS(canvas, buildOptions());
            threeObjRef.current = threeObj;
            // Restart animation loop
            lastTime = performance.now() / 1000;
            accumulator = 0;
            rafRef.current = requestAnimationFrame(animate);
        };
        // Register the restart handler for external UI (TouchControls)
        if (restartRef) restartRef.current = restartSimulation;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') inputState.left = true;
            if (e.key === 'ArrowRight') inputState.right = true;
            if (e.key === 'ArrowUp') inputState.up = true;
            if (e.key === 'ArrowDown') inputState.down = true;
            if (e.key === 'r' || e.key === 'R') {
                restartSimulation();
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
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

        const stepPhysicsOnce = () => {
            const { state } = threeObj;
            // apply input-driven delta-v before stepping
            const dvScale = 0.02; // tune this for feel (scene-units/sec)
            const dv = computeThrustDV(state.velocity, inputState, dvScale);

            if (dv[0] !== 0 || dv[1] !== 0 || dv[2] !== 0) {
                // Thrust consumes fuel proportional to delta-v magnitude;
                // with an empty tank the thrust is simply not applied.
                const dvMagnitude = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2]);
                const fuelConsumed = dvMagnitude * PHYSICS_SCALE.FUEL_CONSUMPTION_RATE;

                if (state.fuel > 0) {
                    state.fuel = Math.max(0, state.fuel - fuelConsumed);
                    threeObj.applyDeltaV(dv);
                }
            }
            threeObj.stepSimulation(fixedTimeStep);
        };

        const updateCamera = () => {
            const { camera, controls, state } = threeObj;
            if (cameraViewRef.current === 'top') {
                // Top view: camera above the sun
                camera.position.set(0, 1500, 0);
                camera.lookAt(0, 0, 0);
                controls.enabled = false;
            } else if (cameraViewRef.current === 'probe') {
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
        };

        const updateHUD = () => {
            if (!hudSetters) return;
            const { state } = threeObj;
            const nowMs = performance.now();
            const last = hudLast ?? { ms: 0, velocity: -1, distance: -1, fuel: -1, slingshots: -1, status: '' };

            const speed = state.velocity ? state.velocity.length() : 0;
            const speedKmPerSec = speed * PHYSICS_SCALE.VELOCITY_TO_KM_PER_SEC;
            const shouldUpdateTime = nowMs - last.ms > 200; // 200ms throttle
            const largeChange = Math.abs(speedKmPerSec - last.velocity) > 0.7 || Math.abs(state.distance - last.distance) > 0.1 || Math.abs(state.fuel - last.fuel) > 1 || state.slingshots !== last.slingshots || state.status !== last.status;

            if (shouldUpdateTime || largeChange) {
                hudSetters.setVelocity(speedKmPerSec);
                hudSetters.setDistance(state.distance);
                hudSetters.setFuel(state.fuel);
                hudSetters.setSlingshots(state.slingshots);
                hudSetters.setStatus(state.status);

                hudLast = { ms: nowMs, velocity: speedKmPerSec, distance: state.distance, fuel: state.fuel, slingshots: state.slingshots, status: state.status };
            }
        };

        const animate = () => {
            const now = performance.now() / 1000;
            let delta = now - lastTime;
            lastTime = now;

            // clamp delta to avoid spiral of death
            if (delta > 0.25) delta = 0.25;

            accumulator += delta;
            // Only run physics simulation if simulation has started
            if (isSimulationStartedRef.current) {
                while (accumulator >= fixedTimeStep) {
                    try {
                        stepPhysicsOnce();
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
                if (threeObj.probe && threeObj.state.position) threeObj.probe.position.copy(threeObj.state.position);
            } catch {
                // ignore copy errors in unusual cases
            }

            // update camera position based on view mode
            try {
                updateCamera();
            } catch {
                // ignore camera update errors
            }

            // add trail point periodically (every 100ms)
            const nowMsPoint = performance.now();
            if (trailLastMs === 0) trailLastMs = nowMsPoint;
            if (nowMsPoint - trailLastMs > 100) {
                try {
                    threeObj.addTrailPoint(threeObj.state.position);
                } catch {
                    // ignore
                }
                trailLastMs = nowMsPoint;
            }

            // update HUD if setters provided (throttled)
            updateHUD();

            threeObj.composer.render();
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            threeObj.dispose();
            threeObjRef.current = null;
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            if (restartRef) restartRef.current = null;
        };
    }, [hudSetters, probeSpeedMult, gravityG, starMass, inputStateRef, restartRef]);

    return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />;
};

export default GameCanvas;
