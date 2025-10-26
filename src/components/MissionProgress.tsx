import React from 'react';
import { ALL_MISSIONS } from '../data/missions';
import { MissionWithProgress, GameStats } from '../types/mission';

interface MissionProgressProps {
    distance: number;
    velocity: number;
    slingshots: number;
    fuel: number;
}

const MissionProgress: React.FC<MissionProgressProps> = ({
    distance,
    velocity,
    slingshots,
    fuel,
}) => {
    // Create game stats object
    const stats: GameStats = {
        distance,
        velocity,
        slingshots,
        fuel,
    };

    // Map missions to include current progress and completion status
    const missions: MissionWithProgress[] = ALL_MISSIONS.map(mission => {
        // Determine current value based on unit type
        let current: number;
        if (mission.unit === 'AU') {
            current = distance;
        } else if (mission.unit === 'km/s') {
            current = velocity;
        } else if (mission.unit === '回') {
            current = slingshots;
        } else {
            current = 0;
        }

        return {
            ...mission,
            current,
            completed: mission.checkCompleted(stats),
        };
    });

    const completedCount = missions.filter(m => m.completed).length;
    const totalMissions = missions.length;
    const completionPercentage = (completedCount / totalMissions) * 100;

    return (
        <div className="mission-progress">
            <div className="mission-header">
                <h3>ミッション進捗</h3>
                <div className="overall-progress">
                    <span className="progress-text">
                        {completedCount} / {totalMissions} 完了
                    </span>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                </div>
            </div>
            <div className="mission-list">
                {missions.map(mission => {
                    const progress = Math.min((mission.current / mission.target) * 100, 100);
                    return (
                        <div
                            key={mission.id}
                            className={`mission-item ${mission.completed ? 'completed' : ''}`}
                        >
                            <div className="mission-info">
                                <div className="mission-title">
                                    {mission.completed && <span className="checkmark">✓</span>}
                                    {mission.title}
                                </div>
                                <div className="mission-description">{mission.description}</div>
                            </div>
                            <div className="mission-status">
                                <span className="mission-value">
                                    {mission.current.toFixed(1)} / {mission.target} {mission.unit}
                                </span>
                                <div className="mission-progress-bar">
                                    <div
                                        className="mission-progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MissionProgress;
