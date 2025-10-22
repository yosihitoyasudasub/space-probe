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
            <h3>操作方法</h3>
            <p>← : 進行方向の左に推進</p>
            <p>→ : 進行方向の右に推進</p>
            <p>↑ : 進行方向に加速</p>
            <p>↓ : 進行方向に減速（ブレーキ）</p>
            <p>R : リスタート</p>
            <p style={{ fontSize: '0.85em', marginTop: '8px', color: '#888' }}>
                ※矢印キーは常に探査機の速度方向を基準にします
            </p>

            <hr />
            <div>
                <label>カメラ視点:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    <button
                        onClick={() => setCameraView('free')}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: cameraView === 'free' ? '#4CAF50' : '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        自由視点（マウス操作）
                    </button>
                    <button
                        onClick={() => setCameraView('top')}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: cameraView === 'top' ? '#4CAF50' : '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        真上視点（太陽中心）
                    </button>
                    <button
                        onClick={() => setCameraView('probe')}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: cameraView === 'probe' ? '#4CAF50' : '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        探査機追従視点
                    </button>
                </div>
            </div>

            <hr />
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