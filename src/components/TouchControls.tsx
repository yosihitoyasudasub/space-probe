import React from 'react';

const TouchControls: React.FC = () => {
    const handleTouchStart = (key: 'left' | 'right' | 'up' | 'down' | 'restart') => (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        if (key === 'restart') {
            // Call restart function
            if ((window as any).__restartSimulation) {
                (window as any).__restartSimulation();
            }
        } else {
            // Set input state
            const inputState = (window as any).__gameInputState;
            if (inputState) {
                inputState[key] = true;
            }
        }
    };

    const handleTouchEnd = (key: 'left' | 'right' | 'up' | 'down') => (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        const inputState = (window as any).__gameInputState;
        if (inputState) {
            inputState[key] = false;
        }
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
