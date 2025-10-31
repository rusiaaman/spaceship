/**
 * Spatial indexing system using Flatbush (Packed Hilbert R-tree)
 * Provides O(log n) collision detection and proximity queries
 */

import Flatbush from 'flatbush'
import * as THREE from 'three'

export interface SpatialObject {
  id: number | string
  position: THREE.Vector3
  radius: number
}

/**
 * Spatial index for fast collision detection and proximity queries
 */
export class SpatialIndex {
  private index: Flatbush | null = null
  private objects: SpatialObject[] = []
  private objectMap = new Map<number | string, number>() // id -> array index
  private needsRebuild = true

  /**
   * Add or update an object in the index
   */
  addOrUpdate(obj: SpatialObject): void {
    const existingIndex = this.objectMap.get(obj.id)
    
    if (existingIndex !== undefined) {
      // Update existing object
      this.objects[existingIndex] = obj
    } else {
      // Add new object
      this.objectMap.set(obj.id, this.objects.length)
      this.objects.push(obj)
    }
    
    this.needsRebuild = true
  }

  /**
   * Remove an object from the index
   */
  remove(id: number | string): void {
    const index = this.objectMap.get(id)
    if (index === undefined) return

    // Mark for removal by setting to null
    this.objects[index] = null as any
    this.objectMap.delete(id)
    this.needsRebuild = true
  }

  /**
   * Rebuild the spatial index
   * Should be called once per frame after all updates
   */
  rebuild(): void {
    if (!this.needsRebuild) return

    // Filter out null entries (removed objects)
    this.objects = this.objects.filter(obj => obj !== null)
    
    // Rebuild object map
    this.objectMap.clear()
    this.objects.forEach((obj, idx) => {
      this.objectMap.set(obj.id, idx)
    })

    if (this.objects.length === 0) {
      this.index = null
      this.needsRebuild = false
      return
    }

    // Create new Flatbush index
    this.index = new Flatbush(this.objects.length)

    // Add all objects to the index
    for (const obj of this.objects) {
      const { x, z } = obj.position
      const r = obj.radius
      
      // Add bounding box (we use 2D projection for XZ plane)
      this.index.add(
        x - r, // minX
        z - r, // minY (using Z as Y for 2D)
        x + r, // maxX
        z + r  // maxY
      )
    }

    // Finish building the index
    this.index.finish()
    this.needsRebuild = false
  }

  /**
   * Query objects within a bounding box
   */
  queryBox(minX: number, minZ: number, maxX: number, maxZ: number): SpatialObject[] {
    if (!this.index || this.objects.length === 0) return []

    const indices = this.index.search(minX, minZ, maxX, maxZ)
    return indices.map(i => this.objects[i])
  }

  /**
   * Query objects within radius of a point
   */
  queryRadius(position: THREE.Vector3, radius: number): SpatialObject[] {
    const { x, z } = position
    const candidates = this.queryBox(x - radius, z - radius, x + radius, z + radius)
    
    // Filter by actual distance (including Y axis)
    const radiusSq = radius * radius
    return candidates.filter(obj => 
      position.distanceToSquared(obj.position) <= radiusSq
    )
  }

  /**
   * Find K nearest neighbors to a point
   */
  queryNearest(position: THREE.Vector3, k: number = 1, maxDistance: number = Infinity): SpatialObject[] {
    if (!this.index || this.objects.length === 0) return []

    const { x, z } = position
    const indices = this.index.neighbors(x, z, k, maxDistance)
    
    return indices
      .map(i => this.objects[i])
      .filter(obj => obj !== undefined)
  }

  /**
   * Check collision between a point and any indexed object
   */
  checkCollision(position: THREE.Vector3, radius: number): SpatialObject | null {
    const nearby = this.queryRadius(position, radius)
    
    for (const obj of nearby) {
      const distance = position.distanceTo(obj.position)
      if (distance < radius + obj.radius) {
        return obj
      }
    }
    
    return null
  }

  /**
   * Get all objects in the index
   */
  getAllObjects(): SpatialObject[] {
    return this.objects.filter(obj => obj !== null)
  }

  /**
   * Get object by ID
   */
  getObject(id: number | string): SpatialObject | undefined {
    const index = this.objectMap.get(id)
    return index !== undefined ? this.objects[index] : undefined
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.index = null
    this.objects = []
    this.objectMap.clear()
    this.needsRebuild = true
  }

  /**
   * Get statistics about the index
   */
  getStats() {
    return {
      objectCount: this.objects.length,
      needsRebuild: this.needsRebuild,
      hasIndex: this.index !== null
    }
  }
}

/**
 * Specialized spatial indices for different object types
 */
export class GameSpatialIndices {
  aiShips = new SpatialIndex()
  projectiles = new SpatialIndex()
  boosters = new SpatialIndex()

  /**
   * Rebuild all indices
   */
  rebuildAll(): void {
    this.aiShips.rebuild()
    this.projectiles.rebuild()
    this.boosters.rebuild()
  }

  /**
   * Clear all indices
   */
  clearAll(): void {
    this.aiShips.clear()
    this.projectiles.clear()
    this.boosters.clear()
  }

  /**
   * Get combined statistics
   */
  getStats() {
    return {
      aiShips: this.aiShips.getStats(),
      projectiles: this.projectiles.getStats(),
      boosters: this.boosters.getStats()
    }
  }
}