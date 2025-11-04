import React, { useRef, useEffect } from 'react';
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

    // Track previous completed missions to detect new completions
    const prevCompletedRef = useRef<Set<string>>(new Set());

    // Track newly completed missions to notify in useEffect
    const newlyCompletedRef = useRef<string[]>([]);

    // Map missions to include current progress and completion status
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

        // Check if already completed (persisted state)
        const wasCompleted = completedMissionIds.has(mission.id);

        // Check current condition
        const isCurrentlyCompleted = mission.checkCompleted(stats);

        // If newly completed (not in persisted set, but condition met), mark for notification
        if (isCurrentlyCompleted && !wasCompleted && !prevCompletedRef.current.has(mission.id)) {
            newlyCompletedRef.current.push(mission.id);
            prevCompletedRef.current.add(mission.id);
        }

        return {
            ...mission,
            current,
            completed: wasCompleted || isCurrentlyCompleted,
        };
    });

    // Notify parent about newly completed missions in useEffect (after render)
    useEffect(() => {
        if (newlyCompletedRef.current.length > 0) {
            newlyCompletedRef.current.forEach(missionId => {
                onMissionCompleted(missionId);
            });
            newlyCompletedRef.current = [];
        }
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
