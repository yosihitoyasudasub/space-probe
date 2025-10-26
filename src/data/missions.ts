/**
 * Mission Definitions
 *
 * This file contains all mission definitions for the space probe game.
 * Missions are organized by category (beginner, intermediate, advanced).
 */

import { Mission, GameStats, MissionCategory } from '../types/mission';

// ====================================================================
// Helper Functions - Mission Factories
// ====================================================================

/**
 * Creates a distance-based mission
 */
function createDistanceMission(
    id: string,
    title: string,
    description: string,
    target: number,
    category: MissionCategory = 'beginner'
): Mission {
    return {
        id,
        title,
        description,
        category,
        target,
        unit: 'AU',
        checkCompleted: (stats: GameStats) => stats.distance >= target,
    };
}

/**
 * Creates a velocity-based mission
 */
function createVelocityMission(
    id: string,
    title: string,
    description: string,
    target: number,
    category: MissionCategory = 'beginner'
): Mission {
    return {
        id,
        title,
        description,
        category,
        target,
        unit: 'km/s',
        checkCompleted: (stats: GameStats) => stats.velocity >= target,
    };
}

/**
 * Creates a slingshot count mission
 */
function createSlingshotMission(
    id: string,
    title: string,
    description: string,
    target: number,
    category: MissionCategory = 'beginner'
): Mission {
    return {
        id,
        title,
        description,
        category,
        target,
        unit: '回',
        checkCompleted: (stats: GameStats) => stats.slingshots >= target,
    };
}

/**
 * Creates a fuel efficiency mission
 */
function createFuelEfficiencyMission(
    id: string,
    title: string,
    description: string,
    distanceTarget: number,
    fuelTarget: number,
    category: MissionCategory = 'beginner'
): Mission {
    return {
        id,
        title,
        description,
        category,
        target: distanceTarget,
        unit: 'AU',
        checkCompleted: (stats: GameStats) =>
            stats.distance >= distanceTarget && stats.fuel >= fuelTarget,
    };
}

// ====================================================================
// Mission Definitions
// ====================================================================

/**
 * Beginner Missions - Easy goals for new players
 */
export const BEGINNER_MISSIONS: Mission[] = [
    createDistanceMission(
        'reach-1au',
        '1 AU到達',
        '地球の公転軌道半径に到達',
        1,
        'beginner'
    ),
];

/**
 * Intermediate Missions - Medium difficulty challenges
 */
export const INTERMEDIATE_MISSIONS: Mission[] = [
    createDistanceMission(
        'reach-5au',
        '5 AU到達',
        '木星軌道付近に到達',
        5,
        'intermediate'
    ),
    createVelocityMission(
        'speed-20',
        '高速飛行',
        '20 km/s以上の速度を達成',
        20,
        'intermediate'
    ),
    createSlingshotMission(
        'slingshot-3',
        'スイングバイマスター',
        '3回以上のスイングバイ実行',
        3,
        'intermediate'
    ),
    createFuelEfficiencyMission(
        'fuel-efficient',
        '燃料節約',
        '燃料50%以上残して5 AU到達',
        5,
        50,
        'intermediate'
    ),
];

/**
 * Advanced Missions - Difficult challenges for experienced players
 */
export const ADVANCED_MISSIONS: Mission[] = [
    // Advanced missions can be added here in the future
];

/**
 * All missions combined
 */
export const ALL_MISSIONS: Mission[] = [
    ...BEGINNER_MISSIONS,
    ...INTERMEDIATE_MISSIONS,
    ...ADVANCED_MISSIONS,
];

// ====================================================================
// Utility Functions
// ====================================================================

/**
 * Get missions by category
 */
export function getMissionsByCategory(category: MissionCategory): Mission[] {
    return ALL_MISSIONS.filter(mission => mission.category === category);
}

/**
 * Get mission by ID
 */
export function getMissionById(id: string): Mission | undefined {
    return ALL_MISSIONS.find(mission => mission.id === id);
}

/**
 * Get total number of missions
 */
export function getTotalMissionCount(): number {
    return ALL_MISSIONS.length;
}

/**
 * Get completed missions count
 */
export function getCompletedMissionsCount(stats: GameStats): number {
    return ALL_MISSIONS.filter(mission => mission.checkCompleted(stats)).length;
}
