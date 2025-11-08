/**
 * Mission Type Definitions
 *
 * Defines the structure of missions and game statistics
 * for the space probe simulation game.
 */

/**
 * Mission category/difficulty levels
 */
export type MissionCategory = 'beginner' | 'intermediate' | 'advanced';

/**
 * Game statistics used for mission completion checking
 */
export interface GameStats {
    distance: number;           // Distance traveled in AU (累積移動距離)
    velocity: number;           // Current velocity in km/s (現在速度)
    slingshots: number;         // Number of slingshot maneuvers performed (スイングバイ回数)
    fuel: number;               // Remaining fuel percentage (0-100) (残燃料)
    distanceFromSun: number;    // Current distance from the sun in AU (太陽からの現在距離)
    orbitTimes: Record<string, number>; // Time spent in orbit range for each mission (seconds)
}

/**
 * Field in GameStats to use for mission progress display
 */
export type ProgressField = 'distance' | 'distanceFromSun' | 'velocity' | 'slingshots' | 'fuel';

/**
 * Mission reward structure
 */
export interface MissionReward {
    baseCredits: number;        // Base credit reward
    bonusCredits?: number;      // Bonus credits (calculated based on performance)
    totalCredits: number;       // Total credits earned (base + bonus)
}

/**
 * Mission definition structure
 */
export interface Mission {
    id: string;                                      // Unique mission identifier
    title: string;                                   // Mission display title
    description: string;                             // Mission description
    category: MissionCategory;                       // Difficulty category
    target: number;                                  // Target value to achieve
    unit: string;                                    // Unit of measurement
    progressField: ProgressField;                    // Which GameStats field to show for progress
    checkCompleted: (stats: GameStats) => boolean;   // Function to check if mission is completed
    requiredDuration?: number;                       // Required duration in seconds for time-based missions (e.g., orbit missions)
    requiredVelocity?: number;                       // Required velocity in km/s for orbit insertion missions
    velocityTolerance?: number;                      // Velocity tolerance in km/s (±range)
    baseReward: number;                              // Base credit reward for completing this mission
    calculateReward?: (stats: GameStats) => MissionReward;  // Optional custom reward calculation
}

/**
 * Mission with current progress (for UI display)
 */
export interface MissionWithProgress extends Mission {
    current: number;     // Current progress value
    completed: boolean;  // Whether the mission is completed
}
