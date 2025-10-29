import { create } from 'zustand'
import * as THREE from 'three'
import { GAME_CONSTANTS } from '@/utils/constants'
import { profiler } from '@/utils/profiler'

export type GameState = 'menu' | 'playing' | 'paused' | 'countdown' | 'finished'
export type CameraView = 'first-person' | 'third-person'

interface AIStanding {
  name: string
  distance: number
  position: number
}

export interface Projectile {
  id: string
  position: THREE.Vector3
  direction: THREE.Vector3
  speed: number
  isPlayerProjectile: boolean
  createdAt: number
  lifespan: number
  color: string
}

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
  isBoosting: boolean
  boostEndTime: number
  collectedBoosters: Set<number>
  
  // Combat state
  playerHealth: number
  playerMaxHealth: number
  aiHealthMap: Map<number, number>
  aiSpeedReductionMap: Map<number, number>
  activeProjectiles: Projectile[]
  lastShotTime: number
  lastAIShotTimes: Map<number, number>
  
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
  isBoosting: false,
  boostEndTime: 0,
  collectedBoosters: new Set(),
  
  // Combat state
  playerHealth: 100,
  playerMaxHealth: 100,
  aiHealthMap: new Map(),
  aiSpeedReductionMap: new Map(),
  activeProjectiles: [],
  lastShotTime: 0,
  lastAIShotTimes: new Map(),
  
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
  activateBoost: (duration) => set((state) => ({ 
    isBoosting: true, 
    boostEndTime: state.raceTime + duration 
  })),
  deactivateBoost: () => set({ isBoosting: false }),
  collectBooster: (id) => set((state) => {
    // Mutate the set in place to avoid creating new Set and triggering re-renders
    const newSet = state.collectedBoosters
    newSet.add(id)
    // Return same reference to prevent re-render
    return {}
  }),
  startRace: () => set({ gameState: 'playing', isRaceStarted: true, countdown: 0 }),
  finishRace: (finishTime) => set({ gameState: 'finished', finishTime }),
  resetGame: () => set({
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
    isBoosting: false,
    boostEndTime: 0,
    collectedBoosters: new Set(),
    playerHealth: 100,
    aiHealthMap: new Map(),
    aiSpeedReductionMap: new Map(),
    activeProjectiles: [],
    lastShotTime: 0,
    lastAIShotTimes: new Map(),
  }),
  
  // Combat actions
  fireProjectile: (origin, direction, isPlayer) => {
    profiler.start('GameStore.fireProjectile')
    const state = useGameStore.getState()
    const currentTime = state.raceTime
    
    // Check fire rate - reduced cooldown for faster shooting
    if (isPlayer) {
      if (currentTime - state.lastShotTime < 0.1) return
      set({ lastShotTime: currentTime })
    } else {
      // Check AI fire rate
      const lastAIShot = state.lastAIShotTimes.get(0) ?? 0
      if (currentTime - lastAIShot < GAME_CONSTANTS.AI_FIRE_RATE) return
      const newMap = new Map(state.lastAIShotTimes)
      newMap.set(0, currentTime)
      set({ lastAIShotTimes: newMap })
    }
    
    // Limit max projectiles to prevent memory issues
    if (state.activeProjectiles.length >= GAME_CONSTANTS.MAX_ACTIVE_PROJECTILES) {
      return
    }
    
    // Create projectile with optimized vector creation
    const projectile: Projectile = {
      id: `${currentTime}-${Math.random().toString(36).substr(2, 9)}`,
      position: new THREE.Vector3(origin.x, origin.y, origin.z),
      direction: new THREE.Vector3(direction.x, direction.y, direction.z).normalize(),
      speed: GAME_CONSTANTS.PROJECTILE_SPEED,
      isPlayerProjectile: isPlayer,
      createdAt: currentTime,
      lifespan: GAME_CONSTANTS.PROJECTILE_LIFESPAN,
      color: isPlayer ? '#ff0000' : '#ff4444'
    }
    
    // Create new array to properly trigger re-render
    set({ activeProjectiles: [...state.activeProjectiles, projectile] })
    profiler.end('GameStore.fireProjectile')
  },
  
  updateProjectiles: (delta) => {
    profiler.start('GameStore.updateProjectiles')
    const state = useGameStore.getState()
    const currentTime = state.raceTime
    let needsUpdate = false
    
    profiler.start('GameStore.updateProjectiles.loop')
    
    // Mutate positions in place for performance
    const activeProjectiles = state.activeProjectiles
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
      const p = activeProjectiles[i]
      
      // Check if expired
      if (currentTime - p.createdAt >= p.lifespan) {
        activeProjectiles.splice(i, 1)
        needsUpdate = true
        continue
      }
      
      // Update position directly (mutate for performance)
      const speedDelta = p.speed * delta
      p.position.x += p.direction.x * speedDelta
      p.position.y += p.direction.y * speedDelta
      p.position.z += p.direction.z * speedDelta
    }
    profiler.end('GameStore.updateProjectiles.loop')
    
    // Only trigger update if projectiles were removed
    if (needsUpdate) {
      profiler.start('GameStore.updateProjectiles.setState')
      set({ activeProjectiles: [...activeProjectiles] })
      profiler.end('GameStore.updateProjectiles.setState')
    }
    profiler.end('GameStore.updateProjectiles')
  },
  
  removeProjectile: (id) => {
    set((state) => ({
      activeProjectiles: state.activeProjectiles.filter(p => p.id !== id)
    }))
  },
  
  damageShip: (targetId, damage) => {
    set((state) => {
      if (targetId === 'player') {
        return {
          playerHealth: Math.max(0, state.playerHealth - damage)
        }
      } else {
        const newHealthMap = new Map(state.aiHealthMap)
        const currentHealth = newHealthMap.get(targetId) ?? 100
        newHealthMap.set(targetId, Math.max(0, currentHealth - damage))
        
        const newSpeedMap = new Map(state.aiSpeedReductionMap)
        const currentReduction = newSpeedMap.get(targetId) ?? 0
        newSpeedMap.set(targetId, Math.min(0.7, currentReduction + 0.35))
        
        return {
          aiHealthMap: newHealthMap,
          aiSpeedReductionMap: newSpeedMap
        }
      }
    })
  },
  
  getAIHealth: (id): number => {
    return useGameStore.getState().aiHealthMap.get(id) ?? 100
  },
  
  getAISpeedReduction: (id) => {
    return useGameStore.getState().aiSpeedReductionMap.get(id) ?? 0
  },
  
  updateAISpeedReduction: (delta) => {
    set((state) => {
      const newSpeedMap = new Map(state.aiSpeedReductionMap)
      for (const [id, reduction] of newSpeedMap.entries()) {
        const newReduction = Math.max(0, reduction - 0.15 * delta)
        if (newReduction > 0) {
          newSpeedMap.set(id, newReduction)
        } else {
          newSpeedMap.delete(id)
        }
      }
      return { aiSpeedReductionMap: newSpeedMap }
    })
  },
  toggleCameraView: () => set((state) => ({
    cameraView: state.cameraView === 'first-person' ? 'third-person' : 'first-person'
  })),
  setGameState: (gameState) => {
    // Reset countdown when entering countdown state
    if (gameState === 'countdown') {
      set({ gameState, countdown: 3, collectedBoosters: new Set(), isBoosting: false });
    } else {
      set({ gameState });
    }
  },
}))