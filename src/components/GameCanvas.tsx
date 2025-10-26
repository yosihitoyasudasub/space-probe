"use client";

import React, { useEffect, useRef } from 'react';
import { initThreeJS, PHYSICS_SCALE } from '../lib/threeSetup';
import { CameraView } from './Controls';
import { PROBE_MODELS } from '../app/page';

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
}

const GameCanvas: React.FC<Props> = ({ hudSetters, probeSpeedMult = 1.05, gravityG = 1.0, starMass = 4000, cameraView = 'free', gravityGridEnabled = false, gridEnabled = true, selectedModel = 'space_fighter', isSimulationStarted = false }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const cameraViewRef = useRef<CameraView>(cameraView);
    const isSimulationStartedRef = useRef<boolean>(isSimulationStarted);

    // Update cameraViewRef when cameraView changes
    useEffect(() => {
        cameraViewRef.current = cameraView;
    }, [cameraView]);

    // Update isSimulationStartedRef when isSimulationStarted changes
    useEffect(() => {
        isSimulationStartedRef.current = isSimulationStarted;
    }, [isSimulationStarted]);

    // Update gravity grid when gravityGridEnabled changes
    const gravityGridRef = useRef<any>(null);
    useEffect(() => {
        if (gravityGridRef.current && gravityGridRef.current.updateGravityGrid) {
            gravityGridRef.current.updateGravityGrid(gravityGridEnabled);
        }
    }, [gravityGridEnabled]);

    // Update flat grid when gridEnabled changes
    const gridRef = useRef<any>(null);
    useEffect(() => {
        if (gridRef.current && gridRef.current.updateGrid) {
            gridRef.current.updateGrid(gridEnabled);
        }
    }, [gridEnabled]);

    // Store switchProbeModel function
    const switchProbeModelRef = useRef<any>(null);

    // Handle probe model switching
    useEffect(() => {
        if (switchProbeModelRef.current && switchProbeModelRef.current.switchProbeModel) {
            const modelData = PROBE_MODELS.find(m => m.value === selectedModel);
            const probeModelPath = modelData?.path ?? null;
            const orientation = (modelData as any)?.orientation;
            switchProbeModelRef.current.switchProbeModel(probeModelPath, orientation);
        }
    }, [selectedModel]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
    const hudUpdateRef = { current: undefined as any } as React.MutableRefObject<any>;
    const trailRef = { current: undefined as any } as React.MutableRefObject<any>;

    // Get model path from selected model
    const modelData = PROBE_MODELS.find(m => m.value === selectedModel);
    const probeModelPath = modelData?.path ?? null;
    const orientation = (modelData as any)?.orientation;

    // pass simulation tuning options to initThreeJS
    let threeObj: any = (initThreeJS as any)(canvas, { probeSpeedMult, G: gravityG, starMass, gravityGridEnabled, gridEnabled, probeModelPath, orientation });
    let { scene, camera, renderer, composer, dispose, state, probe, controls, addTrailPoint, stepSimulation, updateGravityGrid, updateGrid, switchProbeModel } = threeObj;
    gravityGridRef.current = { updateGravityGrid };
    gridRef.current = { updateGrid };
    switchProbeModelRef.current = { switchProbeModel };

    // input state
    const inputState = { left: false, right: false, up: false, down: false } as any;

    // Expose input state to window for touch controls
    (window as any).__gameInputState = inputState;

    // Expose restart function for touch controls
    const restartSimulation = () => {
        try {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        } catch (e) {}
        try {
            dispose();
        } catch (e) {}
        threeObj = (initThreeJS as any)(canvas, { probeSpeedMult, G: gravityG, starMass, gravityGridEnabled });
        ({ scene, camera, renderer, composer, dispose, state, probe, controls, addTrailPoint, stepSimulation, updateGravityGrid } = threeObj);
        // Restart animation loop
        lastTime = performance.now() / 1000;
        accumulator = 0;
        rafRef.current = requestAnimationFrame(animate);
    };
    (window as any).__restartSimulation = restartSimulation;

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
                        // apply input-driven delta-v before stepping
                        const dvScale = 0.02; // tune this for feel (scene-units/sec)
                        let dv: [number, number, number] = [0, 0, 0];

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
                            const fuelConsumed = dvMagnitude * PHYSICS_SCALE.FUEL_CONSUMPTION_RATE;

                            // Check if enough fuel available
                            if (state.fuel > 0) {
                                // Consume fuel
                                state.fuel = Math.max(0, state.fuel - fuelConsumed);

                                // Apply thrust
                                try {
                                    // call exported helper bound in threeSetup
                                    (window as any).__applyDeltaVToProbe ? (window as any).__applyDeltaVToProbe(dv) : (initThreeJS as any).applyDeltaVToProbe?.(dv);
                                } catch (e) {
                                    try { (initThreeJS as any).applyDeltaVToProbe?.(dv); } catch (e) {}
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
                if (!trailRef.current) trailRef.current = { lastMs: nowMsPoint };
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
                    const lastMs = (hudUpdateRef.current && hudUpdateRef.current.lastMs) || 0;
                    const lastVals = (hudUpdateRef.current && hudUpdateRef.current.lastVals) || { velocity: -1, distance: -1, fuel: -1, slingshots: -1, status: '' };

                    const speed = state.velocity ? state.velocity.length() : 0;
                    const speedKmPerSec = speed * PHYSICS_SCALE.VELOCITY_TO_KM_PER_SEC;
                    const shouldUpdateTime = nowMs - lastMs > 200; // 200ms throttle
                    const largeChange = Math.abs(speedKmPerSec - lastVals.velocity) > 0.7 || Math.abs(state.distance - lastVals.distance) > 0.1 || Math.abs(state.fuel - lastVals.fuel) > 1 || state.slingshots !== lastVals.slingshots || state.status !== lastVals.status;

                    if (shouldUpdateTime || largeChange) {
                        hudSetters.setVelocity(speedKmPerSec);
                        hudSetters.setDistance(state.distance);
                        hudSetters.setFuel(state.fuel);
                        hudSetters.setSlingshots(state.slingshots);
                        hudSetters.setStatus(state.status);

                        hudUpdateRef.current = { lastMs: nowMs, lastVals: { velocity: speedKmPerSec, distance: state.distance, fuel: state.fuel, slingshots: state.slingshots, status: state.status } };
                    }
                }

            composer.render();
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            dispose();
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            // Cleanup window properties
            delete (window as any).__gameInputState;
            delete (window as any).__restartSimulation;
        };
    }, [hudSetters, probeSpeedMult, gravityG, starMass]);

    return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />;
};

export default GameCanvas;