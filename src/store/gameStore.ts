import { create } from 'zustand'
import * as THREE from 'three'
import { GAME_CONSTANTS } from '@/utils/constants'
import { profiler } from '@/utils/profiler'
import { ObjectPool } from '@/utils/ObjectPool'
import { EventScheduler, GameEventType } from '@/utils/PriorityQueue'
import { GameSpatialIndices } from '@/utils/SpatialIndex'
import { ShipState, ProjectileState, BitFlagUtils } from '@/utils/BitFlags'

export type GameState = 'menu' | 'playing' | 'paused' | 'countdown' | 'finished'
export type CameraView = 'first-person' | 'third-person'

interface AIStanding {
  name: string
  distance: number
  position: number
}

export interface CombatStats {
  kills: number
  shotsFired: number
  hitsLanded: number
  damageDealt: number
  damageTaken: number
  currentKillStreak: number
  bestKillStreak: number
}

export interface Projectile {
  id: string
  position: THREE.Vector3
  direction: THREE.Vector3
  speed: number
  state: number // Bit flags: ProjectileState
  createdAt: number
  lifespan: number
  color: string
}

// Projectile pool for reuse
const projectilePool = new ObjectPool<Projectile>(
  () => ({
    id: '',
    position: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    speed: GAME_CONSTANTS.PROJECTILE_SPEED,
    state: ProjectileState.NONE,
    createdAt: 0,
    lifespan: GAME_CONSTANTS.PROJECTILE_LIFESPAN,
    color: '#ff0000'
  }),
  (p) => {
    p.id = ''
    p.position.set(0, 0, 0)
    p.direction.set(0, 0, 0)
    p.state = ProjectileState.NONE
    p.createdAt = 0
  },
  50,
  200
)

interface GameStore {
  gameState: GameState
  cameraView: CameraView
  speed: number
  maxSpeed: number
  score: number
  raceTime: number
  countdown: number
  isRaceStarted: boolean
  finishTime: number | null
  distanceToFinish: number
  aiStandings: AIStanding[]
  playerPosition: number
  playerState: number // Bit flags: ShipState
  boostEndTime: number
  collectedBoosters: Set<number>
  
  // Combat state - optimized with typed arrays
  playerHealth: number
  playerMaxHealth: number
  aiHealthArray: Float32Array // Indexed by AI id
  aiSpeedReductionArray: Float32Array // Indexed by AI id
  aiStateArray: Uint16Array // Bit flags for each AI
  activeProjectiles: Projectile[]
  lastShotTime: number
  lastAIShotTimes: Float32Array // Indexed by AI id
  
  // Combat statistics
  combatStats: CombatStats
  
  // Spatial indexing
  spatialIndices: GameSpatialIndices
  
  // Event scheduling
  eventScheduler: EventScheduler
  
  setGameState: (state: GameState) => void
  toggleCameraView: () => void
  setSpeed: (speed: number | ((prev: number) => number)) => void
  incrementScore: (points: number) => void
  setRaceTime: (time: number | ((prev: number) => number)) => void
  setCountdown: (count: number) => void
  setDistanceToFinish: (distance: number) => void
  setAIStandings: (standings: AIStanding[]) => void
  setPlayerPosition: (position: number) => void
  activateBoost: (duration: number) => void
  deactivateBoost: () => void
  collectBooster: (id: number) => void
  startRace: () => void
  finishRace: (time: number) => void
  resetGame: () => void
  
  // Combat actions
  fireProjectile: (origin: THREE.Vector3, direction: THREE.Vector3, isPlayer: boolean) => void
  updateProjectiles: (delta: number) => void
  removeProjectile: (id: string) => void
  damageShip: (targetId: number | 'player', damage: number) => void
  getAIHealth: (id: number) => number
  getAISpeedReduction: (id: number) => number
  updateAISpeedReduction: (delta: number) => void
  
  // Combat stats actions
  incrementKills: () => void
  incrementShotsFired: () => void
  incrementHitsLanded: () => void
  addDamageDealt: (damage: number) => void
  addDamageTaken: (damage: number) => void
  updateKillStreak: (killed: boolean) => void
  resetCombatStats: () => void
  getCombatStats: () => CombatStats
}

export const useGameStore = create<GameStore>((set): GameStore => ({
  gameState: 'menu',
  cameraView: 'third-person',
  speed: 0,
  maxSpeed: 120,
  score: 0,
  raceTime: 0,
  countdown: 3,
  isRaceStarted: false,
  finishTime: null,
  distanceToFinish: 1000,
  aiStandings: [],
  playerPosition: 1,
  playerState: ShipState.ACTIVE,
  boostEndTime: 0,
  collectedBoosters: new Set(),
  
  // Combat state - optimized with typed arrays
  playerHealth: 100,
  playerMaxHealth: 100,
  aiHealthArray: new Float32Array(GAME_CONSTANTS.AI_COUNT).fill(100),
  aiSpeedReductionArray: new Float32Array(GAME_CONSTANTS.AI_COUNT).fill(0),
  aiStateArray: new Uint16Array(GAME_CONSTANTS.AI_COUNT).fill(ShipState.ACTIVE),
  activeProjectiles: [],
  lastShotTime: 0,
  lastAIShotTimes: new Float32Array(GAME_CONSTANTS.AI_COUNT).fill(0),
  
  // Combat statistics
  combatStats: {
    kills: 0,
    shotsFired: 0,
    hitsLanded: 0,
    damageDealt: 0,
    damageTaken: 0,
    currentKillStreak: 0,
    bestKillStreak: 0,
  },
  
  // Spatial indexing
  spatialIndices: new GameSpatialIndices(),
  
  // Event scheduling
  eventScheduler: new EventScheduler(),
  
  setSpeed: (speed) => {
    const newSpeed = typeof speed === 'function' ? speed(useGameStore.getState().speed) : speed
    // Only update if changed significantly (reduce unnecessary renders)
    if (Math.abs(newSpeed - useGameStore.getState().speed) > 0.1) {
      set({ speed: newSpeed })
    }
  },
  incrementScore: (points) => set((state) => ({ score: state.score + points })),
  setRaceTime: (raceTime) => set((state) => ({ 
    raceTime: typeof raceTime === 'function' ? raceTime(state.raceTime) : raceTime 
  })),
  setCountdown: (countdown) => set({ countdown }),
  setDistanceToFinish: (distanceToFinish) => {
    // Only update if changed significantly
    const current = useGameStore.getState().distanceToFinish
    if (Math.abs(distanceToFinish - current) > 1) {
      set({ distanceToFinish })
    }
  },
  setAIStandings: (aiStandings) => set({ aiStandings }),
  setPlayerPosition: (playerPosition) => {
    // Only update if position actually changed
    if (playerPosition !== useGameStore.getState().playerPosition) {
      set({ playerPosition })
    }
  },
  activateBoost: (duration) => set((state) => {
    const newState = BitFlagUtils.set(state.playerState, ShipState.BOOSTING)
    
    // Schedule boost end event
    state.eventScheduler.scheduleDelayed(duration, {
      type: GameEventType.BOOST_END,
      data: null,
      callback: () => useGameStore.getState().deactivateBoost()
    })
    
    return { 
      playerState: newState,
      boostEndTime: state.raceTime + duration 
    }
  }),
  deactivateBoost: () => set((state) => ({
    playerState: BitFlagUtils.clear(state.playerState, ShipState.BOOSTING)
  })),
  collectBooster: (id) => set((state) => {
    // Mutate the set in place to avoid creating new Set and triggering re-renders
    const newSet = state.collectedBoosters
    newSet.add(id)
    // Return same reference to prevent re-render
    return {}
  }),
  startRace: () => set({ gameState: 'playing', isRaceStarted: true, countdown: 0 }),
  finishRace: (finishTime) => set({ gameState: 'finished', finishTime }),
  resetGame: () => {
    const state = useGameStore.getState()
    
    // Clear all pools and indices
    state.spatialIndices.clearAll()
    state.eventScheduler.clear()
    
    // Release all projectiles back to pool
    state.activeProjectiles.forEach(p => projectilePool.release(p))
    
    set({
      gameState: 'menu',
      cameraView: 'third-person',
      speed: 0,
      score: 0,
      raceTime: 0,
      countdown: 3,
      isRaceStarted: false,
      finishTime: null,
      distanceToFinish: 1000,
      aiStandings: [],
      playerPosition: 1,
      playerState: ShipState.ACTIVE,
      boostEndTime: 0,
      collectedBoosters: new Set(),
      playerHealth: 100,
      aiHealthArray: new Float32Array(GAME_CONSTANTS.AI_COUNT).fill(100),
      aiSpeedReductionArray: new Float32Array(GAME_CONSTANTS.AI_COUNT).fill(0),
      aiStateArray: new Uint16Array(GAME_CONSTANTS.AI_COUNT).fill(ShipState.ACTIVE),
      activeProjectiles: [],
      lastShotTime: 0,
      lastAIShotTimes: new Float32Array(GAME_CONSTANTS.AI_COUNT).fill(0),
      combatStats: {
        kills: 0,
        shotsFired: 0,
        hitsLanded: 0,
        damageDealt: 0,
        damageTaken: 0,
        currentKillStreak: 0,
        bestKillStreak: 0,
      },
    })
  },
  
  // Combat actions - optimized with object pooling
  fireProjectile: (origin, direction, isPlayer) => {
    profiler.start('GameStore.fireProjectile')
    const state = useGameStore.getState()
    const currentTime = state.raceTime
    
    // Check fire rate
    if (isPlayer) {
      if (currentTime - state.lastShotTime < 0.1) {
        profiler.end('GameStore.fireProjectile')
        return
      }
      set({ lastShotTime: currentTime })
      // Track player shots
      state.incrementShotsFired()
    }
    
    // Limit max projectiles
    if (state.activeProjectiles.length >= GAME_CONSTANTS.MAX_ACTIVE_PROJECTILES) {
      profiler.end('GameStore.fireProjectile')
      return
    }
    
    // Acquire projectile from pool
    const projectile = projectilePool.acquire()
    projectile.id = `${currentTime}-${Math.random().toString(36).substr(2, 9)}`
    projectile.position.copy(origin)
    projectile.direction.copy(direction).normalize()
    projectile.speed = GAME_CONSTANTS.PROJECTILE_SPEED
    projectile.state = ProjectileState.ACTIVE | (isPlayer ? ProjectileState.PLAYER_OWNED : 0)
    projectile.createdAt = currentTime
    projectile.lifespan = GAME_CONSTANTS.PROJECTILE_LIFESPAN
    projectile.color = isPlayer ? '#ff0000' : '#ff4444'
    
    // Add to spatial index
    state.spatialIndices.projectiles.addOrUpdate({
      id: projectile.id,
      position: projectile.position,
      radius: GAME_CONSTANTS.PROJECTILE_RADIUS
    })
    
    // Schedule expiration event
    state.eventScheduler.scheduleDelayed(projectile.lifespan, {
      type: GameEventType.PROJECTILE_EXPIRE,
      data: { id: projectile.id },
      callback: () => useGameStore.getState().removeProjectile(projectile.id)
    })
    
    set({ activeProjectiles: [...state.activeProjectiles, projectile] })
    profiler.end('GameStore.fireProjectile')
  },
  
  updateProjectiles: (delta) => {
    profiler.start('GameStore.updateProjectiles')
    const state = useGameStore.getState()
    const currentTime = state.raceTime
    
    // Process scheduled events (including expiration)
    state.eventScheduler.update(currentTime)
    
    profiler.start('GameStore.updateProjectiles.loop')
    
    // Update positions in place
    const activeProjectiles = state.activeProjectiles
    for (let i = 0; i < activeProjectiles.length; i++) {
      const p = activeProjectiles[i]
      
      // Update position
      const speedDelta = p.speed * delta
      p.position.x += p.direction.x * speedDelta
      p.position.y += p.direction.y * speedDelta
      p.position.z += p.direction.z * speedDelta
      
      // Update spatial index
      state.spatialIndices.projectiles.addOrUpdate({
        id: p.id,
        position: p.position,
        radius: GAME_CONSTANTS.PROJECTILE_RADIUS
      })
    }
    profiler.end('GameStore.updateProjectiles.loop')
    
    profiler.end('GameStore.updateProjectiles')
  },
  
  removeProjectile: (id) => {
    set((state) => {
      const projectile = state.activeProjectiles.find(p => p.id === id)
      if (projectile) {
        // Return to pool
        projectilePool.release(projectile)
        
        // Remove from spatial index
        state.spatialIndices.projectiles.remove(id)
      }
      
      return {
        activeProjectiles: state.activeProjectiles.filter(p => p.id !== id)
      }
    })
  },
  
  damageShip: (targetId, damage) => {
    set((state) => {
      if (targetId === 'player') {
        const newHealth = Math.max(0, state.playerHealth - damage)
        let newPlayerState = state.playerState
        
        if (newHealth <= 0) {
          newPlayerState = BitFlagUtils.set(newPlayerState, ShipState.DESTROYED)
        } else {
          newPlayerState = BitFlagUtils.set(newPlayerState, ShipState.DAMAGED)
        }
        
        // Track damage taken
        state.addDamageTaken(damage)
        // Reset kill streak when taking damage
        state.updateKillStreak(false)
        
        return {
          playerHealth: newHealth,
          playerState: newPlayerState
        }
      } else {
        // Use typed arrays for AI
        const newHealthArray = state.aiHealthArray.slice()
        const newSpeedArray = state.aiSpeedReductionArray.slice()
        const newStateArray = state.aiStateArray.slice()
        
        const currentHealth = newHealthArray[targetId]
        const wasAlive = currentHealth > 0
        newHealthArray[targetId] = Math.max(0, currentHealth - damage)
        const isNowDead = newHealthArray[targetId] <= 0
        
        if (isNowDead) {
          newStateArray[targetId] = BitFlagUtils.set(newStateArray[targetId], ShipState.DESTROYED)
          // Track kill if this was the killing blow
          if (wasAlive) {
            state.incrementKills()
            state.updateKillStreak(true)
          }
        } else {
          const currentReduction = newSpeedArray[targetId]
          newSpeedArray[targetId] = Math.min(0.7, currentReduction + 0.35)
          newStateArray[targetId] = BitFlagUtils.set(newStateArray[targetId], ShipState.DAMAGED)
        }
        
        // Track damage dealt
        state.addDamageDealt(damage)
        
        return {
          aiHealthArray: newHealthArray,
          aiSpeedReductionArray: newSpeedArray,
          aiStateArray: newStateArray
        }
      }
    })
  },
  
  getAIHealth: (id): number => {
    return useGameStore.getState().aiHealthArray[id] ?? 100
  },
  
  getAISpeedReduction: (id) => {
    return useGameStore.getState().aiSpeedReductionArray[id] ?? 0
  },
  
  updateAISpeedReduction: (delta) => {
    set((state) => {
      const newSpeedArray = state.aiSpeedReductionArray.slice()
      
      for (let i = 0; i < newSpeedArray.length; i++) {
        const reduction = newSpeedArray[i]
        if (reduction > 0) {
          newSpeedArray[i] = Math.max(0, reduction - 0.15 * delta)
        }
      }
      
      return { aiSpeedReductionArray: newSpeedArray }
    })
  },
  // Combat stats actions
  incrementKills: () => set((state) => ({
    combatStats: {
      ...state.combatStats,
      kills: state.combatStats.kills + 1
    }
  })),
  
  incrementShotsFired: () => set((state) => ({
    combatStats: {
      ...state.combatStats,
      shotsFired: state.combatStats.shotsFired + 1
    }
  })),
  
  incrementHitsLanded: () => set((state) => ({
    combatStats: {
      ...state.combatStats,
      hitsLanded: state.combatStats.hitsLanded + 1
    }
  })),
  
  addDamageDealt: (damage) => set((state) => ({
    combatStats: {
      ...state.combatStats,
      damageDealt: state.combatStats.damageDealt + damage
    }
  })),
  
  addDamageTaken: (damage) => set((state) => ({
    combatStats: {
      ...state.combatStats,
      damageTaken: state.combatStats.damageTaken + damage
    }
  })),
  
  updateKillStreak: (killed) => set((state) => {
    if (killed) {
      const newStreak = state.combatStats.currentKillStreak + 1
      return {
        combatStats: {
          ...state.combatStats,
          currentKillStreak: newStreak,
          bestKillStreak: Math.max(newStreak, state.combatStats.bestKillStreak)
        }
      }
    } else {
      // Reset streak on taking damage
      return {
        combatStats: {
          ...state.combatStats,
          currentKillStreak: 0
        }
      }
    }
  }),
  
  resetCombatStats: () => set({
    combatStats: {
      kills: 0,
      shotsFired: 0,
      hitsLanded: 0,
      damageDealt: 0,
      damageTaken: 0,
      currentKillStreak: 0,
      bestKillStreak: 0,
    }
  }),
  
  getCombatStats: () => useGameStore.getState().combatStats,
  
  toggleCameraView: () => set((state) => ({
    cameraView: state.cameraView === 'first-person' ? 'third-person' : 'first-person'
  })),
  setGameState: (gameState) => {
    // Reset countdown when entering countdown state
    if (gameState === 'countdown') {
      set({ gameState, countdown: 3, collectedBoosters: new Set() });
    } else {
      set({ gameState });
    }
  },
}))