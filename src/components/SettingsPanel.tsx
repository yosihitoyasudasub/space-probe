import React from 'react';
import { BGM_TRACKS } from './BGMManager';

interface SettingsPanelProps {
    probeSpeedMult: number;
    setProbeSpeedMult: (v: number) => void;
    gravityG: number;
    setGravityG: (v: number) => void;
    starMass: number;
    setStarMass: (v: number) => void;
    gravityGridEnabled?: boolean;
    setGravityGridEnabled?: (v: boolean) => void;
    gridEnabled?: boolean;
    setGridEnabled?: (v: boolean) => void;
    planetOrbitsEnabled?: boolean;
    setPlanetOrbitsEnabled?: (v: boolean) => void;
    predictionEnabled?: boolean;
    setPredictionEnabled?: (v: boolean) => void;
    bgmEnabled?: boolean;
    setBgmEnabled?: (v: boolean) => void;
    bgmVolume?: number;
    setBgmVolume?: (v: number) => void;
    bgmTrack?: string;
    setBgmTrack?: (v: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    probeSpeedMult,
    setProbeSpeedMult,
    gravityG,
    setGravityG,
    starMass,
    setStarMass,
    gravityGridEnabled = false,
    setGravityGridEnabled = () => {},
    gridEnabled = false,
    setGridEnabled = () => {},
    planetOrbitsEnabled = true,
    setPlanetOrbitsEnabled = () => {},
    predictionEnabled = true,
    setPredictionEnabled = () => {},
    bgmEnabled = false,
    setBgmEnabled = () => {},
    bgmVolume = 0.3,
    setBgmVolume = () => {},
    bgmTrack = BGM_TRACKS[0].path,
    setBgmTrack = () => {},
}) => {
    return (
        <div className="settings-panel">
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
                <div className="setting-item">
                    <label className="gravity-grid-checkbox">
                        <input
                            type="checkbox"
                            checked={gravityGridEnabled}
                            onChange={(e) => setGravityGridEnabled(e.target.checked)}
                        />
                        <span>Show gravity well grid</span>
                    </label>
                </div>
                <div className="setting-item">
                    <label className="gravity-grid-checkbox">
                        <input
                            type="checkbox"
                            checked={gridEnabled}
                            onChange={(e) => setGridEnabled(e.target.checked)}
                        />
                        <span>Show flat grid</span>
                    </label>
                </div>
                <div className="setting-item">
                    <label className="gravity-grid-checkbox">
                        <input
                            type="checkbox"
                            checked={planetOrbitsEnabled}
                            onChange={(e) => setPlanetOrbitsEnabled(e.target.checked)}
                        />
                        <span>Show planet orbits</span>
                    </label>
                </div>
                <div className="setting-item">
                    <label className="gravity-grid-checkbox">
                        <input
                            type="checkbox"
                            checked={predictionEnabled}
                            onChange={(e) => setPredictionEnabled(e.target.checked)}
                        />
                        <span>Show prediction trajectory</span>
                    </label>
                </div>

                {/* BGM Controls */}
                <div className="setting-item">
                    <label className="gravity-grid-checkbox">
                        <input
                            type="checkbox"
                            checked={bgmEnabled}
                            onChange={(e) => setBgmEnabled(e.target.checked)}
                        />
                        <span>Enable BGM</span>
                    </label>
                </div>

                {bgmEnabled && (
                    <>
                        <div className="setting-item">
                            <label>BGM Track</label>
                            <select
                                value={bgmTrack}
                                onChange={(e) => setBgmTrack(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '5px',
                                    marginTop: '5px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '3px',
                                }}
                            >
                                {BGM_TRACKS.map((track) => (
                                    <option key={track.path} value={track.path}>
                                        {track.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="setting-item">
                            <label>BGM Volume: {Math.round(bgmVolume * 100)}%</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={bgmVolume}
                                onChange={(e) => setBgmVolume(Number(e.target.value))}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsPanel;
