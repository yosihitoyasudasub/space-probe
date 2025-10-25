import React from 'react';

export type CameraView = 'free' | 'top' | 'probe';

type Props = {
    probeSpeedMult: number;
    setProbeSpeedMult: (v: number) => void;
    gravityG: number;
    setGravityG: (v: number) => void;
    starMass: number;
    setStarMass: (v: number) => void;
    cameraView: CameraView;
    setCameraView: (v: CameraView) => void;
};

const Controls: React.FC<Props> = ({ probeSpeedMult, setProbeSpeedMult, gravityG, setGravityG, starMass, setStarMass, cameraView, setCameraView }) => {
    return (
        <div id="controls">
            <h3>シミュレーション設定</h3>
            <div>
                <label>Probe speed multiplier: {probeSpeedMult.toFixed(2)}</label>
                <input type="range" min="0.95" max="1.50" step="0.01" value={probeSpeedMult} onChange={(e) => setProbeSpeedMult(Number(e.target.value))} />
            </div>
            <div>
                <label>Gravity G: {gravityG.toFixed(3)}</label>
                <input type="range" min="0.01" max="1.0" step="0.01" value={gravityG} onChange={(e) => setGravityG(Number(e.target.value))} />
            </div>
            <div>
                <label>Star mass: {Math.round(starMass).toLocaleString()}</label>
                <input type="range" min="50000" max="500000" step="5000" value={starMass} onChange={(e) => setStarMass(Number(e.target.value))} />
            </div>
        </div>
    );
};

export default Controls;