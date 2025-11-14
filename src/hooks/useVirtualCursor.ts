import { useState, useEffect, useRef, useCallback } from 'react'

interface VirtualCursorState {
  x: number
  y: number
  isVisible: boolean
}

export const useVirtualCursor = (isActive: boolean = true) => {
  const [cursor, setCursor] = useState<VirtualCursorState>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    isVisible: isActive,
  })

  const cursorRef = useRef(cursor)
  const sensitivityRef = useRef(1.0)
  const pointerLockRequestedRef = useRef(false)

  // Keep ref in sync with state
  useEffect(() => {
    cursorRef.current = cursor
  }, [cursor])

  const updateCursorPosition = useCallback((movementX: number, movementY: number) => {
    setCursor(prev => {
      const sensitivity = sensitivityRef.current
      const newX = Math.max(0, Math.min(window.innerWidth, prev.x + movementX * sensitivity))
      const newY = Math.max(0, Math.min(window.innerHeight, prev.y + movementY * sensitivity))
      
      return {
        ...prev,
        x: newX,
        y: newY,
      }
    })
  }, [])

  const resetCursor = useCallback(() => {
    setCursor(prev => ({
      ...prev,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }))
  }, [])

  const setVisibility = useCallback((visible: boolean) => {
    setCursor(prev => ({ ...prev, isVisible: visible }))
  }, [])

  // Request pointer lock when virtual cursor becomes active
  useEffect(() => {
    if (!isActive) {
      pointerLockRequestedRef.current = false
      return
    }

    const requestPointerLock = () => {
      if (!document.pointerLockElement && !pointerLockRequestedRef.current) {
        pointerLockRequestedRef.current = true
        document.documentElement.requestPointerLock()
          .catch((err) => {
            console.warn('Pointer lock request failed:', err)
            pointerLockRequestedRef.current = false
          })
      }
    }

    // Request on first click when virtual cursor is active
    const handleClick = () => {
      requestPointerLock()
    }

    // Also try to request immediately (will fail without user gesture, but worth trying)
    requestPointerLock()

    document.addEventListener('click', handleClick)
    
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) return

    const handleMouseMove = (e: MouseEvent) => {
      // Track movement when pointer is locked
      if (document.pointerLockElement) {
        updateCursorPosition(e.movementX, e.movementY)
      } else {
        // Also track regular mouse position when not locked (fallback)
        setCursor(prev => ({
          ...prev,
          x: e.clientX,
          y: e.clientY,
        }))
      }
    }

    const handleResize = () => {
      // Clamp cursor to new window bounds on resize
      setCursor(prev => ({
        ...prev,
        x: Math.max(0, Math.min(window.innerWidth, prev.x)),
        y: Math.max(0, Math.min(window.innerHeight, prev.y)),
      }))
    }

    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        pointerLockRequestedRef.current = false
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [isActive, updateCursorPosition])

  return {
    cursor,
    updateCursorPosition,
    resetCursor,
    setVisibility,
    setSensitivity: (sensitivity: number) => {
      sensitivityRef.current = sensitivity
    },
  }
}