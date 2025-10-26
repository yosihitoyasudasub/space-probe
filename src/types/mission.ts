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
    distance: number;    // Distance traveled in AU
    velocity: number;    // Current velocity in km/s
    slingshots: number;  // Number of slingshot maneuvers performed
    fuel: number;        // Remaining fuel percentage (0-100)
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
    checkCompleted: (stats: GameStats) => boolean;   // Function to check if mission is completed
}

/**
 * Mission with current progress (for UI display)
 */
export interface MissionWithProgress extends Mission {
    current: number;     // Current progress value
    completed: boolean;  // Whether the mission is completed
}
