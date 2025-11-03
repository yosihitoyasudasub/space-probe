import React, { useRef } from 'react';
import { ALL_MISSIONS } from '../data/missions';
import { MissionWithProgress, GameStats } from '../types/mission';

interface MissionProgressProps {
    distance: number;
    velocity: number;
    slingshots: number;
    fuel: number;
    distanceFromSun: number;
    completedMissionIds: Set<string>;
    onMissionCompleted: (missionId: string) => void;
}

const MissionProgress: React.FC<MissionProgressProps> = ({
    distance,
    velocity,
    slingshots,
    fuel,
    distanceFromSun,
    completedMissionIds,
    onMissionCompleted,
}) => {
    // Create game stats object
    const stats: GameStats = {
        distance,
        velocity,
        slingshots,
        fuel,
        distanceFromSun,
    };

    // Track previous completed missions to detect new completions
    const prevCompletedRef = useRef<Set<string>>(new Set());

    // Map missions to include current progress and completion status
    const missions: MissionWithProgress[] = ALL_MISSIONS.map(mission => {
        // Determine current value based on progressField
        const current = stats[mission.progressField];

        // Check if already completed (persisted state)
        const wasCompleted = completedMissionIds.has(mission.id);

        // Check current condition
        const isCurrentlyCompleted = mission.checkCompleted(stats);

        // If newly completed (not in persisted set, but condition met), notify parent
        if (isCurrentlyCompleted && !wasCompleted && !prevCompletedRef.current.has(mission.id)) {
            onMissionCompleted(mission.id);
            prevCompletedRef.current.add(mission.id);
        }

        return {
            ...mission,
            current,
            completed: wasCompleted || isCurrentlyCompleted,
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
