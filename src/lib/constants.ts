// ====================================================================
// Physics Scale Factors and Units
// ====================================================================
// This simulation uses a scaled unit system for game playability:
// - Mass: Earth mass = 1.0, Sun mass = 333,000 (realistic ratio)
// - Distance: 1 AU = 100 scene units
// - Time: Accelerated by factor of ~1,000,000 (1 real second ≈ 11.6 simulation days)
// - This gives Earth orbital period of ~30 seconds (vs 365 days in reality)
// ====================================================================

export const PHYSICS_SCALE = {
    // Mass scale: Earth mass = 1.0
    EARTH_MASS: 1.0,
    SUN_MASS: 333000,  // Realistic Sun/Earth mass ratio

    // Distance scale: 1 AU = 100 scene units
    AU: 100,

    // Time scale: ~1 million times faster than reality
    // (Earth completes orbit in ~30 seconds instead of 365 days)
    TIME_SCALE: 1e6,

    // Gravity constant adjusted for our unit system
    // This value gives realistic orbital mechanics with scaled time
    G: 0.133,

    // Velocity conversion: scene units/sec to km/s
    // Based on Earth orbital velocity: ~21 scene units/sec = 30 km/s (real)
    VELOCITY_TO_KM_PER_SEC: 1.43,  // multiply scene velocity by this to get km/s

    // Fuel consumption rate: % consumed per unit delta-v
    // With dvScale = 0.02, single direction thrust consumes 0.02% per frame
    // Total fuel = 100%, allows ~5000 frames (~83 seconds at 60fps) of continuous thrust
    FUEL_CONSUMPTION_RATE: 1.0,
};

// Legacy constant for backward compatibility
export const DEFAULT_G = PHYSICS_SCALE.G;

// swing-by tuning options (tweak these values)
// With realistic Sun/planet mass ratios, swing-by effects are smaller for inner planets
// but significant for gas giants (Jupiter, Saturn). Threshold adjusted accordingly.
export const SWING_BY_OPTIONS = {
    encounterMultiplier: 2.5,   // Slightly wider detection radius
    deltaVThreshold: 0.01,      // Lower threshold to catch smaller effects (was 0.03)
    minGap: 0.4                 // Shorter cooldown between detections
};

// Reference grids span the whole solar system (large enough to show outer planets)
export const GRID_SIZE = 7000;
export const FLAT_GRID_DIVISIONS = 1000;
