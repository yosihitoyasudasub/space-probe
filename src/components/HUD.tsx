import React, { useState } from 'react';
import { DataPoint, PROBE_MODELS } from '../app/page';
import MiniChart from './MiniChart';
import MissionProgress from './MissionProgress';
import ControlsHelp from './ControlsHelp';
import SettingsPanel from './SettingsPanel';
import CreditsPanel from './CreditsPanel';
import { PHYSICS_SCALE, CELESTIAL_CONSTANTS } from '../lib/threeSetup';
import { useMissionDetection } from '../hooks/useMissionDetection';

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
    bgmEnabled?: boolean;
    setBgmEnabled?: (v: boolean) => void;
    bgmVolume?: number;
    setBgmVolume?: (v: number) => void;
    bgmTrack?: string;
    setBgmTrack?: (v: string) => void;
    selectedModel?: string;
    setSelectedModel?: (v: string) => void;
    isSimulationStarted?: boolean;
    setIsSimulationStarted?: () => void;
    isLoading?: boolean;
    isInitialized?: boolean;
    showInstructions?: boolean;
    onInstructionsClose?: () => void;
    completedMissionIds?: Set<string>;
    onMissionCompleted?: (missionId: string, mission: any) => void;
    orbitTimes?: Record<string, number>;
    totalCredits?: number;
    earnedCredits?: Record<string, number>;
    recentReward?: {
        missionTitle: string;
        baseCredits: number;
        bonusCredits: number;
        totalCredits: number;
    } | null;
    onReset?: () => void;
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
    bgmEnabled = false,
    setBgmEnabled = () => {},
    bgmVolume = 0.3,
    setBgmVolume = () => {},
    bgmTrack,
    setBgmTrack = () => {},
    selectedModel = 'space_fighter',
    setSelectedModel = () => {},
    isSimulationStarted = false,
    setIsSimulationStarted = () => {},
    isLoading = false,
    isInitialized = false,
    showInstructions = false,
    onInstructionsClose = () => {},
    completedMissionIds = new Set(),
    onMissionCompleted = () => {},
    orbitTimes = {},
    totalCredits = 0,
    earnedCredits = {},
    recentReward = null,
    onReset,
}) => {
    const [showCredits, setShowCredits] = useState(false);
    const [showMissions, setShowMissions] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Always detect mission completions regardless of which panel is open
    useMissionDetection({
        stats: {
            distance,
            velocity,
            slingshots,
            fuel,
            distanceFromSun,
            orbitTimes,
        },
        completedMissionIds,
        onMissionCompleted,
    });

    const handleCreditsToggle = () => {
        setShowCredits(!showCredits);
        if (!showCredits) {
            setShowMissions(false);
            setShowHelp(false);
            setShowSettings(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    const handleMissionsToggle = () => {
        setShowMissions(!showMissions);
        if (!showMissions) {
            setShowCredits(false);
            setShowHelp(false);
            setShowSettings(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    const handleHelpToggle = () => {
        setShowHelp(!showHelp);
        if (!showHelp) {
            setShowCredits(false);
            setShowMissions(false);
            setShowSettings(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    const handleSettingsToggle = () => {
        setShowSettings(!showSettings);
        if (!showSettings) {
            setShowCredits(false);
            setShowMissions(false);
            setShowHelp(false);
        }
        setIsMenuOpen(false); // メニューを閉じる
    };

    return (
        <>
            {/* Start screen - shown only when simulation hasn't started */}
            {!isSimulationStarted && !isLoading && (
                <div className="start-screen">
                    <div className="start-screen-stars"></div>
                    <div className="start-screen-content">
                        <h1 className="start-screen-title">ORBITAL LINES</h1>
                        <button
                            className="start-button"
                            onClick={setIsSimulationStarted}
                        >
                            START
                        </button>
                    </div>
                </div>
            )}
            {/* Loading screen - shown while Three.js is initializing */}
            {isLoading && !isInitialized && (
                <div className="loading-screen">
                    <div className="loading-content">
                        <h1 className="loading-title">INITIALIZING</h1>
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Loading resources...</p>
                        <p className="loading-subtext">This may take a few moments on first launch</p>
                    </div>
                </div>
            )}
            {/* Instructions screen - shown after loading completes */}
            {showInstructions && (
                <div className="instructions-screen">
                    <div className="instructions-content">
                        <h1 className="instructions-title">HOW TO PLAY</h1>
                        <div className="instructions-body">
                            <div className="instruction-section">
                                <h2>🎯 Objective</h2>
                                <p>Navigate your spacecraft through the solar system using gravity assists to complete missions.</p>
                            </div>
                            <div className="instruction-section">
                                <h2>🕹️ Controls</h2>
                                <ul>
                                    <li><strong>WASD</strong> or <strong>Arrow Keys</strong>: Apply thrust</li>
                                    <li><strong>Mouse Drag</strong>: Rotate camera view</li>
                                    <li><strong>Mouse Wheel</strong>: Zoom in/out</li>
                                    <li><strong>Space</strong>: Pause/Resume simulation</li>
                                </ul>
                            </div>
                            <div className="instruction-section">
                                <h2>⚡ Tips</h2>
                                <ul>
                                    <li>Use gravity assists (swing-bys) to gain speed</li>
                                    <li>Plan your trajectory carefully to save fuel</li>
                                    <li>Watch your velocity and distance in the HUD</li>
                                </ul>
                            </div>
                        </div>
                        <button
                            className="instructions-start-button"
                            onClick={onInstructionsClose}
                        >
                            START MISSION
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
                                className={`menu-item ${showCredits ? 'active' : ''}`}
                                onClick={handleCreditsToggle}
                            >
                                <span className="menu-icon">💰</span>
                                <span>Credits</span>
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

                            {onReset && (
                                <button
                                    className="menu-item"
                                    onClick={() => {
                                        onReset();
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <span className="menu-icon">🔄</span>
                                    <span>Reset</span>
                                </button>
                            )}

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

            {showCredits && (
                <>
                    <div
                        className="panel-overlay"
                        onClick={() => setShowCredits(false)}
                    />
                    <div className="hud-credits-panel">
                        <CreditsPanel
                            totalCredits={totalCredits}
                            earnedCredits={earnedCredits}
                            recentReward={recentReward}
                        />
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
                        bgmEnabled={bgmEnabled}
                        setBgmEnabled={setBgmEnabled}
                        bgmVolume={bgmVolume}
                        setBgmVolume={setBgmVolume}
                        bgmTrack={bgmTrack}
                        setBgmTrack={setBgmTrack}
                    />
                    </div>
                </>
            )}
        </>
    );
};

export default HUD;