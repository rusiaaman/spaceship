// Solar System astronomical data and configurations
// TRUE ASTRONOMICAL SCALE - No compression!
// All sizes and distances use the same scale: 1 game unit = 240 meters = 0.24 km

export interface PlanetData {
  name: string
  radiusKm: number // Real radius in kilometers
  radiusGameUnits: number // TRUE radius in game units (no scaling!)
  orbitalRadiusAU: number // Distance from Sun in AU
  orbitalRadiusGameUnits: number // TRUE distance from Sun in game units
  color: string // Fallback color
  textureUrl: string // Path to texture
  hasRings?: boolean
  ringTextureUrl?: string
  emissive?: string
  emissiveIntensity?: number
}

// Conversion constants - TRUE ASTRONOMICAL SCALE
export const SOLAR_CONSTANTS = {
  METERS_PER_GAME_UNIT: 240, // 1 game unit = 240 meters (ship scale)
  KM_PER_GAME_UNIT: 0.24, // 1 game unit = 0.24 km
  AU_IN_KM: 149597871, // 1 AU in kilometers
  EARTH_MOON_DISTANCE_KM: 384400, // Earth-Moon distance
  
  // Speed conversions - TRUE scale with FTL multiplier
  // Base true speed: 31,162 gu/s (for 7,479 km/s)
  // Multiplier: 16800x (7 × 24 × 10 × 10) to make race faster
  SPEED_100_IN_KM_PER_SEC: 125645184, // Speed 100 = 125.6 million km/s = 419c
  SPEED_100_IN_GAME_UNITS_PER_SEC: 523521600, // Speed 100 = 523.5 million gu/s
  
  // Calculate game units per AU (TRUE scale)
  get GAME_UNITS_PER_AU() {
    return this.AU_IN_KM / this.KM_PER_GAME_UNIT // = 623,324,462 gu
  },
  
  // Convert game speed (0-150) to game units per second
  gameSpeedToUnitsPerSec(gameSpeed: number): number {
    return (gameSpeed / 100) * this.SPEED_100_IN_GAME_UNITS_PER_SEC
  },
  
  // Convert game speed to km/s for display
  gameSpeedToKmPerSec(gameSpeed: number): number {
    return (gameSpeed / 100) * this.SPEED_100_IN_KM_PER_SEC
  },
  
  // Convert km/s to game speed
  kmPerSecToGameSpeed(kmPerSec: number): number {
    return (kmPerSec / this.SPEED_100_IN_KM_PER_SEC) * 100
  }
}

// Planet configurations with TRUE ASTRONOMICAL SIZES
// Formula: radiusGameUnits = radiusKm / 0.24
export const PLANETS: Record<string, PlanetData> = {
  sun: {
    name: 'Sun',
    radiusKm: 696000,
    radiusGameUnits: 2900000, // GIGANTIC! 2.9 million gu
    orbitalRadiusAU: 0,
    orbitalRadiusGameUnits: 0,
    color: '#FDB813',
    textureUrl: '',
    emissive: '#FDB813',
    emissiveIntensity: 2.0
  },
  mercury: {
    name: 'Mercury',
    radiusKm: 2440,
    radiusGameUnits: 10167, // TRUE scale
    orbitalRadiusAU: 0.39,
    orbitalRadiusGameUnits: 0.39 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#8C7853',
    textureUrl: '',
    emissive: '#8C7853',
    emissiveIntensity: 0.4
  },
  venus: {
    name: 'Venus',
    radiusKm: 6052,
    radiusGameUnits: 25217, // TRUE scale
    orbitalRadiusAU: 0.72,
    orbitalRadiusGameUnits: 0.72 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#FFC649',
    textureUrl: '',
    emissive: '#FFC649',
    emissiveIntensity: 0.5
  },
  earth: {
    name: 'Earth',
    radiusKm: 6371,
    radiusGameUnits: 26546, // MASSIVE! 23,596x larger than MEDIUM ship
    orbitalRadiusAU: 1.0,
    orbitalRadiusGameUnits: 1.0 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#4A90E2',
    textureUrl: '',
    emissive: '#4A90E2',
    emissiveIntensity: 0.5
  },
  moon: {
    name: 'Moon',
    radiusKm: 1737,
    radiusGameUnits: 7238, // TRUE scale
    orbitalRadiusAU: 1.0,
    orbitalRadiusGameUnits: 1.0 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU + (SOLAR_CONSTANTS.EARTH_MOON_DISTANCE_KM / SOLAR_CONSTANTS.KM_PER_GAME_UNIT),
    color: '#CCCCCC',
    textureUrl: '',
    emissive: '#888888',
    emissiveIntensity: 0.3
  },
  mars: {
    name: 'Mars',
    radiusKm: 3390,
    radiusGameUnits: 14125, // TRUE scale
    orbitalRadiusAU: 1.52,
    orbitalRadiusGameUnits: 1.52 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#E27B58',
    textureUrl: '',
    emissive: '#E27B58',
    emissiveIntensity: 0.4
  },
  jupiter: {
    name: 'Jupiter',
    radiusKm: 69911,
    radiusGameUnits: 291296, // Largest planet - HUGE!
    orbitalRadiusAU: 5.2,
    orbitalRadiusGameUnits: 5.2 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#C88B3A',
    textureUrl: '',
    emissive: '#C88B3A',
    emissiveIntensity: 0.5
  },
  saturn: {
    name: 'Saturn',
    radiusKm: 58232,
    radiusGameUnits: 242633, // Gas giant with rings
    orbitalRadiusAU: 9.54,
    orbitalRadiusGameUnits: 9.54 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#FAD5A5',
    textureUrl: '',
    hasRings: true,
    ringTextureUrl: '',
    emissive: '#FAD5A5',
    emissiveIntensity: 0.4
  },
  uranus: {
    name: 'Uranus',
    radiusKm: 25362,
    radiusGameUnits: 105675, // Ice giant
    orbitalRadiusAU: 19.19,
    orbitalRadiusGameUnits: 19.19 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#4FD0E7',
    textureUrl: '',
    emissive: '#4FD0E7',
    emissiveIntensity: 0.5
  },
  neptune: {
    name: 'Neptune',
    radiusKm: 24622,
    radiusGameUnits: 102592, // Ice giant - finish line!
    orbitalRadiusAU: 30.07,
    orbitalRadiusGameUnits: 30.07 * SOLAR_CONSTANTS.GAME_UNITS_PER_AU,
    color: '#4166F5',
    textureUrl: '',
    emissive: '#4166F5',
    emissiveIntensity: 0.5
  }
}

// Starting position configuration
export const START_POSITION = {
  // Start near Moon's orbit
  x: 0,
  y: 0,
  z: 0, // Start at origin
  
  // Earth should be visible on the left
  earthOffsetX: -100000, // Much further for TRUE scale
  earthOffsetZ: 0,
  
  // Sun is behind (positive Z direction from start)
  sunDirection: 'behind' as const
}

// Checkpoint positions (scattered along the track at TRUE distances)
export const CHECKPOINTS = [
  {
    name: 'Mars Waypoint',
    position: { x: 15000, y: 0, z: -PLANETS.mars.orbitalRadiusGameUnits * 0.8 },
    radius: 50000
  },
  {
    name: 'Asteroid Belt',
    position: { x: -20000, y: 5000, z: -PLANETS.mars.orbitalRadiusGameUnits * 1.5 },
    radius: 60000
  },
  {
    name: 'Jupiter Flyby',
    position: { x: 25000, y: -10000, z: -PLANETS.jupiter.orbitalRadiusGameUnits * 0.9 },
    radius: 100000
  },
  {
    name: 'Saturn Vista',
    position: { x: -30000, y: 8000, z: -PLANETS.saturn.orbitalRadiusGameUnits * 1.1 },
    radius: 100000
  },
  {
    name: 'Uranus Passage',
    position: { x: 20000, y: -5000, z: -PLANETS.uranus.orbitalRadiusGameUnits * 0.95 },
    radius: 80000
  }
]

// Finish line at Neptune (TRUE distance)
export const FINISH_POSITION = {
  z: -PLANETS.neptune.orbitalRadiusGameUnits, // 18.7 BILLION game units!
  radius: 150000
}

// Planetary positions (scattered in their orbits at TRUE distances)
export const PLANETARY_POSITIONS = {
  sun: { x: 0, y: 0, z: SOLAR_CONSTANTS.GAME_UNITS_PER_AU }, // 1 AU behind player
  mercury: { 
    angle: Math.PI * 0.3, // 54 degrees
    radius: PLANETS.mercury.orbitalRadiusGameUnits 
  },
  venus: { 
    angle: Math.PI * 0.7, // 126 degrees
    radius: PLANETS.venus.orbitalRadiusGameUnits 
  },
  earth: { 
    x: -100000, // Left side, visible at start
    y: 0, 
    z: 50000 // Slightly ahead
  },
  moon: { 
    x: -100000 + (SOLAR_CONSTANTS.EARTH_MOON_DISTANCE_KM / SOLAR_CONSTANTS.KM_PER_GAME_UNIT), // True distance (approx 1.6m units)
    y: 0, 
    z: 50000 
  },
  mars: { 
    angle: Math.PI * 1.2, // 216 degrees
    radius: PLANETS.mars.orbitalRadiusGameUnits 
  },
  jupiter: { 
    angle: Math.PI * 0.5, // 90 degrees
    radius: PLANETS.jupiter.orbitalRadiusGameUnits 
  },
  saturn: { 
    angle: Math.PI * 1.8, // 324 degrees
    radius: PLANETS.saturn.orbitalRadiusGameUnits 
  },
  uranus: { 
    angle: Math.PI * 0.9, // 162 degrees
    radius: PLANETS.uranus.orbitalRadiusGameUnits 
  },
  neptune: { 
    x: 0, 
    y: 0, 
    z: -PLANETS.neptune.orbitalRadiusGameUnits 
  }
}

// Helper to convert angle/radius to x,z coordinates
export function polarToCartesian(angle: number, radius: number): { x: number; z: number } {
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius
  }
}