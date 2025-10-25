import React from 'react';

interface SettingsPanelProps {
    probeSpeedMult: number;
    setProbeSpeedMult: (v: number) => void;
    gravityG: number;
    setGravityG: (v: number) => void;
    starMass: number;
    setStarMass: (v: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    probeSpeedMult,
    setProbeSpeedMult,
    gravityG,
    setGravityG,
    starMass,
    setStarMass,
}) => {
    return (
        <div className="settings-panel">
            <h3>シミュレーション設定</h3>
            <div className="settings-content">
                <div className="setting-item">
                    <label>Probe speed multiplier: {probeSpeedMult.toFixed(2)}</label>
                    <input
                        type="range"
                        min="0.95"
                        max="1.50"
                        step="0.01"
                        value={probeSpeedMult}
                        onChange={(e) => setProbeSpeedMult(Number(e.target.value))}
                    />
                </div>
                <div className="setting-item">
                    <label>Gravity G: {gravityG.toFixed(3)}</label>
                    <input
                        type="range"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        value={gravityG}
                        onChange={(e) => setGravityG(Number(e.target.value))}
                    />
                </div>
                <div className="setting-item">
                    <label>Star mass: {Math.round(starMass).toLocaleString()}</label>
                    <input
                        type="range"
                        min="50000"
                        max="500000"
                        step="5000"
                        value={starMass}
                        onChange={(e) => setStarMass(Number(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
