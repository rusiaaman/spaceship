/**
 * Bit flag utilities for efficient state management
 * Uses bitwise operations for fast state checks and updates
 */

/**
 * Ship state flags (can be combined)
 */
export enum ShipState {
  NONE = 0,
  ACTIVE = 1 << 0,      // 1
  BOOSTING = 1 << 1,    // 2
  DAMAGED = 1 << 2,     // 4
  SHOOTING = 1 << 3,    // 8
  DESTROYED = 1 << 4,   // 16
  EVADING = 1 << 5,     // 32
  PURSUING = 1 << 6,    // 64
  FORMATION = 1 << 7    // 128
}

/**
 * Projectile state flags
 */
export enum ProjectileState {
  NONE = 0,
  ACTIVE = 1 << 0,      // 1
  PLAYER_OWNED = 1 << 1, // 2
  HOMING = 1 << 2,      // 4
  CRITICAL = 1 << 3     // 8
}

/**
 * Bit flag helper class
 */
export class BitFlags {
  private flags: number = 0

  constructor(initialFlags: number = 0) {
    this.flags = initialFlags
  }

  /**
   * Set a flag (turn on)
   */
  set(flag: number): void {
    this.flags |= flag
  }

  /**
   * Clear a flag (turn off)
   */
  clear(flag: number): void {
    this.flags &= ~flag
  }

  /**
   * Toggle a flag
   */
  toggle(flag: number): void {
    this.flags ^= flag
  }

  /**
   * Check if a flag is set
   */
  has(flag: number): boolean {
    return (this.flags & flag) === flag
  }

  /**
   * Check if any of the flags are set
   */
  hasAny(flags: number): boolean {
    return (this.flags & flags) !== 0
  }

  /**
   * Check if all of the flags are set
   */
  hasAll(flags: number): boolean {
    return (this.flags & flags) === flags
  }

  /**
   * Clear all flags
   */
  clearAll(): void {
    this.flags = 0
  }

  /**
   * Set all flags
   */
  setAll(flags: number): void {
    this.flags = flags
  }

  /**
   * Get raw flag value
   */
  getValue(): number {
    return this.flags
  }

  /**
   * Set raw flag value
   */
  setValue(value: number): void {
    this.flags = value
  }

  /**
   * Create a copy
   */
  clone(): BitFlags {
    return new BitFlags(this.flags)
  }
}

/**
 * Utility functions for bit flag operations
 */
export const BitFlagUtils = {
  /**
   * Check if a flag is set in a number
   */
  has: (value: number, flag: number): boolean => {
    return (value & flag) === flag
  },

  /**
   * Set a flag in a number
   */
  set: (value: number, flag: number): number => {
    return value | flag
  },

  /**
   * Clear a flag in a number
   */
  clear: (value: number, flag: number): number => {
    return value & ~flag
  },

  /**
   * Toggle a flag in a number
   */
  toggle: (value: number, flag: number): number => {
    return value ^ flag
  },

  /**
   * Check if any flags are set
   */
  hasAny: (value: number, flags: number): boolean => {
    return (value & flags) !== 0
  },

  /**
   * Check if all flags are set
   */
  hasAll: (value: number, flags: number): boolean => {
    return (value & flags) === flags
  }
}