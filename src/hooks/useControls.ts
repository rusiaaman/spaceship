import { useEffect, useState, useRef } from 'react'

interface Controls {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  boost: boolean
  brake: boolean
  mouseDeltaX: number
  mouseDeltaY: number
}

export const useControls = () => {
  const [controls, setControls] = useState<Controls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    brake: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  })

  const isPointerLocked = useRef(false)

  useEffect(() => {
    // Request pointer lock on first click
    const handleClick = () => {
      if (!isPointerLocked.current) {
        document.body.requestPointerLock()
      }
    }

    // Track pointer lock state
    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === document.body
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for space and arrow keys to avoid page scrolling
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }

      const key = e.key.toLowerCase()
      switch (key) {
        case 'w':
        case 'arrowup':
          setControls((prev) => ({ ...prev, forward: true }))
          break
        case 's':
        case 'arrowdown':
          setControls((prev) => ({ ...prev, backward: true }))
          break
        case 'a':
        case 'arrowleft':
          setControls((prev) => ({ ...prev, left: true }))
          break
        case 'd':
        case 'arrowright':
          setControls((prev) => ({ ...prev, right: true }))
          break
        case 'q':
          setControls((prev) => ({ ...prev, up: true }))
          break
        case 'e':
          setControls((prev) => ({ ...prev, down: true }))
          break
        case 'shift':
          setControls((prev) => ({ ...prev, boost: true }))
          break
        case ' ':
          setControls((prev) => ({ ...prev, brake: true }))
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      switch (key) {
        case 'w':
        case 'arrowup':
          setControls((prev) => ({ ...prev, forward: false }))
          break
        case 's':
        case 'arrowdown':
          setControls((prev) => ({ ...prev, backward: false }))
          break
        case 'a':
        case 'arrowleft':
          setControls((prev) => ({ ...prev, left: false }))
          break
        case 'd':
        case 'arrowright':
          setControls((prev) => ({ ...prev, right: false }))
          break
        case 'q':
          setControls((prev) => ({ ...prev, up: false }))
          break
        case 'e':
          setControls((prev) => ({ ...prev, down: false }))
          break
        case 'shift':
          setControls((prev) => ({ ...prev, boost: false }))
          break
        case ' ':
          setControls((prev) => ({ ...prev, brake: false }))
          break
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Only process mouse movement when pointer is locked
      if (!isPointerLocked.current) return

      // Use movementX/Y which gives relative movement directly
      const deltaX = e.movementX || 0
      const deltaY = e.movementY || 0

      // Update controls with delta values - don't reset immediately
      setControls((prev) => ({
        ...prev,
        mouseDeltaX: deltaX,
        mouseDeltaY: deltaY,
      }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return controls
}