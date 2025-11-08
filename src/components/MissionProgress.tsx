import React from 'react';
import { ALL_MISSIONS } from '../data/missions';
import { MissionWithProgress, GameStats } from '../types/mission';

interface MissionProgressProps {
    distance: number;
    velocity: number;
    slingshots: number;
    fuel: number;
    distanceFromSun: number;
    completedMissionIds: Set<string>;
    onMissionCompleted: (missionId: string, mission: any) => void;
    orbitTimes: Record<string, number>;
}

const MissionProgress: React.FC<MissionProgressProps> = ({
    distance,
    velocity,
    slingshots,
    fuel,
    distanceFromSun,
    completedMissionIds,
    onMissionCompleted,
    orbitTimes,
}) => {
    // Create game stats object
    const stats: GameStats = {
        distance,
        velocity,
        slingshots,
        fuel,
        distanceFromSun,
        orbitTimes,
    };

    // Map missions to include current progress and completion status
    // Note: Mission completion detection is now handled by useMissionDetection hook in HUD
    const missions: MissionWithProgress[] = ALL_MISSIONS.map(mission => {
        // For time-based missions, show orbit time instead of distance
        let current: number;
        if (mission.requiredDuration) {
            // This is a time-based orbit mission
            current = orbitTimes[mission.id] || 0;
        } else {
            // Regular mission - use the progressField
            current = stats[mission.progressField];
        }

        // Check if completed (from persisted state or current condition)
        const wasCompleted = completedMissionIds.has(mission.id);
        const isCurrentlyCompleted = mission.checkCompleted(stats);

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
                    let progress: number;
                    let displayValue: string;
                    let displayTarget: string;
                    let displayUnit: string;

                    if (mission.requiredDuration) {
                        // Time-based mission: show time progress
                        progress = Math.min((mission.current / mission.requiredDuration) * 100, 100);
                        displayValue = mission.current.toFixed(1);
                        displayTarget = mission.requiredDuration.toString();
                        displayUnit = '秒';
                    } else {
                        // Regular mission: show normal progress
                        progress = Math.min((mission.current / mission.target) * 100, 100);
                        displayValue = mission.current.toFixed(1);
                        displayTarget = mission.target.toString();
                        displayUnit = mission.unit;
                    }

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
                                    {displayValue} / {displayTarget} {displayUnit}
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
