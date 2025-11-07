import React, { useState } from 'react';
import { DataPoint, PROBE_MODELS } from '../app/page';
import MiniChart from './MiniChart';
import MissionProgress from './MissionProgress';
import ControlsHelp from './ControlsHelp';
import SettingsPanel from './SettingsPanel';
import { PHYSICS_SCALE, CELESTIAL_CONSTANTS } from '../lib/threeSetup';

interface HUDProps {
    status?: string;
    velocity?: number;
    distance?: number;
    fuel?: number;
    slingshots?: number;
    distanceFromSun?: number;
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
    planetOrbitsEnabled?: boolean;
    setPlanetOrbitsEnabled?: (v: boolean) => void;
    predictionEnabled?: boolean;
    setPredictionEnabled?: (v: boolean) => void;
    selectedModel?: string;
    setSelectedModel?: (v: string) => void;
    isSimulationStarted?: boolean;
    setIsSimulationStarted?: (v: boolean) => void;
    completedMissionIds?: Set<string>;
    onMissionCompleted?: (missionId: string) => void;
    orbitTimes?: Record<string, number>;
}

const HUD: React.FC<HUDProps> = ({
    status = 'Idle',
    velocity = 0,
    distance = 0,
    fuel = 100,
    slingshots = 0,
    distanceFromSun = 1.0,
    velocityHistory = [],
    distanceHistory = [],
    probeSpeedMult = CELESTIAL_CONSTANTS.PROBE.DEFAULT_SPEED_MULTIPLIER,
    setProbeSpeedMult = () => {},
    gravityG = PHYSICS_SCALE.G,
    setGravityG = () => {},
    starMass = PHYSICS_SCALE.SUN_MASS,
    setStarMass = () => {},
    gravityGridEnabled = false,
    setGravityGridEnabled = () => {},
    gridEnabled = true,
    setGridEnabled = () => {},
    planetOrbitsEnabled = true,
    setPlanetOrbitsEnabled = () => {},
    predictionEnabled = true,
    setPredictionEnabled = () => {},
    selectedModel = 'space_fighter',
    setSelectedModel = () => {},
    isSimulationStarted = false,
    setIsSimulationStarted = () => {},
    completedMissionIds = new Set(),
    onMissionCompleted = () => {},
    orbitTimes = {},
}) => {
    const [showCharts, setShowCharts] = useState(false);
    const [showMissions, setShowMissions] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleChartsToggle = () => {
        setShowCharts(!showCharts);
        if (!showCharts) {
            setShowMissions(false);
            setShowHelp(false);
            setShowSettings(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    const handleMissionsToggle = () => {
        setShowMissions(!showMissions);
        if (!showMissions) {
            setShowCharts(false);
            setShowHelp(false);
            setShowSettings(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    const handleHelpToggle = () => {
        setShowHelp(!showHelp);
        if (!showHelp) {
            setShowCharts(false);
            setShowMissions(false);
            setShowSettings(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    const handleSettingsToggle = () => {
        setShowSettings(!showSettings);
        if (!showSettings) {
            setShowCharts(false);
            setShowMissions(false);
            setShowHelp(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    return (
        <>
            {/* Start screen - shown only when simulation hasn't started */}
            {!isSimulationStarted && (
                <div className="start-screen">
                    <div className="start-screen-stars"></div>
                    <div className="start-screen-content">
                        <h1 className="start-screen-title">ORBITAL LINES</h1>
                        <button
                            className="start-button"
                            onClick={() => setIsSimulationStarted(true)}
                        >
                            START
                        </button>
                    </div>
                </div>
            )}
            {/* ハンバーガーメニュー対応HUD */}
            <div id="ui" className="hud-hamburger">
                <button
                    className="hamburger-btn"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    title="Menu"
                >
                    ☰
                </button>
                <div className="hud-stats-compact">
                    <span className="stat-compact">
                        V:<span className="stat-value">{velocity.toFixed(1)}</span>km/s
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-compact">
                        D:<span className="stat-value">{distanceFromSun.toFixed(2)}</span>AU
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-compact">
                        F:<span className={`stat-value ${fuel < 20 ? 'low-fuel' : ''}`}>{fuel.toFixed(1)}</span>%
                    </span>
                </div>
            </div>

            {/* ドロワーメニュー */}
            {isMenuOpen && (
                <>
                    {/* オーバーレイ */}
                    <div
                        className="menu-overlay"
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* メニュー本体 */}
                    <div className="menu-drawer">
                        <div className="menu-items">
                            <button
                                className={`menu-item ${showCharts ? 'active' : ''}`}
                                onClick={handleChartsToggle}
                            >
                                <span className="menu-icon">📊</span>
                                <span>Charts</span>
                            </button>

                            <button
                                className={`menu-item ${showMissions ? 'active' : ''}`}
                                onClick={handleMissionsToggle}
                            >
                                <span className="menu-icon">🎯</span>
                                <span>Missions</span>
                            </button>

                            <button
                                className={`menu-item ${showHelp ? 'active' : ''}`}
                                onClick={handleHelpToggle}
                            >
                                <span className="menu-icon">❓</span>
                                <span>Controls</span>
                            </button>

                            <button
                                className={`menu-item ${showSettings ? 'active' : ''}`}
                                onClick={handleSettingsToggle}
                            >
                                <span className="menu-icon">⚙️</span>
                                <span>Settings</span>
                            </button>

                            <div className="menu-model-selector">
                                <label>Probe Model:</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => {
                                        setSelectedModel(e.target.value);
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    {PROBE_MODELS.map((model) => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {showCharts && (
                <>
                    <div
                        className="panel-overlay"
                        onClick={() => setShowCharts(false)}
                    />
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
                </>
            )}

            {showMissions && (
                <>
                    <div
                        className="panel-overlay"
                        onClick={() => setShowMissions(false)}
                    />
                    <div className="hud-missions-panel">
                        <MissionProgress
                        distance={distance}
                        velocity={velocity}
                        slingshots={slingshots}
                        fuel={fuel}
                        distanceFromSun={distanceFromSun}
                        completedMissionIds={completedMissionIds}
                        onMissionCompleted={onMissionCompleted}
                        orbitTimes={orbitTimes}
                    />
                    </div>
                </>
            )}

            {showHelp && (
                <>
                    <div
                        className="panel-overlay"
                        onClick={() => setShowHelp(false)}
                    />
                    <div className="hud-help-panel">
                        <ControlsHelp />
                    </div>
                </>
            )}

            {showSettings && (
                <>
                    <div
                        className="panel-overlay"
                        onClick={() => setShowSettings(false)}
                    />
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
                        planetOrbitsEnabled={planetOrbitsEnabled}
                        setPlanetOrbitsEnabled={setPlanetOrbitsEnabled}
                        predictionEnabled={predictionEnabled}
                        setPredictionEnabled={setPredictionEnabled}
                    />
                    </div>
                </>
            )}
        </>
    );
};

export default HUD;