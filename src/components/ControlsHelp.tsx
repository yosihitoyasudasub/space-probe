import React from 'react';

const ControlsHelp: React.FC = () => {
    return (
        <div className="controls-help">
            <div className="help-content">
                <p>← : Left thrust</p>
                <p>→ : Right thrust</p>
                <p>↑ : Speed up</p>
                <p>↓ : Slow down</p>
                <p>R : Restart</p>
            </div>
        </div>
    );
};

export default ControlsHelp;
