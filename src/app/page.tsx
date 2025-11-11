"use client";

import React, { useState, useCallback, useRef } from 'react';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import Controls, { CameraView } from '../components/Controls';
import CameraControls from '../components/CameraControls';
import TouchControls from '../components/TouchControls';
import { PHYSICS_SCALE, CELESTIAL_CONSTANTS } from '../lib/threeSetup';
import { useBGM } from '../components/BGMManager';

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
    { value: 'space_fighter', label: 'Space Fighter', path: '/models/space_fighter.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_ship', label: 'Space Ship', path: '/models/space_ship.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_ship_2', label: 'Space Ship 2', path: '/models/space_ship_2.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_fighter_3', label: 'Space Fighter 3', path: '/models/space_fighter_3.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'lego_scooter', label: 'Space Scooter', path: '/models/lego_885_-_space_scooter.glb', orientation: { autoAlign: true, invertDirection: true } },
];

const Page = () => {
    const [status, setStatus] = useState<string>('Stopped');
    const [velocity, setVelocity] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);
    const [fuel, setFuel] = useState<number>(100);
    const [slingshots, setSlingshots] = useState<number>(0);
    const [distanceFromSun, setDistanceFromSun] = useState<number>(1.0); // Initial: 1 AU (Earth orbit)

    // Mission tracking - completed mission IDs and orbit times
    const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());
    const [orbitTimes, setOrbitTimes] = useState<Record<string, number>>({});

    // Credits system
    const [totalCredits, setTotalCredits] = useState<number>(0);
    const [earnedCredits, setEarnedCredits] = useState<Record<string, number>>({});  // missionId -> credits
    const [recentReward, setRecentReward] = useState<{
        missionTitle: string;
        baseCredits: number;
        bonusCredits: number;
        totalCredits: number;
    } | null>(null);

    // Simulation control
    const [isSimulationStarted, setIsSimulationStarted] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // BGM control
    const { enabled: bgmEnabled, setEnabled: setBgmEnabled, volume: bgmVolume, setVolume: setBgmVolume, selectedTrack: bgmTrack, setSelectedTrack: setBgmTrack } = useBGM();

    // 履歴データの保存（最大100ポイント）
    const [velocityHistory, setVelocityHistory] = useState<DataPoint[]>([]);
    const [distanceHistory, setDistanceHistory] = useState<DataPoint[]>([]);
    const startTimeRef = useRef<number>(Date.now());

    // Simulation tuning parameters (editable via Controls)
    // All default values use PHYSICS_SCALE/CELESTIAL_CONSTANTS for consistency
    const [probeSpeedMult, setProbeSpeedMult] = useState<number>(CELESTIAL_CONSTANTS.PROBE.DEFAULT_SPEED_MULTIPLIER);
    const [gravityG, setGravityG] = useState<number>(PHYSICS_SCALE.G);
    const [starMass, setStarMass] = useState<number>(PHYSICS_SCALE.SUN_MASS);
    const [cameraView, setCameraView] = useState<CameraView>('free');
    const [gravityGridEnabled, setGravityGridEnabled] = useState<boolean>(false);
    const [gridEnabled, setGridEnabled] = useState<boolean>(false);
    const [planetOrbitsEnabled, setPlanetOrbitsEnabled] = useState<boolean>(true);
    const [predictionEnabled, setPredictionEnabled] = useState<boolean>(true);
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

    // Mission completion callback with reward calculation
    const handleMissionCompleted = useCallback((missionId: string, mission: any) => {
        // Check if already completed (prevent duplicate rewards)
        if (completedMissionIds.has(missionId)) {
            return;
        }

        // Add to completed missions
        setCompletedMissionIds(prev => {
            const newSet = new Set(prev);
            newSet.add(missionId);
            return newSet;
        });

        // Calculate reward
        if (mission.calculateReward) {
            const stats = {
                distance,
                velocity,
                slingshots,
                fuel,
                distanceFromSun,
                orbitTimes,
            };
            const reward = mission.calculateReward(stats);

            // Award credits
            setTotalCredits(prev => prev + reward.totalCredits);
            setEarnedCredits(prev => ({
                ...prev,
                [missionId]: reward.totalCredits,
            }));

            // Set recent reward for display (stays until next reward)
            setRecentReward({
                missionTitle: mission.title,
                baseCredits: reward.baseCredits,
                bonusCredits: reward.bonusCredits || 0,
                totalCredits: reward.totalCredits,
            });
        }
    }, [completedMissionIds, distance, velocity, slingshots, fuel, distanceFromSun, orbitTimes]);

    // stable setters object to pass down (memoized so reference is stable)
    const hudSetters = React.useMemo(
        () => ({
            setStatus,
            setVelocity: setVelocityWithHistory,
            setDistance: setDistanceWithHistory,
            setFuel,
            setSlingshots,
            setDistanceFromSun,
            setOrbitTimes
        }),
        [setStatus, setVelocityWithHistory, setDistanceWithHistory, setFuel, setSlingshots, setDistanceFromSun, setOrbitTimes]
    );

    // Reset handler for mobile Settings panel
    const handleReset = () => {
        if ((window as any).__restartSimulation) {
            (window as any).__restartSimulation();
        }
    };

    // Handle START button click
    const handleStartClick = () => {
        setIsLoading(true);
        setIsSimulationStarted(true);
    };

    // Handle initialization complete from GameCanvas
    const handleInitialized = () => {
        setIsInitialized(true);
        setIsLoading(false);
    };

    return (
        <div>
            <GameCanvas
                hudSetters={hudSetters}
                probeSpeedMult={probeSpeedMult}
                gravityG={gravityG}
                starMass={starMass}
                cameraView={cameraView}
                gravityGridEnabled={gravityGridEnabled}
                setGravityGridEnabled={setGravityGridEnabled}
                gridEnabled={gridEnabled}
                setGridEnabled={setGridEnabled}
                planetOrbitsEnabled={planetOrbitsEnabled}
                setPlanetOrbitsEnabled={setPlanetOrbitsEnabled}
                predictionEnabled={predictionEnabled}
                setPredictionEnabled={setPredictionEnabled}
                selectedModel={selectedModel}
                isSimulationStarted={isSimulationStarted}
                onInitialized={handleInitialized}
            />
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
                planetOrbitsEnabled={planetOrbitsEnabled}
                setPlanetOrbitsEnabled={setPlanetOrbitsEnabled}
                predictionEnabled={predictionEnabled}
                setPredictionEnabled={setPredictionEnabled}
                bgmEnabled={bgmEnabled}
                setBgmEnabled={setBgmEnabled}
                bgmVolume={bgmVolume}
                setBgmVolume={setBgmVolume}
                bgmTrack={bgmTrack}
                setBgmTrack={setBgmTrack}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                isSimulationStarted={isSimulationStarted}
                setIsSimulationStarted={handleStartClick}
                isLoading={isLoading}
                isInitialized={isInitialized}
                completedMissionIds={completedMissionIds}
                onMissionCompleted={handleMissionCompleted}
                orbitTimes={orbitTimes}
                totalCredits={totalCredits}
                earnedCredits={earnedCredits}
                recentReward={recentReward}
                onReset={handleReset}
            />
            <CameraControls cameraView={cameraView} setCameraView={setCameraView} />
            <TouchControls />
        </div>
    );
};

export default Page;