"use client";

import React, { useState, useCallback, useRef } from 'react';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import CameraControls from '../components/CameraControls';
import TouchControls from '../components/TouchControls';
import { PHYSICS_SCALE } from '../lib/threeSetup';
import { CameraView, DataPoint, HudSample, SimulationSettings } from '../lib/types';
import { InputState } from '../lib/thrust';

const INITIAL_STATS: HudSample = {
    status: 'Stopped',
    velocityKmPerSec: 0,
    distance: 0,
    fuel: 100,
    slingshots: 0,
};

const Page = () => {
    // Probe statistics displayed in the HUD, updated from game loop samples
    const [stats, setStats] = useState<HudSample>(INITIAL_STATS);

    // Simulation control
    const [isSimulationStarted, setIsSimulationStarted] = useState<boolean>(false);
    const handleStart = useCallback(() => setIsSimulationStarted(true), []);

    // Shared bridge between GameCanvas (game loop) and TouchControls (UI):
    // TouchControls mutates the input state and triggers restart; GameCanvas
    // reads the input every physics step and registers its restart handler.
    const inputStateRef = useRef<InputState>({ left: false, right: false, up: false, down: false });
    const restartRef = useRef<(() => void) | null>(null);
    const handleRestart = useCallback(() => restartRef.current?.(), []);

    // 履歴データの保存（最大100ポイント）
    const [velocityHistory, setVelocityHistory] = useState<DataPoint[]>([]);
    const [distanceHistory, setDistanceHistory] = useState<DataPoint[]>([]);
    // Lazily initialized on first sample so render stays pure
    const startTimeRef = useRef<number | null>(null);

    // Each HUD sample updates the stats and appends to the history charts
    const handleHudSample = useCallback((sample: HudSample) => {
        setStats(sample);
        if (startTimeRef.current === null) startTimeRef.current = Date.now();
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // 秒単位
        setVelocityHistory(prev => [...prev, { time: elapsed, value: sample.velocityKmPerSec }].slice(-100));
        setDistanceHistory(prev => [...prev, { time: elapsed, value: sample.distance }].slice(-100));
    }, []);

    // simulation tuning parameters (editable via the settings panel)
    const [settings, setSettings] = useState<SimulationSettings>({
        probeSpeedMult: 1.05,
        gravityG: PHYSICS_SCALE.G,
        starMass: PHYSICS_SCALE.SUN_MASS,
        gravityGridEnabled: false,
        gridEnabled: true,
    });
    const handleSettingsChange = useCallback((patch: Partial<SimulationSettings>) => {
        setSettings(prev => ({ ...prev, ...patch }));
    }, []);

    const [cameraView, setCameraView] = useState<CameraView>('free');
    const [selectedModel, setSelectedModel] = useState<string>('space_fighter');

    return (
        <div>
            <GameCanvas
                onHudSample={handleHudSample}
                probeSpeedMult={settings.probeSpeedMult}
                gravityG={settings.gravityG}
                starMass={settings.starMass}
                cameraView={cameraView}
                gravityGridEnabled={settings.gravityGridEnabled}
                gridEnabled={settings.gridEnabled}
                selectedModel={selectedModel}
                isSimulationStarted={isSimulationStarted}
                inputStateRef={inputStateRef}
                restartRef={restartRef}
            />
            <HUD
                stats={stats}
                velocityHistory={velocityHistory}
                distanceHistory={distanceHistory}
                settings={settings}
                onSettingsChange={handleSettingsChange}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                isSimulationStarted={isSimulationStarted}
                onStart={handleStart}
            />
            <CameraControls cameraView={cameraView} setCameraView={setCameraView} />
            <TouchControls inputStateRef={inputStateRef} onRestart={handleRestart} />
        </div>
    );
};

export default Page;
