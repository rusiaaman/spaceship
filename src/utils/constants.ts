// Ship size classes with log-scale variation
// Larger ships have more mass (lower acceleration), more health, but higher top speed
// Ship sizes in real-world terms (at scale multiplier 0.5 in SpaceshipModel.tsx):
// - TINY: 0.5 gu = 135m (small fighter)
// - SMALL: 0.75 gu = 203m (corvette)
// - MEDIUM: 1.125 gu = 270m (Titanic-sized, baseline)
// - LARGE: 1.7 gu = 459m (frigate)
// - HUGE: 2.5 gu = 675m (destroyer)
// Note: Ships are now tiny specks compared to planets (Earth is 495 gu = 99x larger than MEDIUM ship)
export const SHIP_SIZE_CLASSES = {
  TINY: { 
    scale: 1.0, 
    maneuverability: 1.5, 
    maxSpeed: 110, 
    mass: 0.7,        // Lower mass = higher base acceleration
    maxHealth: 75,    // Lower health
    name: 'Tiny' 
  },
  SMALL: { 
    scale: 1.5, 
    maneuverability: 1.2, 
    maxSpeed: 115, 
    mass: 1.0,        // Baseline mass
    maxHealth: 100,   // Baseline health
    name: 'Small' 
  },
  MEDIUM: { 
    scale: 2.25, 
    maneuverability: 1.0, 
    maxSpeed: 120, 
    mass: 1.5,        // Higher mass = lower base acceleration
    maxHealth: 150,   // More health
    name: 'Medium' 
  },
  LARGE: { 
    scale: 3.4, 
    maneuverability: 0.75, 
    maxSpeed: 125, 
    mass: 2.5,        // Much higher mass
    maxHealth: 225,   // Much more health
    name: 'Large' 
  },
  HUGE: { 
    scale: 5.0, 
    maneuverability: 0.5, 
    maxSpeed: 130, 
    mass: 4.0,        // Highest mass = lowest base acceleration
    maxHealth: 350,   // Highest health
    name: 'Huge' 
  },
} as const

export type ShipSizeClass = keyof typeof SHIP_SIZE_CLASSES

export const GAME_CONSTANTS = {
  // Exponential Physics
  LOG_GROWTH_RATE: 2.3, // ln(10) -> 10x growth per second
  // Base accel calculated to reach ~10 km/h (2.7e-9 gu/s) in 1st second
  // 10 km/h = 0.00277 km/s. 1 gu/s = 1,256,451 km/s.
  // So 10 km/h = 2.2e-9 gu/s.
  LOG_BASE_ACCEL: 2.0e-9,
  
  MAX_SPEED: 120, // Reset to original max speed (still FTL at scale)
  MIN_SPEED: -60, // Backward speed limit
  BOOST_MULTIPLIER: 1.8,
  BRAKE_FORCE: 2.5, // Exponential braking factor (similar to growth rate)
  ROTATION_SPEED: 0.04,
  STAR_COUNT: 2000, // More stars for vast space
  STAR_SPEED_BASE: 0.5,
  STAR_SPREAD: 9371683294, // TRUE scale - spans half the solar system!
  
  // Racing Constants - TRUE ASTRONOMICAL SCALE
  // Finish at Neptune: 1000km from surface (106,759 gu from center)
  FINISH_NEPTUNE_THRESHOLD: 106759, // Distance to Neptune center for finish detection
  RACE_DISTANCE: 18743366587, // Deprecated - use FINISH_NEPTUNE_THRESHOLD instead
  AI_SPEED_MULTIPLIER: 0.85,
  AI_COUNT: 15,

  // AI behavior tuning - TRUE scale
  // V-Formation spawning (no variance, no sway)
  AI_FORMATION_ROW_Z_OFFSET: 10, // gu forward per row
  AI_FORMATION_ROW_X_SPREAD: 6.42, // gu sideways per row (wings almost touch)
  
  // Ship size configuration
  DEFAULT_PLAYER_SIZE: 'MEDIUM' as ShipSizeClass,
  DEFAULT_AI_SIZE: 'MEDIUM' as ShipSizeClass,

  // Speed Booster Constants - TRUE scale (MASSIVE for visibility at FTL speeds)
  BOOSTER_COUNT: 10, // Boosters along the track
  BOOSTER_SPACING: 1874336659, // ~1.87 billion gu between boosters
  BOOSTER_RADIUS: 100000000, // 24 million km collision radius - matches visual ring
  BOOSTER_RING_RADIUS: 100000000, // 24 million km visual ring size (MASSIVE!)
  BOOSTER_DURATION: 3, // Boost duration in seconds
  BOOSTER_SPEED_MULTIPLIER: 2.0, // Speed multiplier when boosted

  // Combat Constants
  WEAPON_FIRE_RATE: 0.15, // seconds between shots (faster)
  PROJECTILE_SPEED: 400, // Reset projectile speed
  PROJECTILE_LIFESPAN: 1.5, // seconds (further reduced for cleanup)
  PROJECTILE_DAMAGE: 25, // health points
  PROJECTILE_RADIUS: 0.3, // visual radius
  SPEED_REDUCTION_ON_HIT: 0.35, // 35% speed reduction
  SPEED_RECOVERY_RATE: 0.15, // per second
  SHIP_COLLISION_RADIUS: 6, // units for projectile collision
  MAX_HEALTH: 100,
  
  // AI Combat
  AI_SHOOT_CHANCE: 0.75, // 75% per second - significantly more aggressive
  AI_SHOOT_RANGE: 300, // units - longer range
  AI_SHOOT_CONE: 60, // degrees - wider cone
  AI_ACCURACY: 0.95, // 95% accuracy - highly accurate aim
  AI_FIRE_RATE: 0.3, // seconds between shots - much faster firing
  
  // Player Combat & Respawn
  PLAYER_RESPAWN_INVULNERABILITY_DURATION: 3.0,
  
  // Visual
  MAX_ACTIVE_PROJECTILES: 40, // Further reduced for better performance
} as const