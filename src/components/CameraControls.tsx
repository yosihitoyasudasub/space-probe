import React from 'react';
import { CameraView } from './Controls';

interface CameraControlsProps {
    cameraView: CameraView;
    setCameraView: (v: CameraView) => void;
}

const CameraControls: React.FC<CameraControlsProps> = ({ cameraView, setCameraView }) => {
    return (
        <div className="camera-controls">
            <button
                className={`camera-btn ${cameraView === 'free' ? 'active' : ''}`}
                onClick={() => setCameraView('free')}
                title="自由視点（マウス操作）"
            >
                自由視点
            </button>
            <button
                className={`camera-btn ${cameraView === 'top' ? 'active' : ''}`}
                onClick={() => setCameraView('top')}
                title="真上視点（太陽中心）"
            >
                真上視点
            </button>
            <button
                className={`camera-btn ${cameraView === 'probe' ? 'active' : ''}`}
                onClick={() => setCameraView('probe')}
                title="探査機追従視点"
            >
                探査機追従
            </button>
        </div>
    );
};

export default CameraControls;
