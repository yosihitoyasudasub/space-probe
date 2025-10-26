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
                title="Free Camera View"
            >
                Free
            </button>
            <button
                className={`camera-btn ${cameraView === 'top' ? 'active' : ''}`}
                onClick={() => setCameraView('top')}
                title="Top View"
            >
                Top
            </button>
            <button
                className={`camera-btn ${cameraView === 'probe' ? 'active' : ''}`}
                onClick={() => setCameraView('probe')}
                title="Follow Probe View"
            >
                Follow
            </button>
        </div>
    );
};

export default CameraControls;
