"use client";

import React, { useState, useCallback, useRef } from 'react';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import Controls, { CameraView } from '../components/Controls';
import CameraControls from '../components/CameraControls';
import { PHYSICS_SCALE } from '../lib/threeSetup';

export interface DataPoint {
    time: number;
    value: number;
}

// Available 3D models in public/models/
export const PROBE_MODELS = [
    { value: 'voyager', label: 'Voyager (Built-in)', path: null }, // null = use built-in Voyager
    { value: 'space_fighter', label: 'Space Fighter', path: '/models/space_fighter.glb' },
    { value: 'voyager_satellite', label: 'Voyager Satellite', path: '/models/voyager_space_satellite__draft.glb' },
    { value: 'lucy_probe', label: 'Lucy NASA Probe', path: '/models/lucy__nasa_space_probe__free_download.glb' },
    { value: 'space_shuttle', label: 'Space Shuttle', path: '/models/space_shuttle.glb' },
    { value: 'space_shuttle_2', label: 'Space Shuttle 2', path: '/models/space_shuttle_2.glb' },
    { value: 'space_ship', label: 'Space Ship', path: '/models/space_ship.glb' },
    { value: 'space_ship_2', label: 'Space Ship 2', path: '/models/space_ship_2.glb' },
    { value: 'space_fighter_3', label: 'Space Fighter 3', path: '/models/space_fighter_3.glb' },
    { value: 'lego_scooter', label: 'LEGO Space Scooter', path: '/models/lego_885_-_space_scooter.glb' },
    { value: 'sputnik', label: 'Retro Sputnik', path: '/models/space_retro_sputnik.glb' },
    { value: 'unipersonal', label: 'Unipersonal Vessel', path: '/models/unipersonal_space_vessel.glb' },
    { value: 'yamato_2205', label: 'Yamato 2205', path: '/models/space_battleship_yamato_2205.glb' },
    { value: 'yamato_refit', label: 'Yamato Refit', path: '/models/space_battleship_yamato_refit.glb' },
    { value: 'station_2001', label: 'Space Station (2001)', path: '/models/space_station_v_2001_a_space_odyssey.glb' },
];

const Page = () => {
    const [status, setStatus] = useState<string>('Idle');
    const [velocity, setVelocity] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);
    const [fuel, setFuel] = useState<number>(100);
    const [slingshots, setSlingshots] = useState<number>(0);

    // 履歴データの保存（最大100ポイント）
    const [velocityHistory, setVelocityHistory] = useState<DataPoint[]>([]);
    const [distanceHistory, setDistanceHistory] = useState<DataPoint[]>([]);
    const startTimeRef = useRef<number>(Date.now());

    // simulation tuning parameters (editable via Controls)
    const [probeSpeedMult, setProbeSpeedMult] = useState<number>(1.05);
    const [gravityG, setGravityG] = useState<number>(PHYSICS_SCALE.G);
    const [starMass, setStarMass] = useState<number>(PHYSICS_SCALE.SUN_MASS);
    const [cameraView, setCameraView] = useState<CameraView>('free');
    const [gravityGridEnabled, setGravityGridEnabled] = useState<boolean>(false);
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

    // stable setters object to pass down (memoized so reference is stable)
    const hudSetters = React.useMemo(
        () => ({
            setStatus,
            setVelocity: setVelocityWithHistory,
            setDistance: setDistanceWithHistory,
            setFuel,
            setSlingshots
        }),
        [setStatus, setVelocityWithHistory, setDistanceWithHistory, setFuel, setSlingshots]
    );

    return (
        <div>
            <GameCanvas hudSetters={hudSetters} probeSpeedMult={probeSpeedMult} gravityG={gravityG} starMass={starMass} cameraView={cameraView} gravityGridEnabled={gravityGridEnabled} selectedModel={selectedModel} />
            <HUD
                status={status}
                velocity={velocity}
                distance={distance}
                fuel={fuel}
                slingshots={slingshots}
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
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
            />
            <CameraControls cameraView={cameraView} setCameraView={setCameraView} />
        </div>
    );
};

export default Page;