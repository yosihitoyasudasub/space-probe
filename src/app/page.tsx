"use client";

import React, { useState, useCallback, useRef } from 'react';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import Controls, { CameraView } from '../components/Controls';
import CameraControls from '../components/CameraControls';
import TouchControls from '../components/TouchControls';
import { PHYSICS_SCALE } from '../lib/threeSetup';

export interface DataPoint {
    time: number;
    value: number;
}

// Available 3D models in public/models/
// orientation: Controls how the model is oriented
//   - autoAlign: automatically align longest dimension with velocity vector
//   - rotationY: manual Y-axis rotation (radians) - applied before auto-alignment
//   - invertDirection: invert the direction after alignment (for models facing backwards)
export const PROBE_MODELS = [
    { value: 'voyager', label: 'Voyager (Built-in)', path: null, orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_fighter', label: 'Space Fighter', path: '/models/space_fighter.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_shuttle', label: 'Space Shuttle', path: '/models/space_shuttle.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_shuttle_2', label: 'Space Shuttle 2', path: '/models/space_shuttle_2.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_ship', label: 'Space Ship', path: '/models/space_ship.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_ship_2', label: 'Space Ship 2', path: '/models/space_ship_2.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_fighter_3', label: 'Space Fighter 3', path: '/models/space_fighter_3.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'lego_scooter', label: 'LEGO Space Scooter', path: '/models/lego_885_-_space_scooter.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'sputnik', label: 'Retro Sputnik', path: '/models/space_retro_sputnik.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'station_2001', label: 'Space Station (2001)', path: '/models/space_station_v_2001_a_space_odyssey.glb', orientation: { autoAlign: true, invertDirection: true } },
];

const Page = () => {
    const [status, setStatus] = useState<string>('Stopped');
    const [velocity, setVelocity] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);
    const [fuel, setFuel] = useState<number>(100);
    const [slingshots, setSlingshots] = useState<number>(0);
    const [distanceFromSun, setDistanceFromSun] = useState<number>(1.0); // Initial: 1 AU (Earth orbit)

    // Mission tracking - completed mission IDs
    const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());

    // Simulation control
    const [isSimulationStarted, setIsSimulationStarted] = useState<boolean>(false);

    // 履歴データの保存（最大100ポイント）
    const [velocityHistory, setVelocityHistory] = useState<DataPoint[]>([]);
    const [distanceHistory, setDistanceHistory] = useState<DataPoint[]>([]);
    const startTimeRef = useRef<number>(Date.now());

    // Simulation tuning parameters (editable via Controls)
    // All default values use PHYSICS_SCALE constants for consistency
    const [probeSpeedMult, setProbeSpeedMult] = useState<number>(1.05); // 5% above circular orbit velocity
    const [gravityG, setGravityG] = useState<number>(PHYSICS_SCALE.G);
    const [starMass, setStarMass] = useState<number>(PHYSICS_SCALE.SUN_MASS);
    const [cameraView, setCameraView] = useState<CameraView>('free');
    const [gravityGridEnabled, setGravityGridEnabled] = useState<boolean>(false);
    const [gridEnabled, setGridEnabled] = useState<boolean>(false);
    const [selectedModel, setSelectedModel] = useState<string>('space_fighter');

    // 履歴データ付きセッター
    const setVelocityWithHistory = useCallback((value: number) => {
        setVelocity(value);
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // 秒単位
        setVelocityHistory(prev => {
            const updated = [...prev, { time: elapsed, value }];
            return updated.slice(-100); // 最大100ポイント
        });
    }, []);

    const setDistanceWithHistory = useCallback((value: number) => {
        setDistance(value);
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDistanceHistory(prev => {
            const updated = [...prev, { time: elapsed, value }];
            return updated.slice(-100);
        });
    }, []);

    // Mission completion callback
    const handleMissionCompleted = useCallback((missionId: string) => {
        setCompletedMissionIds(prev => {
            const newSet = new Set(prev);
            newSet.add(missionId);
            return newSet;
        });
    }, []);

    // stable setters object to pass down (memoized so reference is stable)
    const hudSetters = React.useMemo(
        () => ({
            setStatus,
            setVelocity: setVelocityWithHistory,
            setDistance: setDistanceWithHistory,
            setFuel,
            setSlingshots,
            setDistanceFromSun
        }),
        [setStatus, setVelocityWithHistory, setDistanceWithHistory, setFuel, setSlingshots, setDistanceFromSun]
    );

    return (
        <div>
            <GameCanvas hudSetters={hudSetters} probeSpeedMult={probeSpeedMult} gravityG={gravityG} starMass={starMass} cameraView={cameraView} gravityGridEnabled={gravityGridEnabled} setGravityGridEnabled={setGravityGridEnabled} gridEnabled={gridEnabled} setGridEnabled={setGridEnabled} selectedModel={selectedModel} isSimulationStarted={isSimulationStarted} />
            <HUD
                status={status}
                velocity={velocity}
                distance={distance}
                fuel={fuel}
                slingshots={slingshots}
                distanceFromSun={distanceFromSun}
                velocityHistory={velocityHistory}
                distanceHistory={distanceHistory}
                probeSpeedMult={probeSpeedMult}
                setProbeSpeedMult={setProbeSpeedMult}
                gravityG={gravityG}
                setGravityG={setGravityG}
                starMass={starMass}
                setStarMass={setStarMass}
                gravityGridEnabled={gravityGridEnabled}
                setGravityGridEnabled={setGravityGridEnabled}
                gridEnabled={gridEnabled}
                setGridEnabled={setGridEnabled}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                isSimulationStarted={isSimulationStarted}
                setIsSimulationStarted={setIsSimulationStarted}
                completedMissionIds={completedMissionIds}
                onMissionCompleted={handleMissionCompleted}
            />
            <CameraControls cameraView={cameraView} setCameraView={setCameraView} />
            <TouchControls />
        </div>
    );
};

export default Page;