/**
 * Simple performance profiler for debugging frame drops and bottlenecks
 */

interface ProfileEntry {
  name: string
  startTime: number
  duration: number
  count: number
}

class Profiler {
  private entries: Map<string, ProfileEntry> = new Map()
  private activeTimers: Map<string, number> = new Map()
  private frameCount = 0
  private lastLogTime = 0
  private readonly LOG_INTERVAL = 2000 // Log every 2 seconds
  private readonly WARN_THRESHOLD = 16 // Warn if operation takes > 16ms (60fps threshold)
  private enabled = false // Disabled by default for production performance
  
  enable() {
    this.enabled = true
  }
  
  disable() {
    this.enabled = false
  }
  
  start(name: string) {
    if (!this.enabled) return
    this.activeTimers.set(name, performance.now())
  }
  
  end(name: string) {
    if (!this.enabled) return
    const startTime = this.activeTimers.get(name)
    if (!startTime) return
    
    const duration = performance.now() - startTime
    this.activeTimers.delete(name)
    
    const entry = this.entries.get(name)
    if (entry) {
      entry.duration += duration
      entry.count++
    } else {
      this.entries.set(name, {
        name,
        startTime,
        duration,
        count: 1
      })
    }
    
    // Immediate warning for slow operations (only in dev mode)
    if (duration > this.WARN_THRESHOLD && import.meta.env.DEV) {
      console.warn(`⚠️ SLOW: ${name} took ${duration.toFixed(2)}ms (threshold: ${this.WARN_THRESHOLD}ms)`)
    }
  }
  
  frame() {
    if (!this.enabled) return
    this.frameCount++
    const now = performance.now()
    
    if (now - this.lastLogTime >= this.LOG_INTERVAL) {
      this.log()
      this.reset()
      this.lastLogTime = now
    }
  }
  
  private log() {
    if (this.entries.size === 0) return
    
    console.group(`📊 Performance Profile (${this.frameCount} frames, ${(this.LOG_INTERVAL / 1000).toFixed(1)}s)`)
    
    // Sort by total duration
    const sorted = Array.from(this.entries.values()).sort((a, b) => b.duration - a.duration)
    
    let totalTime = 0
    sorted.forEach(entry => {
      totalTime += entry.duration
      const avgDuration = entry.duration / entry.count
      const callsPerFrame = entry.count / this.frameCount
      
      const emoji = avgDuration > this.WARN_THRESHOLD ? '🔴' : avgDuration > 8 ? '🟡' : '🟢'
      
      console.log(
        `${emoji} ${entry.name.padEnd(30)} | ` +
        `Avg: ${avgDuration.toFixed(2)}ms | ` +
        `Total: ${entry.duration.toFixed(2)}ms | ` +
        `Calls: ${entry.count} (${callsPerFrame.toFixed(2)}/frame)`
      )
    })
    
    const avgFrameTime = totalTime / this.frameCount
    const fps = 1000 / avgFrameTime
    console.log(`\n⏱️  Avg frame time: ${avgFrameTime.toFixed(2)}ms (~${fps.toFixed(1)} FPS)`)
    console.groupEnd()
  }
  
  private reset() {
    this.entries.clear()
    this.frameCount = 0
  }
  
  measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn()
    this.start(name)
    try {
      return fn()
    } finally {
      this.end(name)
    }
  }
}

export const profiler = new Profiler()

// Enable profiler only in development mode
if (import.meta.env.DEV) {
  profiler.enable()
  // Expose to window for manual control
  ;(window as any).__profiler = profiler
}

// Helper for async operations
export const profileAsync = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  profiler.start(name)
  try {
    return await fn()
  } finally {
    profiler.end(name)
  }
}