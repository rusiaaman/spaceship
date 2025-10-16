import { create } from 'zustand'

export type GameState = 'menu' | 'playing' | 'paused' | 'countdown' | 'finished'

interface AIStanding {
  name: string
  distance: number
  position: number
}

interface GameStore {
  gameState: GameState
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
  
  setGameState: (state: GameState) => void
  setSpeed: (speed: number | ((prev: number) => number)) => void
  incrementScore: (points: number) => void
  setRaceTime: (time: number | ((prev: number) => number)) => void
  setCountdown: (count: number) => void
  setDistanceToFinish: (distance: number) => void
  setAIStandings: (standings: AIStanding[]) => void
  setPlayerPosition: (position: number) => void
  startRace: () => void
  finishRace: (time: number) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'menu',
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
  
  setSpeed: (speed) => set((state) => ({ 
    speed: typeof speed === 'function' ? speed(state.speed) : speed 
  })),
  incrementScore: (points) => set((state) => ({ score: state.score + points })),
  setRaceTime: (raceTime) => set((state) => ({ 
    raceTime: typeof raceTime === 'function' ? raceTime(state.raceTime) : raceTime 
  })),
  setCountdown: (countdown) => set({ countdown }),
  setDistanceToFinish: (distanceToFinish) => set({ distanceToFinish }),
  setAIStandings: (aiStandings) => set({ aiStandings }),
  setPlayerPosition: (playerPosition) => set({ playerPosition }),
  startRace: () => set({ gameState: 'playing', isRaceStarted: true, countdown: 0 }),
  finishRace: (finishTime) => set({ gameState: 'finished', finishTime }),
  resetGame: () => set({
    gameState: 'menu',
    speed: 0,
    score: 0,
    raceTime: 0,
    countdown: 3,
    isRaceStarted: false,
    finishTime: null,
    distanceToFinish: 1000,
    aiStandings: [],
    playerPosition: 1,
  }),
  setGameState: (gameState) => {
    // Reset countdown when entering countdown state
    if (gameState === 'countdown') {
      set({ gameState, countdown: 3 });
    } else {
      set({ gameState });
    }
  },
}))