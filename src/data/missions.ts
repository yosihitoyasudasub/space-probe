/**
 * Mission Definitions
 *
 * This file contains all mission definitions for the space probe game.
 * Missions are organized by category (beginner, intermediate, advanced).
 */

import { Mission, GameStats, MissionCategory, MissionReward } from '../types/mission';
import { PLANET_ORBITS, PlanetName } from '../lib/threeSetup';

// ====================================================================
// Reward System - Credit Calculation
// ====================================================================

/**
 * Base rewards by mission category
 */
const CATEGORY_REWARDS: Record<MissionCategory, number> = {
    beginner: 100,
    intermediate: 300,
    advanced: 500,
};

/**
 * Calculate mission reward based on performance
 */
function calculateMissionReward(category: MissionCategory, stats: GameStats): MissionReward {
    const baseCredits = CATEGORY_REWARDS[category];
    let bonusCredits = 0;

    // Fuel efficiency bonus
    if (stats.fuel >= 95) {
        // Perfect: 95%+ fuel remaining
        bonusCredits += 100;
    } else if (stats.fuel >= 90 && category === 'beginner') {
        bonusCredits += 50;
    } else if (stats.fuel >= 80 && category === 'intermediate') {
        bonusCredits += 100;
    } else if (stats.fuel >= 70 && category === 'advanced') {
        bonusCredits += 200;
    }

    return {
        baseCredits,
        bonusCredits,
        totalCredits: baseCredits + bonusCredits,
    };
}

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
        baseReward: CATEGORY_REWARDS[category],
        calculateReward: (stats: GameStats) => calculateMissionReward(category, stats),
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
        baseReward: CATEGORY_REWARDS[category],
        calculateReward: (stats: GameStats) => calculateMissionReward(category, stats),
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
        baseReward: CATEGORY_REWARDS[category],
        calculateReward: (stats: GameStats) => calculateMissionReward(category, stats),
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
        baseReward: CATEGORY_REWARDS[category],
        calculateReward: (stats: GameStats) => calculateMissionReward(category, stats),
    };
}

/**
 * Creates a planet orbit reach mission
 * @param id Mission ID
 * @param planetName Planet name (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune)
 * @param tolerance Tolerance range in AU (default: 0.2 AU)
 * @param category Mission category
 * @param requiredDuration Required time in seconds to stay in orbit range (default: 10 seconds)
 * @param requiredVelocity Required insertion velocity in km/s (optional)
 * @param velocityTolerance Velocity tolerance in km/s (optional, default: 5 km/s)
 */
function createOrbitReachMission(
    id: string,
    planetName: PlanetName,
    tolerance: number = 0.2,
    category: MissionCategory = 'beginner',
    requiredDuration: number = 10,
    requiredVelocity?: number,
    velocityTolerance: number = 5
): Mission {
    const targetOrbit = PLANET_ORBITS[planetName];

    // Build description based on whether velocity requirement exists
    let description = `${planetName}の軌道半径（${targetOrbit.toFixed(2)} AU）に`;
    if (requiredVelocity) {
        description += `${requiredVelocity} ± ${velocityTolerance} km/sで侵入し、`;
    }
    description += `${requiredDuration}秒間滞在`;

    return {
        id,
        title: `${planetName}軌道投入`,
        description,
        category,
        target: targetOrbit,
        unit: 'AU',
        progressField: 'distanceFromSun',
        requiredDuration,
        requiredVelocity,
        velocityTolerance,
        checkCompleted: (stats: GameStats) => {
            const diff = Math.abs(stats.distanceFromSun - targetOrbit);
            const inRange = diff <= tolerance;
            const timeInOrbit = stats.orbitTimes[id] || 0;
            return inRange && timeInOrbit >= requiredDuration;
        },
        baseReward: CATEGORY_REWARDS[category],
        calculateReward: (stats: GameStats) => calculateMissionReward(category, stats),
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
        'intermediate',
        10,
        13,  // Required velocity: 13 km/s (approximately Jupiter's orbital velocity)
        1    // Velocity tolerance: ±1 km/s
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
