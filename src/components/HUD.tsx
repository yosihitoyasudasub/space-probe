import React, { useState } from 'react';
import { DataPoint, PROBE_MODELS } from '../app/page';
import MiniChart from './MiniChart';
import MissionProgress from './MissionProgress';
import ControlsHelp from './ControlsHelp';
import SettingsPanel from './SettingsPanel';

interface HUDProps {
    status?: string;
    velocity?: number;
    distance?: number;
    fuel?: number;
    slingshots?: number;
    velocityHistory?: DataPoint[];
    distanceHistory?: DataPoint[];
    probeSpeedMult?: number;
    setProbeSpeedMult?: (v: number) => void;
    gravityG?: number;
    setGravityG?: (v: number) => void;
    starMass?: number;
    setStarMass?: (v: number) => void;
    gravityGridEnabled?: boolean;
    setGravityGridEnabled?: (v: boolean) => void;
    gridEnabled?: boolean;
    setGridEnabled?: (v: boolean) => void;
    selectedModel?: string;
    setSelectedModel?: (v: string) => void;
}

const HUD: React.FC<HUDProps> = ({
    status = 'Idle',
    velocity = 0,
    distance = 0,
    fuel = 100,
    slingshots = 0,
    velocityHistory = [],
    distanceHistory = [],
    probeSpeedMult = 1.05,
    setProbeSpeedMult = () => {},
    gravityG = 0.133,
    setGravityG = () => {},
    starMass = 333000,
    setStarMass = () => {},
    gravityGridEnabled = false,
    setGravityGridEnabled = () => {},
    gridEnabled = true,
    setGridEnabled = () => {},
    selectedModel = 'space_fighter',
    setSelectedModel = () => {},
}) => {
    const [showCharts, setShowCharts] = useState(false);
    const [showMissions, setShowMissions] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleChartsToggle = () => {
        setShowCharts(!showCharts);
        if (!showCharts) {
            setShowMissions(false);
            setShowHelp(false);
            setShowSettings(false);
        }
    };

    const handleMissionsToggle = () => {
        setShowMissions(!showMissions);
        if (!showMissions) {
            setShowCharts(false);
            setShowHelp(false);
            setShowSettings(false);
        }
    };

    const handleHelpToggle = () => {
        setShowHelp(!showHelp);
        if (!showHelp) {
            setShowCharts(false);
            setShowMissions(false);
            setShowSettings(false);
        }
    };

    const handleSettingsToggle = () => {
        setShowSettings(!showSettings);
        if (!showSettings) {
            setShowCharts(false);
            setShowMissions(false);
            setShowHelp(false);
        }
    };

    return (
        <>
            <div id="ui" className="hud-container hud-compact">
                {/* 上段：統計情報 */}
                <div className="hud-compact-line">
                    <span className="stat-item">
                        STS:
                        <span className={`stat-value status-${status.toLowerCase().replace(' ', '-')}`}>
                            {status}
                        </span>
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">
                        V:<span className="stat-value">{velocity.toFixed(1)}</span>km/s
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">
                        D:<span className="stat-value">{distance.toFixed(0)}</span>AU
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">
                        Fuel:
                        <span className={`stat-value ${fuel < 20 ? 'low-fuel' : ''}`}>
                            {fuel.toFixed(1)}
                        </span>%
                    </span>
                </div>

                {/* 下段：ボタン類 */}
                <div className="hud-compact-line">
                    <div className="hud-toggle-buttons">
                        <button
                            className={`toggle-btn ${showCharts ? 'active' : ''}`}
                            onClick={handleChartsToggle}
                            title="Toggle charts"
                        >
                            Charts
                        </button>
                        <button
                            className={`toggle-btn ${showMissions ? 'active' : ''}`}
                            onClick={handleMissionsToggle}
                            title="Toggle mission progress"
                        >
                            Missions
                        </button>
                        <button
                            className={`toggle-btn ${showHelp ? 'active' : ''}`}
                            onClick={handleHelpToggle}
                            title="Show controls"
                        >
                            Controls
                        </button>
                        <button
                            className={`toggle-btn ${showSettings ? 'active' : ''}`}
                            onClick={handleSettingsToggle}
                            title="Simulation settings"
                        >
                            Settings
                        </button>
                        <label className="model-selector" title="Select probe model">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="model-dropdown"
                            >
                                {PROBE_MODELS.map((model) => (
                                    <option key={model.value} value={model.value}>
                                        {model.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
            </div>

            {showCharts && (
                <div className="hud-charts-panel">
                    <MiniChart
                        data={velocityHistory}
                        color="#00ff88"
                        label="Velocity"
                        unit="km/s"
                    />
                    <MiniChart
                        data={distanceHistory}
                        color="#00aaff"
                        label="Distance"
                        unit="AU"
                    />
                    <div className="chart-slingshots">
                        <span className="chart-label">Swing-by count:</span>
                        <span className="chart-current" style={{ color: '#0f0' }}>{slingshots}</span>
                    </div>
                </div>
            )}

            {showMissions && (
                <div className="hud-missions-panel">
                    <MissionProgress
                        distance={distance}
                        velocity={velocity}
                        slingshots={slingshots}
                        fuel={fuel}
                    />
                </div>
            )}

            {showHelp && (
                <div className="hud-help-panel">
                    <ControlsHelp />
                </div>
            )}

            {showSettings && (
                <div className="hud-settings-panel">
                    <SettingsPanel
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
                    />
                </div>
            )}
        </>
    );
};

export default HUD;