class SoundManager {
  private masterVolume: number = 0.7
  private sfxVolume: number = 0.8
  private initialized: boolean = false
  private audioContext: AudioContext | null = null
  private currentEngineOscillators: OscillatorNode[] = []
  private currentEngineGain: GainNode | null = null
  private musicVolume: number = 0.4
  private backgroundMusicOscillators: OscillatorNode[] = []
  private backgroundMusicGain: GainNode | null = null
  private isMusicPlaying: boolean = false
  private isMusicPaused: boolean = false
  
  constructor() {
    console.log('[SoundManager] Created, waiting for initialization')
  }

  private ensureInitialized() {
    // Check if we need to reinitialize (context was closed)
    if (!this.initialized || !this.audioContext || this.audioContext.state === 'closed') {
      console.log('[SoundManager] Initializing sounds...')
      this.initializeSounds()
      this.initialized = true
    }
  }

  private initializeSounds() {
    try {
      // Close existing context if it exists
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close()
      }
      
      // Create new AudioContext
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('[SoundManager] AudioContext resumed')
        })
      }
      
      console.log('[SoundManager] AudioContext state:', this.audioContext.state)
      
      // All sound effects and music are now generated programmatically using the Web Audio API.
      
      console.log('[SoundManager] Sounds initialized successfully')
    } catch (error) {
      console.error('[SoundManager] Failed to initialize:', error)
    }
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
        } catch {
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
        } catch {
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
        case 'countdown':
          // Countdown beep - clear and attention-grabbing
          frequency = 880
          duration = 0.2
          gainNode.gain.value = 0.4 * this.masterVolume
          oscillator.type = 'sine'
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
    this.musicVolume = Math.max(0, Math.min(1, volume))
    console.log('[SoundManager] Music volume set to:', this.musicVolume)
    
    // Update music volume if playing
    if (this.backgroundMusicGain && this.isMusicPlaying) {
      this.backgroundMusicGain.gain.setTargetAtTime(
        this.musicVolume * this.masterVolume,
        this.audioContext?.currentTime || 0,
        0.1
      )
    }
  }

  playBackgroundMusic() {
    console.log('[SoundManager] playBackgroundMusic called')
    this.ensureInitialized()
    
    if (!this.audioContext) {
      console.warn('[SoundManager] AudioContext not available for music')
      return
    }

    console.log('[SoundManager] AudioContext state:', this.audioContext.state)
    console.log('[SoundManager] isMusicPlaying:', this.isMusicPlaying)

    // Don't start if already playing
    if (this.isMusicPlaying) {
      console.log('[SoundManager] Music already playing, skipping')
      return
    }

    // Resume audio context if needed
    if (this.audioContext.state === 'suspended') {
      console.log('[SoundManager] AudioContext suspended, attempting to resume...')
      this.audioContext.resume().then(() => {
        console.log('[SoundManager] AudioContext resumed for music')
        this.startBackgroundMusic()
      }).catch((error) => {
        console.error('[SoundManager] Failed to resume AudioContext:', error)
      })
    } else {
      console.log('[SoundManager] Starting background music directly')
      this.startBackgroundMusic()
    }
  }

  private startBackgroundMusic() {
    if (!this.audioContext || this.isMusicPlaying) return

    try {
      console.log('[SoundManager] Starting 8-bit background music')
      
      // Create gain node for music volume control
      this.backgroundMusicGain = this.audioContext.createGain()
      this.backgroundMusicGain.gain.value = this.musicVolume * this.masterVolume
      this.backgroundMusicGain.connect(this.audioContext.destination)

      // 8-bit style chord progression: I-V-vi-IV in C major
      // Using square waves for authentic 8-bit sound
      const chordProgression = [
        [261.63, 329.63, 392.00], // C major (C-E-G)
        [392.00, 493.88, 587.33], // G major (G-B-D)
        [440.00, 523.25, 659.25], // A minor (A-C-E)
        [349.23, 440.00, 523.25], // F major (F-A-C)
      ]

      // Melody notes (8-bit style)
      const melodyNotes = [
        523.25, 587.33, 659.25, 587.33, // C5, D5, E5, D5
        523.25, 392.00, 440.00, 493.88, // C5, G4, A4, B4
        523.25, 587.33, 659.25, 783.99, // C5, D5, E5, G5
        659.25, 587.33, 523.25, 493.88, // E5, D5, C5, B4
      ]

      const chordDuration = 2 // seconds per chord
      const noteDuration = 0.25 // seconds per melody note
      const totalDuration = chordProgression.length * chordDuration

      // Create bass line (lower octave)
      const bassOsc = this.audioContext.createOscillator()
      bassOsc.type = 'square'
      bassOsc.frequency.value = chordProgression[0][0] / 2 // Start with C2
      
      const bassGain = this.audioContext.createGain()
      bassGain.gain.value = 0.3
      bassOsc.connect(bassGain)
      bassGain.connect(this.backgroundMusicGain)
      
      // Schedule bass notes
      let currentTime = this.audioContext.currentTime
      for (let i = 0; i < 100; i++) { // Loop many times
        chordProgression.forEach((chord, idx) => {
          const time = currentTime + (i * totalDuration) + (idx * chordDuration)
          bassOsc.frequency.setValueAtTime(chord[0] / 2, time)
        })
      }
      
      bassOsc.start()
      this.backgroundMusicOscillators.push(bassOsc)

      // Create chord oscillators (3 voices for harmony)
      for (let voice = 0; voice < 3; voice++) {
        const osc = this.audioContext.createOscillator()
        osc.type = 'square'
        osc.frequency.value = chordProgression[0][voice]
        
        const gain = this.audioContext.createGain()
        gain.gain.value = 0.15
        osc.connect(gain)
        gain.connect(this.backgroundMusicGain)
        
        // Schedule chord changes
        currentTime = this.audioContext.currentTime
        for (let i = 0; i < 100; i++) { // Loop many times
          chordProgression.forEach((chord, idx) => {
            const time = currentTime + (i * totalDuration) + (idx * chordDuration)
            osc.frequency.setValueAtTime(chord[voice], time)
          })
        }
        
        osc.start()
        this.backgroundMusicOscillators.push(osc)
      }

      // Create melody line
      const melodyOsc = this.audioContext.createOscillator()
      melodyOsc.type = 'square'
      melodyOsc.frequency.value = melodyNotes[0]
      
      const melodyGain = this.audioContext.createGain()
      melodyGain.gain.value = 0.25
      melodyOsc.connect(melodyGain)
      melodyGain.connect(this.backgroundMusicGain)
      
      // Schedule melody notes
      currentTime = this.audioContext.currentTime
      for (let i = 0; i < 100; i++) { // Loop many times
        melodyNotes.forEach((note, idx) => {
          const time = currentTime + (i * totalDuration / 4) + (idx * noteDuration)
          melodyOsc.frequency.setValueAtTime(note, time)
          
          // Add envelope for each note
          melodyGain.gain.setValueAtTime(0.25, time)
          melodyGain.gain.exponentialRampToValueAtTime(0.1, time + noteDuration * 0.8)
        })
      }
      
      melodyOsc.start()
      this.backgroundMusicOscillators.push(melodyOsc)

      // Add arpeggio for texture
      const arpOsc = this.audioContext.createOscillator()
      arpOsc.type = 'triangle'
      arpOsc.frequency.value = 1046.50 // C6
      
      const arpGain = this.audioContext.createGain()
      arpGain.gain.value = 0.08
      arpOsc.connect(arpGain)
      arpGain.connect(this.backgroundMusicGain)
      
      // Fast arpeggios
      currentTime = this.audioContext.currentTime
      const arpSpeed = 0.125
      for (let i = 0; i < 400; i++) {
        const chordIdx = Math.floor(i / 16) % chordProgression.length
        const noteIdx = i % 3
        const time = currentTime + (i * arpSpeed)
        arpOsc.frequency.setValueAtTime(chordProgression[chordIdx][noteIdx] * 2, time)
      }
      
      arpOsc.start()
      this.backgroundMusicOscillators.push(arpOsc)

      this.isMusicPlaying = true
      this.isMusicPaused = false
      
      console.log('[SoundManager] 8-bit background music started')
    } catch (error) {
      console.error('[SoundManager] Error starting background music:', error)
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusicOscillators.length > 0) {
      console.log('[SoundManager] Stopping background music')
      
      this.backgroundMusicOscillators.forEach(osc => {
        try {
          osc.stop()
        } catch {
          // Ignore if already stopped
        }
      })
      this.backgroundMusicOscillators = []
    }
    
    if (this.backgroundMusicGain && this.audioContext) {
      this.backgroundMusicGain.disconnect()
      this.backgroundMusicGain = null
    }
    
    this.isMusicPlaying = false
    this.isMusicPaused = false
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusicGain && this.audioContext && this.isMusicPlaying && !this.isMusicPaused) {
      console.log('[SoundManager] Pausing background music')
      this.backgroundMusicGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1)
      this.isMusicPaused = true
    }
  }

  resumeBackgroundMusic() {
    if (this.backgroundMusicGain && this.audioContext && this.isMusicPlaying && this.isMusicPaused) {
      console.log('[SoundManager] Resuming background music')
      this.backgroundMusicGain.gain.setTargetAtTime(
        this.musicVolume * this.masterVolume,
        this.audioContext.currentTime,
        0.1
      )
      this.isMusicPaused = false
    }
  }

  cleanup() {
    console.log('[SoundManager] Cleanup called')
    this.stopEngineSound()
    this.stopBackgroundMusic()
    
    // Don't close the context - just stop everything
    // The context will be reused on next initialization
    this.initialized = false
  }
}

// Export singleton instance
export const soundManager = new SoundManager()