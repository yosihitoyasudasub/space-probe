import React from 'react';
import { SimulationSettings } from '../lib/types';

interface SettingsPanelProps {
    settings: SimulationSettings;
    /** Apply a partial settings update */
    onChange: (patch: Partial<SimulationSettings>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
    return (
        <div className="settings-panel">
            <div className="settings-content">
                <div className="setting-item">
                    <label>Probe speed multiplier: {settings.probeSpeedMult.toFixed(2)}</label>
                    <input
                        type="range"
                        min="0.95"
                        max="1.50"
                        step="0.01"
                        value={settings.probeSpeedMult}
                        onChange={(e) => onChange({ probeSpeedMult: Number(e.target.value) })}
                    />
                </div>
                <div className="setting-item">
                    <label>Gravity G: {settings.gravityG.toFixed(3)}</label>
                    <input
                        type="range"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        value={settings.gravityG}
                        onChange={(e) => onChange({ gravityG: Number(e.target.value) })}
                    />
                </div>
                <div className="setting-item">
                    <label>Star mass: {Math.round(settings.starMass).toLocaleString()}</label>
                    <input
                        type="range"
                        min="50000"
                        max="500000"
                        step="5000"
                        value={settings.starMass}
                        onChange={(e) => onChange({ starMass: Number(e.target.value) })}
                    />
                </div>
                <div className="setting-item">
                    <label className="gravity-grid-checkbox">
                        <input
                            type="checkbox"
                            checked={settings.gravityGridEnabled}
                            onChange={(e) => onChange({ gravityGridEnabled: e.target.checked })}
                        />
                        <span>Show gravity well grid</span>
                    </label>
                </div>
                <div className="setting-item">
                    <label className="gravity-grid-checkbox">
                        <input
                            type="checkbox"
                            checked={settings.gridEnabled}
                            onChange={(e) => onChange({ gridEnabled: e.target.checked })}
                        />
                        <span>Show flat grid</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
