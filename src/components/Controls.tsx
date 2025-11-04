import React from 'react';

export type CameraView = 'free' | 'top' | 'probe';

// ====================================================================
// UI Control Range Constants
// ====================================================================
// These define the min/max/step values for control sliders

const UI_RANGE_CONSTANTS = {
    // Probe speed multiplier slider
    PROBE_SPEED_MULT: {
        MIN: 0.95,      // 95% of circular orbit (will decay inward)
        MAX: 1.50,      // 150% of circular orbit (strong escape velocity)
        STEP: 0.01      // 1% increments for fine control
    },

    // Gravity constant (G) slider
    GRAVITY_G: {
        MIN: 0.01,      // Very weak gravity (1% of default)
        MAX: 1.0,       // Default gravity strength
        STEP: 0.01      // 1% increments
    },

    // Star mass slider
    STAR_MASS: {
        MIN: 50000,     // Approximately 15% of realistic sun mass
        MAX: 500000,    // Approximately 150% of realistic sun mass
        STEP: 5000      // Increments of 5000 Earth masses
    }
} as const;

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
                <input
                    type="range"
                    min={UI_RANGE_CONSTANTS.PROBE_SPEED_MULT.MIN}
                    max={UI_RANGE_CONSTANTS.PROBE_SPEED_MULT.MAX}
                    step={UI_RANGE_CONSTANTS.PROBE_SPEED_MULT.STEP}
                    value={probeSpeedMult}
                    onChange={(e) => setProbeSpeedMult(Number(e.target.value))}
                />
            </div>
            <div>
                <label>Gravity G: {gravityG.toFixed(3)}</label>
                <input
                    type="range"
                    min={UI_RANGE_CONSTANTS.GRAVITY_G.MIN}
                    max={UI_RANGE_CONSTANTS.GRAVITY_G.MAX}
                    step={UI_RANGE_CONSTANTS.GRAVITY_G.STEP}
                    value={gravityG}
                    onChange={(e) => setGravityG(Number(e.target.value))}
                />
            </div>
            <div>
                <label>Star mass: {Math.round(starMass).toLocaleString()}</label>
                <input
                    type="range"
                    min={UI_RANGE_CONSTANTS.STAR_MASS.MIN}
                    max={UI_RANGE_CONSTANTS.STAR_MASS.MAX}
                    step={UI_RANGE_CONSTANTS.STAR_MASS.STEP}
                    value={starMass}
                    onChange={(e) => setStarMass(Number(e.target.value))}
                />
            </div>
        </div>
    );
};

export default Controls;