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
  shoot: boolean
  toggleCamera: boolean
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
    shoot: false,
    toggleCamera: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  })

  // Use ref to store mouse deltas to avoid state updates on every mouse move
  const mouseDeltaRef = useRef({ x: 0, y: 0 })

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
        case 'c':
          setControls((prev) => ({ ...prev, toggleCamera: true }))
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
        case 'c':
          setControls((prev) => ({ ...prev, toggleCamera: false }))
          break
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Always process mouse movement when pointer is locked (checking document.pointerLockElement)
      if (!document.pointerLockElement) return

      // Store in ref instead of state to avoid re-renders
      mouseDeltaRef.current.x = e.movementX || 0
      mouseDeltaRef.current.y = e.movementY || 0
    }

    const handleMouseDown = (e: MouseEvent) => {
      // Left mouse button
      if (e.button === 0) {
        setControls((prev) => ({ ...prev, shoot: true }))
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Left mouse button
      if (e.button === 0) {
        setControls((prev) => ({ ...prev, shoot: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Return controls with mouse delta getter
  return {
    ...controls,
    get mouseDeltaX() { return mouseDeltaRef.current.x },
    get mouseDeltaY() { return mouseDeltaRef.current.y }
  }
}