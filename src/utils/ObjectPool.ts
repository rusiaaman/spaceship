/**
 * Generic object pool for reusing objects and reducing allocations
 * Implements SOTA memory management for high-performance gaming
 */

export class ObjectPool<T> {
  private available: T[] = []
  private inUse = new Set<T>()
  private factory: () => T
  private reset: (obj: T) => void
  private maxSize: number

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 50,
    maxSize: number = 200
  ) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory())
    }
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    let obj: T

    if (this.available.length > 0) {
      obj = this.available.pop()!
    } else {
      // Create new object if pool is empty and under max size
      if (this.inUse.size < this.maxSize) {
        obj = this.factory()
      } else {
        // Force reuse oldest object if at max capacity
        console.warn('ObjectPool: Max capacity reached, forcing reuse')
        const firstValue = this.inUse.values().next().value as T
        obj = firstValue
        this.inUse.delete(obj)
        this.reset(obj)
      }
    }

    this.inUse.add(obj)
    return obj
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('ObjectPool: Attempting to release object not in use')
      return
    }

    this.inUse.delete(obj)
    this.reset(obj)
    
    // Only keep up to maxSize objects in the pool
    if (this.available.length < this.maxSize) {
      this.available.push(obj)
    }
  }

  /**
   * Release multiple objects at once
   */
  releaseMany(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj)
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
      maxSize: this.maxSize
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.available = []
    this.inUse.clear()
  }
}

/**
 * Specialized pool for THREE.Vector3 objects
 */
import * as THREE from 'three'

export class Vector3Pool {
  private static instance: ObjectPool<THREE.Vector3>

  static getInstance(): ObjectPool<THREE.Vector3> {
    if (!Vector3Pool.instance) {
      Vector3Pool.instance = new ObjectPool(
        () => new THREE.Vector3(),
        (v) => v.set(0, 0, 0),
        100, // Initial size
        500  // Max size
      )
    }
    return Vector3Pool.instance
  }

  static acquire(): THREE.Vector3 {
    return Vector3Pool.getInstance().acquire()
  }

  static release(v: THREE.Vector3): void {
    Vector3Pool.getInstance().release(v)
  }

  static getStats() {
    return Vector3Pool.getInstance().getStats()
  }
}