/**
 * Binary heap-based priority queue for efficient event scheduling
 * O(log n) insertion and removal
 */

export interface QueueItem<T> {
  priority: number // Lower number = higher priority (timestamp for events)
  data: T
}

export class PriorityQueue<T> {
  private heap: QueueItem<T>[] = []

  /**
   * Get the size of the queue
   */
  get size(): number {
    return this.heap.length
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0
  }

  /**
   * Add an item to the queue
   * O(log n) complexity
   */
  enqueue(priority: number, data: T): void {
    const item: QueueItem<T> = { priority, data }
    this.heap.push(item)
    this.bubbleUp(this.heap.length - 1)
  }

  /**
   * Remove and return the highest priority item
   * O(log n) complexity
   */
  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined

    const top = this.heap[0]
    const bottom = this.heap.pop()!

    if (this.heap.length > 0) {
      this.heap[0] = bottom
      this.bubbleDown(0)
    }

    return top.data
  }

  /**
   * Peek at the highest priority item without removing it
   * O(1) complexity
   */
  peek(): T | undefined {
    return this.heap[0]?.data
  }

  /**
   * Get the priority of the top item
   */
  peekPriority(): number | undefined {
    return this.heap[0]?.priority
  }

  /**
   * Remove all items with priority <= threshold
   */
  dequeueWhile(maxPriority: number): T[] {
    const results: T[] = []
    
    while (!this.isEmpty() && this.peekPriority()! <= maxPriority) {
      const item = this.dequeue()
      if (item) results.push(item)
    }

    return results
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.heap = []
  }

  /**
   * Bubble up element at index to maintain heap property
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      
      if (this.heap[index].priority >= this.heap[parentIndex].priority) {
        break
      }

      // Swap with parent
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]]
      index = parentIndex
    }
  }

  /**
   * Bubble down element at index to maintain heap property
   */
  private bubbleDown(index: number): void {
    const length = this.heap.length

    while (true) {
      const leftChild = 2 * index + 1
      const rightChild = 2 * index + 2
      let smallest = index

      if (leftChild < length && this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild
      }

      if (rightChild < length && this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild
      }

      if (smallest === index) break

      // Swap with smallest child
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]]
      index = smallest
    }
  }
}

/**
 * Event types for the game event system
 */
export const GameEventType = {
  BOOST_END: 'boost_end',
  PROJECTILE_EXPIRE: 'projectile_expire',
  AI_STATE_CHANGE: 'ai_state_change',
  DAMAGE_RECOVERY: 'damage_recovery',
  WEAPON_COOLDOWN: 'weapon_cooldown'
} as const

export type GameEventType = typeof GameEventType[keyof typeof GameEventType]

export type GameEvent = {
  type: GameEventType
  data: any
  callback?: () => void
}

/**
 * Global event scheduler using priority queue
 */
export class EventScheduler {
  private queue = new PriorityQueue<GameEvent>()
  private currentTime = 0

  /**
   * Schedule an event to occur at a specific time
   */
  schedule(time: number, event: GameEvent): void {
    this.queue.enqueue(time, event)
  }

  /**
   * Schedule an event to occur after a delay
   */
  scheduleDelayed(delay: number, event: GameEvent): void {
    this.queue.enqueue(this.currentTime + delay, event)
  }

  /**
   * Update the scheduler and process due events
   */
  update(currentTime: number): GameEvent[] {
    this.currentTime = currentTime
    return this.queue.dequeueWhile(currentTime)
  }

  /**
   * Clear all scheduled events
   */
  clear(): void {
    this.queue.clear()
  }

  /**
   * Get number of pending events
   */
  getPendingCount(): number {
    return this.queue.size
  }
}