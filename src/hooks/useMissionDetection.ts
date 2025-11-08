import { useRef, useEffect } from 'react';
import { ALL_MISSIONS } from '../data/missions';
import { GameStats } from '../types/mission';

interface UseMissionDetectionProps {
    stats: GameStats;
    completedMissionIds: Set<string>;
    onMissionCompleted: (missionId: string, mission: any) => void;
}

/**
 * Custom hook to detect mission completion and trigger callbacks.
 * This runs independently of UI rendering to ensure missions are detected
 * regardless of which panel is currently open.
 */
export const useMissionDetection = ({
    stats,
    completedMissionIds,
    onMissionCompleted,
}: UseMissionDetectionProps) => {
    // Track previous completed missions to detect new completions
    const prevCompletedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Check each mission for completion
        ALL_MISSIONS.forEach(mission => {
            // Skip if already in persisted completed set
            if (completedMissionIds.has(mission.id)) {
                return;
            }

            // Skip if we already detected this completion
            if (prevCompletedRef.current.has(mission.id)) {
                return;
            }

            // Check if mission is newly completed
            const isCompleted = mission.checkCompleted(stats);
            if (isCompleted) {
                // Mark as detected to prevent duplicate notifications
                prevCompletedRef.current.add(mission.id);

                // Notify parent
                onMissionCompleted(mission.id, mission);
            }
        });
    }, [stats, completedMissionIds, onMissionCompleted]);
};
