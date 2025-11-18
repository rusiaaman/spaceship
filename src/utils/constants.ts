// Ship size classes with log-scale variation
// Larger ships have more mass (lower acceleration), more health, but higher top speed
export const SHIP_SIZE_CLASSES = {
  TINY: { 
    scale: 1.0, 
    maneuverability: 1.5, 
    maxSpeed: 110, 
    mass: 0.7,        // Lower mass = faster acceleration
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
    mass: 1.5,        // Higher mass = slower acceleration
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
    mass: 4.0,        // Highest mass = slowest acceleration
    maxHealth: 350,   // Highest health
    name: 'Huge' 
  },
} as const

export type ShipSizeClass = keyof typeof SHIP_SIZE_CLASSES

export const GAME_CONSTANTS = {
  ACCELERATION: 60,
  MAX_SPEED: 120,
  MIN_SPEED: -60, // Backward speed limit
  BOOST_MULTIPLIER: 1.8,
  BRAKE_FORCE: 0.9,
  ROTATION_SPEED: 0.04,
  STAR_COUNT: 1500, // Reduced for better performance
  STAR_SPEED_BASE: 0.5,
  STAR_SPREAD: 500,
  
  // Racing Constants
  RACE_DISTANCE: 5000, // Z-coordinate distance to the finish disk
  FINISH_DISK_RADIUS: 50,
  AI_SPEED_MULTIPLIER: 0.85,
  AI_COUNT: 15,

  // AI behavior tuning
  AI_SPEED_VARIANCE: 0.2,
  AI_LATERAL_SWAY_AMPLITUDE: 4,
  AI_LATERAL_SWAY_FREQUENCY: 0.5,
  AI_INITIAL_Z_MIN: -60,
  AI_INITIAL_Z_MAX: -20,
  
  // Ship size configuration
  DEFAULT_PLAYER_SIZE: 'MEDIUM' as ShipSizeClass,
  DEFAULT_AI_SIZE: 'MEDIUM' as ShipSizeClass,

  // Speed Booster Constants
  BOOSTER_COUNT: 6,
  BOOSTER_SPACING: 150, // Distance between boosters
  BOOSTER_RADIUS: 15, // Collision radius
  BOOSTER_RING_RADIUS: 20, // Visual ring size
  BOOSTER_DURATION: 3, // Boost duration in seconds
  BOOSTER_SPEED_MULTIPLIER: 2.0, // Speed multiplier when boosted

  // Combat Constants
  WEAPON_FIRE_RATE: 0.15, // seconds between shots (faster)
  PROJECTILE_SPEED: 400, // increased speed
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