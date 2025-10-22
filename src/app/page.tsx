"use client";

import React, { useState, useCallback } from 'react';
import GameCanvas from '../components/GameCanvas';
import HUD from '../components/HUD';
import Controls, { CameraView } from '../components/Controls';
import { PHYSICS_SCALE } from '../lib/threeSetup';

const Page = () => {
    const [status, setStatus] = useState<string>('Idle');
    const [velocity, setVelocity] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);
    const [fuel, setFuel] = useState<number>(100);
    const [slingshots, setSlingshots] = useState<number>(0);

    // simulation tuning parameters (editable via Controls)
    const [probeSpeedMult, setProbeSpeedMult] = useState<number>(1.05);
    const [gravityG, setGravityG] = useState<number>(PHYSICS_SCALE.G);
    const [starMass, setStarMass] = useState<number>(PHYSICS_SCALE.SUN_MASS);
    const [cameraView, setCameraView] = useState<CameraView>('free');

    // stable setters object to pass down (memoized so reference is stable)
    const hudSetters = React.useMemo(
        () => ({ setStatus, setVelocity, setDistance, setFuel, setSlingshots }),
        [setStatus, setVelocity, setDistance, setFuel, setSlingshots]
    );

    return (
        <div>
            <GameCanvas hudSetters={hudSetters} probeSpeedMult={probeSpeedMult} gravityG={gravityG} starMass={starMass} cameraView={cameraView} />
            <HUD status={status} velocity={velocity} distance={distance} fuel={fuel} slingshots={slingshots} />
            <Controls probeSpeedMult={probeSpeedMult} setProbeSpeedMult={setProbeSpeedMult} gravityG={gravityG} setGravityG={setGravityG} starMass={starMass} setStarMass={setStarMass} cameraView={cameraView} setCameraView={setCameraView} />
        </div>
    );
};

export default Page;