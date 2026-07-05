import React, { useState } from 'react';
import { DataPoint, HudSample, SimulationSettings } from '../lib/types';
import { PROBE_MODELS } from '../lib/probeModels';
import MiniChart from './MiniChart';
import MissionProgress from './MissionProgress';
import ControlsHelp from './ControlsHelp';
import SettingsPanel from './SettingsPanel';

interface HUDProps {
    /** Probe statistics sampled by the game loop */
    stats: HudSample;
    velocityHistory?: DataPoint[];
    distanceHistory?: DataPoint[];
    /** Current simulation settings shown in the settings panel */
    settings: SimulationSettings;
    /** Apply a partial settings update */
    onSettingsChange: (patch: Partial<SimulationSettings>) => void;
    selectedModel: string;
    setSelectedModel: (v: string) => void;
    isSimulationStarted: boolean;
    onStart: () => void;
}

type Panel = 'charts' | 'missions' | 'help' | 'settings';

const HUD: React.FC<HUDProps> = ({
    stats,
    velocityHistory = [],
    distanceHistory = [],
    settings,
    onSettingsChange,
    selectedModel,
    setSelectedModel,
    isSimulationStarted,
    onStart,
}) => {
    // At most one panel is open at a time
    const [openPanel, setOpenPanel] = useState<Panel | null>(null);

    const togglePanel = (panel: Panel) => {
        setOpenPanel(prev => (prev === panel ? null : panel));
    };

    return (
        <>
            {/* Free mode Start button - shown only when simulation hasn't started */}
            {!isSimulationStarted && (
                <div className="start-screen">
                    <button className="start-button" onClick={onStart}>
                        Free mode Start
                    </button>
                </div>
            )}
            <div id="ui" className="hud-container hud-compact">
                {/* 上段：統計情報 */}
                <div className="hud-compact-line">
                    <span className="stat-item">
                        STS:
                        <span className={`stat-value status-${stats.status.toLowerCase().replace(' ', '-')}`}>
                            {stats.status}
                        </span>
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">
                        V:<span className="stat-value">{stats.velocityKmPerSec.toFixed(1)}</span>km/s
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">
                        D:<span className="stat-value">{stats.distance.toFixed(0)}</span>AU
                    </span>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">
                        Fuel:
                        <span className={`stat-value ${stats.fuel < 20 ? 'low-fuel' : ''}`}>
                            {stats.fuel.toFixed(1)}
                        </span>%
                    </span>
                </div>

                {/* 下段：ボタン類 */}
                <div className="hud-compact-line">
                    <div className="hud-toggle-buttons">
                        <button
                            className={`toggle-btn ${openPanel === 'charts' ? 'active' : ''}`}
                            onClick={() => togglePanel('charts')}
                            title="Toggle charts"
                        >
                            Charts
                        </button>
                        <button
                            className={`toggle-btn ${openPanel === 'missions' ? 'active' : ''}`}
                            onClick={() => togglePanel('missions')}
                            title="Toggle mission progress"
                        >
                            Missions
                        </button>
                        <button
                            className={`toggle-btn ${openPanel === 'help' ? 'active' : ''}`}
                            onClick={() => togglePanel('help')}
                            title="Show controls"
                        >
                            Controls
                        </button>
                        <button
                            className={`toggle-btn ${openPanel === 'settings' ? 'active' : ''}`}
                            onClick={() => togglePanel('settings')}
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

            {openPanel === 'charts' && (
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
                        <span className="chart-current" style={{ color: '#0f0' }}>{stats.slingshots}</span>
                    </div>
                </div>
            )}

            {openPanel === 'missions' && (
                <div className="hud-missions-panel">
                    <MissionProgress
                        distance={stats.distance}
                        velocity={stats.velocityKmPerSec}
                        slingshots={stats.slingshots}
                        fuel={stats.fuel}
                    />
                </div>
            )}

            {openPanel === 'help' && (
                <div className="hud-help-panel">
                    <ControlsHelp />
                </div>
            )}

            {openPanel === 'settings' && (
                <div className="hud-settings-panel">
                    <SettingsPanel settings={settings} onChange={onSettingsChange} />
                </div>
            )}
        </>
    );
};

export default HUD;
