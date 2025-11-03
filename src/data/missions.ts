/**
 * Mission Definitions
 *
 * This file contains all mission definitions for the space probe game.
 * Missions are organized by category (beginner, intermediate, advanced).
 */

import { Mission, GameStats, MissionCategory } from '../types/mission';
import { PLANET_ORBITS, PlanetName } from '../lib/threeSetup';

// ====================================================================
// Helper Functions - Mission Factories
// ====================================================================

/**
 * Creates a distance-based mission (distance from the sun)
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
        progressField: 'distanceFromSun',
        checkCompleted: (stats: GameStats) => stats.distanceFromSun >= target,
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
        progressField: 'velocity',
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
        progressField: 'slingshots',
        checkCompleted: (stats: GameStats) => stats.slingshots >= target,
    };
}

/**
 * Creates a fuel efficiency mission (distance from the sun + fuel requirement)
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
        progressField: 'distanceFromSun',
        checkCompleted: (stats: GameStats) =>
            stats.distanceFromSun >= distanceTarget && stats.fuel >= fuelTarget,
    };
}

/**
 * Creates a planet orbit reach mission
 * @param id Mission ID
 * @param planetName Planet name (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune)
 * @param tolerance Tolerance range in AU (default: 0.2 AU)
 * @param category Mission category
 */
function createOrbitReachMission(
    id: string,
    planetName: PlanetName,
    tolerance: number = 0.2,
    category: MissionCategory = 'beginner'
): Mission {
    const targetOrbit = PLANET_ORBITS[planetName];

    return {
        id,
        title: `${planetName}軌道到達`,
        description: `${planetName}の軌道半径（${targetOrbit.toFixed(2)} AU）付近に到達`,
        category,
        target: targetOrbit,
        unit: 'AU',
        progressField: 'distanceFromSun',
        checkCompleted: (stats: GameStats) => {
            const diff = Math.abs(stats.distanceFromSun - targetOrbit);
            return diff <= tolerance;
        },
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
    createOrbitReachMission(
        'reach-jupiter-orbit',
        'Jupiter',
        0.3,
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
