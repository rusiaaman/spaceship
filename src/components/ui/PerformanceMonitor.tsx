import { useEffect, useState, useRef } from 'react'
import styled from '@emotion/styled'

const MonitorContainer = styled.div`
  position: fixed;
  top: 60px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--hud-cyan);
  border-radius: 4px;
  padding: 10px 15px;
  font-family: 'Orbitron', monospace;
  font-size: 12px;
  color: var(--hud-cyan);
  pointer-events: none;
  z-index: 1000;
  min-width: 120px;
`

const Stat = styled.div<{ warning?: boolean }>`
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
  color: ${props => props.warning ? '#ff4444' : 'var(--hud-cyan)'};
`

const Label = styled.span`
  opacity: 0.7;
  margin-right: 10px;
`

const Value = styled.span`
  font-weight: bold;
`

export const PerformanceMonitor = () => {
  const [fps, setFps] = useState(60)
  const [frameTime, setFrameTime] = useState(16.67)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const frameTimesRef = useRef<number[]>([])

  useEffect(() => {
    let animationFrameId: number

    const measurePerformance = () => {
      const now = performance.now()
      const delta = now - lastTimeRef.current
      
      frameCountRef.current++
      frameTimesRef.current.push(delta)
      
      // Keep only last 60 frames
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift()
      }

      // Update stats every 30 frames
      if (frameCountRef.current % 30 === 0) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
        const currentFps = 1000 / avgFrameTime
        
        setFps(Math.round(currentFps))
        setFrameTime(Number(avgFrameTime.toFixed(2)))
      }

      lastTimeRef.current = now
      animationFrameId = requestAnimationFrame(measurePerformance)
    }

    animationFrameId = requestAnimationFrame(measurePerformance)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <MonitorContainer>
      <Stat warning={fps < 55}>
        <Label>FPS:</Label>
        <Value>{fps}</Value>
      </Stat>
      <Stat warning={frameTime > 18}>
        <Label>Frame:</Label>
        <Value>{frameTime}ms</Value>
      </Stat>
    </MonitorContainer>
  )
}