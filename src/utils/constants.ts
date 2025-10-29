export const GAME_CONSTANTS = {
  ACCELERATION: 60,
  MAX_SPEED: 120,
  BOOST_MULTIPLIER: 1.8,
  BRAKE_FORCE: 0.9,
  ROTATION_SPEED: 0.04,
  STAR_COUNT: 2000,
  STAR_SPEED_BASE: 0.5,
  STAR_SPREAD: 500,
  
  // Racing Constants
  RACE_DISTANCE: 2000, // Z-coordinate distance to the finish disk
  FINISH_DISK_RADIUS: 50,
  AI_SPEED_MULTIPLIER: 0.85,
  AI_COUNT: 5,

  // AI behavior tuning
  AI_SPEED_VARIANCE: 0.2,
  AI_LATERAL_SWAY_AMPLITUDE: 4,
  AI_LATERAL_SWAY_FREQUENCY: 0.5,
  AI_INITIAL_Z_MIN: -60,
  AI_INITIAL_Z_MAX: -20,

  // Speed Booster Constants
  BOOSTER_COUNT: 12,
  BOOSTER_SPACING: 150, // Distance between boosters
  BOOSTER_RADIUS: 15, // Collision radius
  BOOSTER_RING_RADIUS: 20, // Visual ring size
  BOOSTER_DURATION: 3, // Boost duration in seconds
  BOOSTER_SPEED_MULTIPLIER: 2.0, // Speed multiplier when boosted

  // Combat Constants
  WEAPON_FIRE_RATE: 0.15, // seconds between shots (faster)
  PROJECTILE_SPEED: 400, // increased speed
  PROJECTILE_LIFESPAN: 2.0, // seconds (reduced for cleanup)
  PROJECTILE_DAMAGE: 25, // health points
  PROJECTILE_RADIUS: 0.3, // visual radius
  SPEED_REDUCTION_ON_HIT: 0.35, // 35% speed reduction
  SPEED_RECOVERY_RATE: 0.15, // per second
  SHIP_COLLISION_RADIUS: 6, // units for projectile collision
  MAX_HEALTH: 100,
  
  // AI Combat
  AI_SHOOT_CHANCE: 0.25, // 25% per second
  AI_SHOOT_RANGE: 250, // units
  AI_SHOOT_CONE: 45, // degrees
  AI_ACCURACY: 0.75, // 75% accuracy
  AI_FIRE_RATE: 0.8, // seconds between shots
  
  // Visual
  MAX_ACTIVE_PROJECTILES: 50, // Reduced for better performance
} as const