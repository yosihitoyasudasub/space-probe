"use client";

import React, { useEffect, useRef } from 'react';
import { initThreeJS, PHYSICS_SCALE, PLANET_ORBITS } from '../lib/threeSetup';
import { CameraView } from './Controls';
import { PROBE_MODELS } from '../app/page';
import { ALL_MISSIONS } from '../data/missions';

// ====================================================================
// Game Loop Constants
// ====================================================================

const GAME_LOOP_CONSTANTS = {
    // Physics simulation constants
    FIXED_TIMESTEP_HZ: 60,                  // Physics update frequency (60 FPS)
    MAX_FRAME_DELTA_SECONDS: 0.25,          // Maximum frame delta to prevent "spiral of death"
                                            // Limits time accumulation when frame rate drops

    // Input/thrust constants
    THRUST_DELTA_V_SCALE: 0.02,             // Delta-v per frame from thrust input (scene units/s)
    MIN_VELOCITY_EPSILON: 0.001,            // Minimum velocity for control mode switching (scene units/s)

    // Camera view positions (scene units)
    TOP_VIEW_CAMERA: {
        x: 0,
        y: 1500,    // 15 AU above orbital plane
        z: 0
    },

    PROBE_FOLLOW_CAMERA: {
        OFFSET_BACK: 70,        // Units behind probe
        OFFSET_UP: 80,          // Units above probe
        STATIC_OFFSET_UP: 80,   // Offset when probe is stationary
        STATIC_OFFSET_FORWARD: 150,  // Forward offset when stationary
        MIN_SPEED: 0.1          // Minimum speed to use velocity-based positioning (scene units/s)
    },

    // Trail visualization
    TRAIL_UPDATE_INTERVAL_MS: 100,          // Milliseconds between adding trail points

    // HUD update optimization
    HUD: {
        UPDATE_THROTTLE_MS: 200,            // Minimum milliseconds between HUD updates
        VELOCITY_THRESHOLD: 0.7,            // Minimum velocity change to force HUD update (km/s)
        DISTANCE_THRESHOLD: 0.1,            // Minimum distance change to force HUD update
        FUEL_THRESHOLD: 1                   // Minimum fuel change to force HUD update (%)
    }
} as const;

type HUDSetters = {
    setStatus: React.Dispatch<React.SetStateAction<string>>;
    setVelocity: (value: number) => void;
    setDistance: (value: number) => void;
    setFuel: React.Dispatch<React.SetStateAction<number>>;
    setSlingshots: React.Dispatch<React.SetStateAction<number>>;
    setDistanceFromSun: (value: number) => void;
    setOrbitTimes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

interface Props {
    hudSetters?: HUDSetters;
    probeSpeedMult?: number;
    gravityG?: number;
    starMass?: number;
    cameraView?: CameraView;
    gravityGridEnabled?: boolean;
    setGravityGridEnabled?: (v: boolean) => void;
    gridEnabled?: boolean;
    setGridEnabled?: (v: boolean) => void;
    selectedModel?: string;
    isSimulationStarted?: boolean;
}

const GameCanvas: React.FC<Props> = ({ hudSetters, probeSpeedMult = 1.05, gravityG = PHYSICS_SCALE.G, starMass = PHYSICS_SCALE.SUN_MASS, cameraView = 'free', gravityGridEnabled = false, setGravityGridEnabled, gridEnabled = false, setGridEnabled, selectedModel = 'space_fighter', isSimulationStarted = false }) => {
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

    // Track orbit times for time-based missions
    const orbitTimesTracker: Record<string, number> = {};

    // Track whether each mission is currently in range and has met velocity requirement
    const missionInRangeTracker: Record<string, boolean> = {};
    const missionVelocityMetTracker: Record<string, boolean> = {};

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
        // Reset grid states to hidden
        if (setGravityGridEnabled) setGravityGridEnabled(false);
        if (setGridEnabled) setGridEnabled(false);
        // Initialize with grids hidden
        threeObj = (initThreeJS as any)(canvas, { probeSpeedMult, G: gravityG, starMass, gravityGridEnabled: false, gridEnabled: false, probeModelPath, orientation });
        ({ scene, camera, renderer, composer, dispose, state, probe, controls, addTrailPoint, stepSimulation, updateGravityGrid, updateGrid, switchProbeModel } = threeObj);
        // Update refs after restart
        gravityGridRef.current = { updateGravityGrid };
        gridRef.current = { updateGrid };
        switchProbeModelRef.current = { switchProbeModel };
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

        // Fixed timestep physics loop
        const fixedTimeStep = 1 / GAME_LOOP_CONSTANTS.FIXED_TIMESTEP_HZ;
        let accumulator = 0;
        let lastTime = performance.now() / 1000;

        const animate = () => {
            const now = performance.now() / 1000;
            let delta = now - lastTime;
            lastTime = now;

            // clamp delta to avoid spiral of death
            if (delta > GAME_LOOP_CONSTANTS.MAX_FRAME_DELTA_SECONDS) delta = GAME_LOOP_CONSTANTS.MAX_FRAME_DELTA_SECONDS;

            accumulator += delta;
            // Only run physics simulation if simulation has started
            if (isSimulationStartedRef.current) {
                while (accumulator >= fixedTimeStep) {
                    try {
                        // apply input-driven delta-v before stepping
                        const dvScale = GAME_LOOP_CONSTANTS.THRUST_DELTA_V_SCALE;
                        let dv: [number, number, number] = [0, 0, 0];

                        // Calculate thrust direction based on current velocity (velocity-relative control)
                        if (state && state.velocity) {
                            const vx = state.velocity.x;
                            const vy = state.velocity.y;
                            const vz = state.velocity.z;
                            const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

                            if (speed > GAME_LOOP_CONSTANTS.MIN_VELOCITY_EPSILON) {
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

                        // Update orbit times for time-based missions
                        // Calculate current distance from sun
                        const probePos = state.position;
                        const distanceFromSunSceneUnits = Math.sqrt(
                            probePos.x * probePos.x +
                            probePos.y * probePos.y +
                            probePos.z * probePos.z
                        );
                        const distanceFromSunAU = distanceFromSunSceneUnits / PHYSICS_SCALE.AU;

                        // Calculate current velocity in km/s
                        const speed = state.velocity ? state.velocity.length() : 0;
                        const speedKmPerSec = speed * PHYSICS_SCALE.VELOCITY_TO_KM_PER_SEC;

                        // Check each time-based orbit mission
                        ALL_MISSIONS.forEach(mission => {
                            if (mission.requiredDuration) {
                                // This is a time-based orbit mission
                                // Extract target orbit from mission (it's the target field for orbit missions)
                                const targetOrbit = mission.target;

                                // Calculate tolerance (we need to extract this from the checkCompleted function
                                // or hard-code it. For simplicity, let's check if we're in range by
                                // looking at the mission's description or using a default tolerance)
                                // Looking at createOrbitReachMission, default tolerance is 0.2 AU
                                const tolerance = 0.2; // Default tolerance

                                const diff = Math.abs(distanceFromSunAU - targetOrbit);
                                const inRange = diff <= tolerance;

                                // Check velocity condition while in range
                                let velocityMet = false;
                                if (inRange) {
                                    if (mission.requiredVelocity && mission.velocityTolerance !== undefined) {
                                        // Check if velocity is within required range
                                        const velocityDiff = Math.abs(speedKmPerSec - mission.requiredVelocity);
                                        velocityMet = velocityDiff <= mission.velocityTolerance;
                                    } else {
                                        // No velocity requirement, automatically pass
                                        velocityMet = true;
                                    }
                                }

                                // Update trackers
                                missionInRangeTracker[mission.id] = inRange;
                                missionVelocityMetTracker[mission.id] = velocityMet;

                                if (inRange && velocityMet) {
                                    // Increment time in orbit only if both range and velocity requirements are met
                                    const currentTime = orbitTimesTracker[mission.id] || 0;
                                    // Stop counting when target duration is reached
                                    if (currentTime < mission.requiredDuration) {
                                        orbitTimesTracker[mission.id] = Math.min(currentTime + fixedTimeStep, mission.requiredDuration);
                                    }
                                } else {
                                    // Reset time if conditions are not met
                                    orbitTimesTracker[mission.id] = 0;
                                }
                            }
                        });
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
                    camera.position.set(
                        GAME_LOOP_CONSTANTS.TOP_VIEW_CAMERA.x,
                        GAME_LOOP_CONSTANTS.TOP_VIEW_CAMERA.y,
                        GAME_LOOP_CONSTANTS.TOP_VIEW_CAMERA.z
                    );
                    camera.lookAt(0, 0, 0);
                    controls.enabled = false;
                } else if (cameraViewRef.current === 'probe') {
                    // Probe follow view: camera behind and above the probe
                    if (probe && state.position) {
                        const probePos = state.position;
                        const vel = state.velocity;
                        const speed = vel ? vel.length() : 0;

                        if (speed > GAME_LOOP_CONSTANTS.PROBE_FOLLOW_CAMERA.MIN_SPEED) {
                            // Position camera behind the probe based on velocity direction
                            const velNorm = vel.clone().normalize();
                            const camOffset = velNorm.multiplyScalar(-GAME_LOOP_CONSTANTS.PROBE_FOLLOW_CAMERA.OFFSET_BACK);
                            const camPos = probePos.clone().add(camOffset);
                            camPos.y += GAME_LOOP_CONSTANTS.PROBE_FOLLOW_CAMERA.OFFSET_UP;

                            camera.position.copy(camPos);
                            camera.lookAt(probePos.x, probePos.y, probePos.z);
                        } else {
                            // If probe is stationary, use fixed offset
                            camera.position.set(
                                probePos.x,
                                probePos.y + GAME_LOOP_CONSTANTS.PROBE_FOLLOW_CAMERA.STATIC_OFFSET_UP,
                                probePos.z + GAME_LOOP_CONSTANTS.PROBE_FOLLOW_CAMERA.STATIC_OFFSET_FORWARD
                            );
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

            // add trail point periodically
            if (addTrailPoint) {
                const nowMsPoint = performance.now();
                if (!trailRef.current) trailRef.current = { lastMs: nowMsPoint };
                if (nowMsPoint - trailRef.current.lastMs > GAME_LOOP_CONSTANTS.TRAIL_UPDATE_INTERVAL_MS) {
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
                    const shouldUpdateTime = nowMs - lastMs > GAME_LOOP_CONSTANTS.HUD.UPDATE_THROTTLE_MS;
                    const largeChange = Math.abs(speedKmPerSec - lastVals.velocity) > GAME_LOOP_CONSTANTS.HUD.VELOCITY_THRESHOLD
                        || Math.abs(state.distance - lastVals.distance) > GAME_LOOP_CONSTANTS.HUD.DISTANCE_THRESHOLD
                        || Math.abs(state.fuel - lastVals.fuel) > GAME_LOOP_CONSTANTS.HUD.FUEL_THRESHOLD
                        || state.slingshots !== lastVals.slingshots
                        || state.status !== lastVals.status;

                    if (shouldUpdateTime || largeChange) {
                        hudSetters.setVelocity(speedKmPerSec);
                        hudSetters.setDistance(state.distance);
                        hudSetters.setFuel(state.fuel);
                        hudSetters.setSlingshots(state.slingshots);
                        hudSetters.setStatus(state.status);

                        // Calculate distance from sun (太陽からの距離)
                        const probePos = state.position;
                        const distanceFromSunSceneUnits = Math.sqrt(
                            probePos.x * probePos.x +
                            probePos.y * probePos.y +
                            probePos.z * probePos.z
                        );
                        const distanceFromSunAU = distanceFromSunSceneUnits / PHYSICS_SCALE.AU;
                        hudSetters.setDistanceFromSun(distanceFromSunAU);

                        // Update orbit times
                        hudSetters.setOrbitTimes({ ...orbitTimesTracker });

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