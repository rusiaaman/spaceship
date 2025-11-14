import { useEffect, useState, useCallback, useRef } from 'react'
import styled from '@emotion/styled'
import { useVirtualCursor } from '@/hooks/useVirtualCursor'

const CursorContainer = styled.div<{ x: number; y: number }>`
  position: fixed;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: 20px;
  height: 20px;
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -50%);
  transition: none;
`

const Pointer = styled.div<{ isHovering?: boolean }>`
  position: relative;
  width: 18px;
  height: 22px;
  transition: transform 0.1s ease;
  transform: ${props => props.isHovering ? 'scale(1.2)' : 'scale(1)'};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    border-left: 9px solid var(--hud-cyan);
    border-right: 9px solid transparent;
    border-bottom: 14px solid transparent;
    filter: drop-shadow(0 0 ${props => props.isHovering ? '10px' : '6px'} var(--glow-blue));
    transition: filter 0.1s ease;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 10px;
    left: 6px;
    width: 6px;
    height: 8px;
    background: var(--hud-cyan);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
    filter: drop-shadow(0 0 ${props => props.isHovering ? '6px' : '4px'} var(--glow-blue));
    transition: filter 0.1s ease;
  }
`

interface VirtualCursorProps {
  isVisible: boolean
  onElementHover?: (element: HTMLElement | null) => void
  onClick?: (element: HTMLElement | null) => void
}

export const VirtualCursor = ({ isVisible, onElementHover, onClick }: VirtualCursorProps) => {
  const { cursor } = useVirtualCursor(isVisible)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  const [showPointerLockHint, setShowPointerLockHint] = useState(false)
  const lastClickTime = useRef(0)
  const hintTimeoutRef = useRef<number | undefined>(undefined)

  // Detect element under cursor
  const detectElement = useCallback((x: number, y: number) => {
    if (!isVisible) return null
    
    // Get element at cursor position
    const element = document.elementFromPoint(x, y) as HTMLElement
    
    if (!element) return null
    
    // Check if element or any parent is clickable
    let clickableElement: HTMLElement | null = element
    while (clickableElement && clickableElement !== document.body) {
      const tagName = clickableElement.tagName.toLowerCase()
      const role = clickableElement.getAttribute('role')
      const isButton = tagName === 'button' || role === 'button'
      const isClickable = clickableElement.onclick !== null || 
                         clickableElement.style.cursor === 'pointer' ||
                         isButton
      
      if (isClickable || isButton) {
        return clickableElement
      }
      
      clickableElement = clickableElement.parentElement
    }
    
    return null
  }, [isVisible])

  // Show hint if pointer lock is not active after a delay
  useEffect(() => {
    if (!isVisible) {
      setShowPointerLockHint(false)
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
      return
    }

    // Check if pointer lock is active
    const checkPointerLock = () => {
      if (!document.pointerLockElement) {
        hintTimeoutRef.current = window.setTimeout(() => {
          setShowPointerLockHint(true)
        }, 1000)
      } else {
        setShowPointerLockHint(false)
      }
    }

    checkPointerLock()
    
    const handlePointerLockChange = () => {
      if (document.pointerLockElement) {
        setShowPointerLockHint(false)
        if (hintTimeoutRef.current) {
          clearTimeout(hintTimeoutRef.current)
        }
      }
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [isVisible])

  // Update hovered element
  useEffect(() => {
    if (!isVisible) {
      setHoveredElement(null)
      return
    }

    const checkHover = () => {
      const element = detectElement(cursor.x, cursor.y)
      
      if (element !== hoveredElement) {
        setHoveredElement(element)
        onElementHover?.(element)
      }
    }

    // Check on every cursor movement
    checkHover()
  }, [cursor.x, cursor.y, isVisible, detectElement, hoveredElement, onElementHover])

  // Handle clicks
  useEffect(() => {
    if (!isVisible) return

    const handleMouseDown = (e: MouseEvent) => {
      // Prevent double clicks
      const now = Date.now()
      if (now - lastClickTime.current < 200) return
      lastClickTime.current = now

      if (e.button === 0 && hoveredElement) {
        e.preventDefault()
        e.stopPropagation()
        
        // Trigger click on the hovered element
        hoveredElement.click()
        onClick?.(hoveredElement)
        
        // Visual feedback
        hoveredElement.style.transform = 'scale(0.95)'
        setTimeout(() => {
          if (hoveredElement) {
            hoveredElement.style.transform = ''
          }
        }, 100)
      }
    }

    window.addEventListener('mousedown', handleMouseDown, true)
    
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true)
    }
  }, [isVisible, hoveredElement, onClick])

  if (!isVisible) return null

  return (
    <>
      <CursorContainer x={cursor.x} y={cursor.y}>
        <Pointer isHovering={!!hoveredElement} />
      </CursorContainer>
      {showPointerLockHint && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(0, 212, 255, 0.2)',
          border: '1px solid var(--hud-cyan)',
          borderRadius: '8px',
          color: 'var(--hud-cyan)',
          fontFamily: 'Orbitron, monospace',
          fontSize: '14px',
          zIndex: 10001,
          pointerEvents: 'none',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          Click anywhere to enable cursor control
        </div>
      )}
    </>
  )
}