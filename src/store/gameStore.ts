import { create } from 'zustand'

export type GameState = 'menu' | 'playing' | 'paused' | 'countdown' | 'finished'

interface GameStore {
  gameState: GameState
  speed: number
  maxSpeed: number
  score: number
  raceTime: number
  countdown: number
  isRaceStarted: boolean
  finishTime: number | null
  
  setGameState: (state: GameState) => void
  setSpeed: (speed: number | ((prev: number) => number)) => void
  incrementScore: (points: number) => void
  setRaceTime: (time: number | ((prev: number) => number)) => void
  setCountdown: (count: number) => void
  startRace: () => void
  finishRace: (time: number) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'menu',
  speed: 0,
  maxSpeed: 100,
  score: 0,
  raceTime: 0,
  countdown: 3,
  isRaceStarted: false,
  finishTime: null,
  
  setGameState: (gameState) => set({ gameState }),
  setSpeed: (speed) => set((state) => ({ 
    speed: typeof speed === 'function' ? speed(state.speed) : speed 
  })),
  incrementScore: (points) => set((state) => ({ score: state.score + points })),
  setRaceTime: (raceTime) => set((state) => ({ 
    raceTime: typeof raceTime === 'function' ? raceTime(state.raceTime) : raceTime 
  })),
  setCountdown: (countdown) => set({ countdown }),
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
  }),
}))