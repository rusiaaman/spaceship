import { Howl } from 'howler'

class SoundManager {
  private sounds: Map<string, Howl> = new Map()
  private masterVolume: number = 0.7
  private sfxVolume: number = 0.8
  private initialized: boolean = false
  private audioContext: AudioContext | null = null
  private currentEngineOscillators: OscillatorNode[] = []
  private currentEngineGain: GainNode | null = null
  
  constructor() {
    console.log('[SoundManager] Created, waiting for initialization')
  }

  private ensureInitialized() {
    if (!this.initialized) {
      console.log('[SoundManager] Initializing sounds...')
      this.initializeSounds()
      this.initialized = true
    }
  }

  private initializeSounds() {
    try {
      // Create AudioContext on first use (after user interaction)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('[SoundManager] AudioContext resumed')
        })
      }
      
      console.log('[SoundManager] AudioContext state:', this.audioContext.state)
      
      // Create simple sound effects using Howler with data URIs
      this.createSoundEffects()
      
      console.log('[SoundManager] Sounds initialized successfully')
    } catch (error) {
      console.error('[SoundManager] Failed to initialize:', error)
    }
  }

  private createSoundEffects() {
    // Create simple beep sounds using data URIs
    // These are very simple sine wave beeps
    
    // Boost collect sound - ascending tone
    const boostBeep = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
    this.sounds.set('boost-collect', new Howl({
      src: [boostBeep],
      volume: 0.5 * this.sfxVolume * this.masterVolume,
      onloaderror: (_id, error) => console.error('[SoundManager] Failed to load boost-collect:', error),
      onload: () => console.log('[SoundManager] boost-collect loaded')
    }))

    // Weapon fire sound
    this.sounds.set('weapon-fire', new Howl({
      src: [boostBeep],
      volume: 0.3 * this.sfxVolume * this.masterVolume,
      rate: 0.8,
      onloaderror: (_id, error) => console.error('[SoundManager] Failed to load weapon-fire:', error),
      onload: () => console.log('[SoundManager] weapon-fire loaded')
    }))

    // Hit sound
    this.sounds.set('hit', new Howl({
      src: [boostBeep],
      volume: 0.4 * this.sfxVolume * this.masterVolume,
      rate: 0.6,
      onloaderror: (_id, error) => console.error('[SoundManager] Failed to load hit:', error),
      onload: () => console.log('[SoundManager] hit loaded')
    }))
  }

  // Engine sound using Web Audio API oscillators
  updateEngineSound(speed: number, maxSpeed: number, isBoosting: boolean) {
    this.ensureInitialized()
    
    if (!this.audioContext) {
      console.warn('[SoundManager] AudioContext not available')
      return
    }

    const speedRatio = speed / maxSpeed
    
    // Stop current engine sound
    if (this.currentEngineOscillators.length > 0) {
      this.currentEngineOscillators.forEach(osc => {
        try {
          osc.stop()
        } catch (e) {
          // Ignore if already stopped
        }
      })
      this.currentEngineOscillators = []
    }

    // Only play engine sound if moving
    if (speedRatio < 0.01) {
      if (this.currentEngineGain) {
        this.currentEngineGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1)
      }
      return
    }

    try {
      // Create new oscillators for engine sound
      const baseFreq = isBoosting ? 200 : 80 + (speedRatio * 120)
      
      // Create gain node for volume control
      if (!this.currentEngineGain) {
        this.currentEngineGain = this.audioContext.createGain()
        this.currentEngineGain.connect(this.audioContext.destination)
      }
      
      const volume = Math.min(0.15, 0.05 + speedRatio * 0.1) * this.masterVolume
      this.currentEngineGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1)

      // Create multiple oscillators for richer sound
      const oscillator1 = this.audioContext.createOscillator()
      oscillator1.type = 'sawtooth'
      oscillator1.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime)
      oscillator1.connect(this.currentEngineGain)
      oscillator1.start()
      this.currentEngineOscillators.push(oscillator1)

      const oscillator2 = this.audioContext.createOscillator()
      oscillator2.type = 'square'
      oscillator2.frequency.setValueAtTime(baseFreq * 0.5, this.audioContext.currentTime)
      
      const gain2 = this.audioContext.createGain()
      gain2.gain.value = 0.3
      oscillator2.connect(gain2)
      gain2.connect(this.currentEngineGain)
      oscillator2.start()
      this.currentEngineOscillators.push(oscillator2)

      // Add some noise for texture
      const oscillator3 = this.audioContext.createOscillator()
      oscillator3.type = 'triangle'
      oscillator3.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime)
      
      const gain3 = this.audioContext.createGain()
      gain3.gain.value = 0.2
      oscillator3.connect(gain3)
      gain3.connect(this.currentEngineGain)
      oscillator3.start()
      this.currentEngineOscillators.push(oscillator3)

    } catch (error) {
      console.error('[SoundManager] Error creating engine sound:', error)
    }
  }

  stopEngineSound() {
    if (this.currentEngineOscillators.length > 0) {
      this.currentEngineOscillators.forEach(osc => {
        try {
          osc.stop()
        } catch (e) {
          // Ignore if already stopped
        }
      })
      this.currentEngineOscillators = []
    }
    
    if (this.currentEngineGain && this.audioContext) {
      this.currentEngineGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1)
    }
  }

  playSound(soundName: string) {
    this.ensureInitialized()
    
    if (!this.audioContext) {
      console.warn('[SoundManager] AudioContext not available')
      return
    }

    // Resume audio context if needed
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('[SoundManager] AudioContext resumed before playing sound')
        this.playSoundInternal(soundName)
      })
    } else {
      this.playSoundInternal(soundName)
    }
  }

  private playSoundInternal(soundName: string) {
    // Use Web Audio API to create simple beep sounds
    if (!this.audioContext) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      // Different sounds have different frequencies and durations
      let frequency = 440
      let duration = 0.1
      
      switch (soundName) {
        case 'boost-collect':
          frequency = 800
          duration = 0.15
          gainNode.gain.value = 0.3 * this.masterVolume
          break
        case 'weapon-fire':
          // Laser sound - high pitched with quick decay
          frequency = 1200
          duration = 0.08
          gainNode.gain.value = 0.25 * this.masterVolume
          oscillator.type = 'square' // Square wave for laser effect
          break
        case 'hit':
          frequency = 150
          duration = 0.1
          gainNode.gain.value = 0.25 * this.masterVolume
          break
        case 'explosion':
          // Explosion sound - low rumble with noise
          frequency = 80
          duration = 0.4
          gainNode.gain.value = 0.35 * this.masterVolume
          oscillator.type = 'sawtooth'
          break
        case 'ship-damage':
          // Ship damage sound - mid-range impact
          frequency = 300
          duration = 0.15
          gainNode.gain.value = 0.3 * this.masterVolume
          oscillator.type = 'triangle'
          break
        default:
          gainNode.gain.value = 0.2 * this.masterVolume
      }
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
      oscillator.type = 'sine'
      
      // Envelope for smoother sound
      gainNode.gain.setValueAtTime(gainNode.gain.value, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)
      
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
      
      console.log('[SoundManager] Playing sound:', soundName, 'at frequency:', frequency)
    } catch (error) {
      console.error('[SoundManager] Error playing sound:', soundName, error)
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    console.log('[SoundManager] Master volume set to:', this.masterVolume)
  }

  setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    console.log('[SoundManager] SFX volume set to:', this.sfxVolume)
  }

  setMusicVolume(volume: number) {
    // Music volume setter for future use
    const musicVolume = Math.max(0, Math.min(1, volume))
    console.log('Music volume set to:', musicVolume)
  }

  cleanup() {
    this.stopEngineSound()
    this.sounds.forEach(sound => {
      sound.unload()
    })
    this.sounds.clear()
    
    if (this.audioContext) {
      this.audioContext.close()
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager()