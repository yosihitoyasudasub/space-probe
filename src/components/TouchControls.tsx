import React from 'react';
import { InputState } from '../lib/thrust';

interface Props {
    /** Shared input state read by the game loop each physics step */
    inputStateRef: React.RefObject<InputState>;
    onRestart: () => void;
}

const TouchControls: React.FC<Props> = ({ inputStateRef, onRestart }) => {
    const handleTouchStart = (key: keyof InputState | 'restart') => (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        if (key === 'restart') {
            onRestart();
        } else {
            inputStateRef.current[key] = true;
        }
    };

    const handleTouchEnd = (key: keyof InputState) => (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        inputStateRef.current[key] = false;
    };

    return (
        <>
            {/* Bottom-right: Arrow buttons */}
            <div className="touch-arrows">
                <div className="touch-row">
                    <button
                        className="touch-btn touch-btn-up"
                        onTouchStart={handleTouchStart('up')}
                        onTouchEnd={handleTouchEnd('up')}
                        onMouseDown={handleTouchStart('up')}
                        onMouseUp={handleTouchEnd('up')}
                        onMouseLeave={handleTouchEnd('up')}
                    >
                        ↑
                    </button>
                </div>
                <div className="touch-row">
                    <button
                        className="touch-btn touch-btn-left"
                        onTouchStart={handleTouchStart('left')}
                        onTouchEnd={handleTouchEnd('left')}
                        onMouseDown={handleTouchStart('left')}
                        onMouseUp={handleTouchEnd('left')}
                        onMouseLeave={handleTouchEnd('left')}
                    >
                        ←
                    </button>
                    <button
                        className="touch-btn touch-btn-down"
                        onTouchStart={handleTouchStart('down')}
                        onTouchEnd={handleTouchEnd('down')}
                        onMouseDown={handleTouchStart('down')}
                        onMouseUp={handleTouchEnd('down')}
                        onMouseLeave={handleTouchEnd('down')}
                    >
                        ↓
                    </button>
                    <button
                        className="touch-btn touch-btn-right"
                        onTouchStart={handleTouchStart('right')}
                        onTouchEnd={handleTouchEnd('right')}
                        onMouseDown={handleTouchStart('right')}
                        onMouseUp={handleTouchEnd('right')}
                        onMouseLeave={handleTouchEnd('right')}
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Right-center: Restart button */}
            <div className="touch-restart">
                <button
                    className="touch-btn touch-btn-restart"
                    onTouchStart={handleTouchStart('restart')}
                    onMouseDown={handleTouchStart('restart')}
                >
                    R
                </button>
            </div>
        </>
    );
};

export default TouchControls;
