import React, { useState } from 'react';
import { DataPoint } from '../app/page';
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
                <div className="hud-compact-line">
                    <div className="hud-toggle-buttons">
                        <button
                            className={`toggle-btn ${showCharts ? 'active' : ''}`}
                            onClick={handleChartsToggle}
                            title="グラフ表示の切り替え"
                        >
                            グラフ
                        </button>
                        <button
                            className={`toggle-btn ${showMissions ? 'active' : ''}`}
                            onClick={handleMissionsToggle}
                            title="ミッション進捗の切り替え"
                        >
                            ミッション
                        </button>
                        <button
                            className={`toggle-btn ${showHelp ? 'active' : ''}`}
                            onClick={handleHelpToggle}
                            title="操作方法の表示"
                        >
                            操作方法
                        </button>
                        <button
                            className={`toggle-btn ${showSettings ? 'active' : ''}`}
                            onClick={handleSettingsToggle}
                            title="シミュレーション設定"
                        >
                            設定
                        </button>
                    </div>
                    <label className="gravity-grid-checkbox" title="重力井戸グリッド表示">
                        <input
                            type="checkbox"
                            checked={gravityGridEnabled}
                            onChange={(e) => setGravityGridEnabled(e.target.checked)}
                        />
                        <span>重力井戸</span>
                    </label>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">
                        状態:
                        <span className={`stat-value status-${status.toLowerCase().replace(' ', '-')}`}>
                            {status}
                        </span>
                    </span>
                    <span className="stat-separator">,</span>
                    <span className="stat-item">
                        速度:<span className="stat-value">{velocity.toFixed(1)}</span>km/s
                    </span>
                    <span className="stat-separator">,</span>
                    <span className="stat-item">
                        距離:<span className="stat-value">{distance.toFixed(2)}</span>AU
                    </span>
                    <span className="stat-separator">,</span>
                    <span className="stat-item">
                        燃料:
                        <span className={`stat-value ${fuel < 20 ? 'low-fuel' : ''}`}>
                            {fuel.toFixed(1)}
                        </span>%
                    </span>
                    <span className="stat-separator">,</span>
                    <span className="stat-item">
                        スイングバイ:<span className="stat-value">{slingshots}</span>回
                    </span>
                </div>
            </div>

            {showCharts && (
                <div className="hud-charts-panel">
                    <MiniChart
                        data={velocityHistory}
                        color="#00ff88"
                        label="速度"
                        unit="km/s"
                    />
                    <MiniChart
                        data={distanceHistory}
                        color="#00aaff"
                        label="距離"
                        unit="AU"
                    />
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
                    />
                </div>
            )}
        </>
    );
};

export default HUD;