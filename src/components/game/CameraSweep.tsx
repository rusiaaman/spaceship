import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'
import { Html } from '@react-three/drei'

const SWEEP_DURATION = 5.5 // Increased to 5.5 seconds for proper finish pause

// Gentler easing function to avoid compressing the pause
const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export const CameraSweep = () => {
  const { camera } = useThree()
  const setGameState = useGameStore((state) => state.setGameState)
  const gameState = useGameStore((state) => state.gameState)
  
  const startTimeRef = useRef<number | null>(null)
  const originalPositionRef = useRef(new THREE.Vector3())
  const originalRotationRef = useRef(new THREE.Euler())
  const [showFinishLabel, setShowFinishLabel] = useState(false)
  
  // Define camera path keyframes with pause at finish line
  // AI ships are positioned at z = -20 to -60 (ahead of player at z=0)
  // Camera starts behind the grid to show all ships
  // Using LINEAR time values (no easing applied to keyframe times)
  const keyframes = [
    { time: 0.0, position: new THREE.Vector3(0, 8, 25), lookAt: new THREE.Vector3(0, 0, -40) }, // Start behind, elevated view of entire starting grid
    { time: 0.12, position: new THREE.Vector3(0, 12, 15), lookAt: new THREE.Vector3(0, 0, -40) }, // Move closer, still showing all ships
    { time: 0.20, position: new THREE.Vector3(0, 20, -10), lookAt: new THREE.Vector3(0, 0, -50) }, // Move through the grid, looking ahead
    { time: 0.28, position: new THREE.Vector3(0, 40, -150), lookAt: new THREE.Vector3(0, 0, -400) }, // Pull back to see the race track
    { time: 0.40, position: new THREE.Vector3(0, 80, -1000), lookAt: new THREE.Vector3(0, 0, -2000) }, // Mid journey
    { time: 0.52, position: new THREE.Vector3(0, 100, -2500), lookAt: new THREE.Vector3(0, 0, -3500) }, // Continue to finish
    { time: 0.62, position: new THREE.Vector3(0, 80, -5300), lookAt: new THREE.Vector3(0, 0, -GAME_CONSTANTS.RACE_DISTANCE) }, // Approach finish from behind
    { time: 0.68, position: new THREE.Vector3(0, 70, -5350), lookAt: new THREE.Vector3(0, 0, -GAME_CONSTANTS.RACE_DISTANCE) }, // Move into pause position (elevated for better view)
    { time: 0.88, position: new THREE.Vector3(0, 70, -5350), lookAt: new THREE.Vector3(0, 0, -GAME_CONSTANTS.RACE_DISTANCE) }, // PAUSE at finish - hold for 20% of animation (1.1 seconds)
    { time: 0.94, position: new THREE.Vector3(0, 40, -2500), lookAt: new THREE.Vector3(0, 0, -GAME_CONSTANTS.RACE_DISTANCE) }, // Start return - keep looking at finish
    { time: 0.97, position: new THREE.Vector3(0, 10, 100), lookAt: new THREE.Vector3(0, 0, -GAME_CONSTANTS.RACE_DISTANCE) }, // Continue return - still looking at finish
    { time: 1.0, position: new THREE.Vector3(0, 2, 5), lookAt: new THREE.Vector3(0, 0, -GAME_CONSTANTS.RACE_DISTANCE) }, // Final position - STILL looking at finish line
  ]
  
  // Store original camera settings
  useEffect(() => {
    if (gameState === 'camera-sweep') {
      originalPositionRef.current.copy(camera.position)
      originalRotationRef.current.copy(camera.rotation)
      startTimeRef.current = null
      setShowFinishLabel(false)
    }
  }, [gameState, camera])
  
  // Handle ESC key to skip sweep
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'camera-sweep') {
        // Reset camera to original position
        camera.position.set(0, 2, 5)
        camera.lookAt(0, 0, -50)
        setShowFinishLabel(false)
        setGameState('countdown')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, camera, setGameState])
  
  useFrame((state) => {
    if (gameState !== 'camera-sweep') return
    
    // Initialize start time on first frame
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime
    }
    
    const elapsed = state.clock.elapsedTime - startTimeRef.current
    const progress = Math.min(elapsed / SWEEP_DURATION, 1)
    
    // Apply gentler easing
    const easedProgress = easeInOutQuad(progress)
    
    // Show finish label during pause (between 0.68 and 0.88 - the actual pause keyframes)
    if (easedProgress >= 0.68 && easedProgress <= 0.88) {
      if (!showFinishLabel) setShowFinishLabel(true)
    } else {
      if (showFinishLabel) setShowFinishLabel(false)
    }
    
    // Find the current keyframe segment
    let currentKeyframe = keyframes[0]
    let nextKeyframe = keyframes[1]
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (easedProgress >= keyframes[i].time && easedProgress <= keyframes[i + 1].time) {
        currentKeyframe = keyframes[i]
        nextKeyframe = keyframes[i + 1]
        break
      }
    }
    
    // Calculate segment progress
    const segmentDuration = nextKeyframe.time - currentKeyframe.time
    const segmentProgress = segmentDuration > 0 
      ? (easedProgress - currentKeyframe.time) / segmentDuration 
      : 0
    
    // Interpolate position
    const newPosition = new THREE.Vector3().lerpVectors(
      currentKeyframe.position,
      nextKeyframe.position,
      segmentProgress
    )
    
    // Interpolate lookAt target
    const lookAtTarget = new THREE.Vector3().lerpVectors(
      currentKeyframe.lookAt,
      nextKeyframe.lookAt,
      segmentProgress
    )
    
    // Apply to camera
    camera.position.copy(newPosition)
    camera.lookAt(lookAtTarget)
    
    // Debug logging during finish pause (remove after testing)
    if (easedProgress >= 0.68 && easedProgress <= 0.88) {
      const distanceToFinish = Math.sqrt(
        Math.pow(camera.position.x - 0, 2) +
        Math.pow(camera.position.y - 0, 2) +
        Math.pow(camera.position.z - (-GAME_CONSTANTS.RACE_DISTANCE), 2)
      )
      
      // Log every 30 frames to avoid spam
      if (Math.floor(elapsed * 60) % 30 === 0) {
        console.log(`[Camera Sweep] Finish Pause:`, {
          progress: easedProgress.toFixed(3),
          cameraPos: `(${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)})`,
          lookingAt: `(${lookAtTarget.x.toFixed(0)}, ${lookAtTarget.y.toFixed(0)}, ${lookAtTarget.z.toFixed(0)})`,
          distanceToFinish: distanceToFinish.toFixed(0),
          finishLineZ: -GAME_CONSTANTS.RACE_DISTANCE,
          isBehindFinish: camera.position.z < -GAME_CONSTANTS.RACE_DISTANCE
        })
      }
    }
    
    // Check if sweep is complete
    if (progress >= 1) {
      // Ensure camera is at final position, looking at finish line
      camera.position.set(0, 2, 5)
      camera.lookAt(0, 0, -GAME_CONSTANTS.RACE_DISTANCE)
      setShowFinishLabel(false)
      
      // Transition to countdown
      setGameState('countdown')
    }
  })
  
  return (
    <>
      {showFinishLabel && (
        <Html
          position={[0, 0, -GAME_CONSTANTS.RACE_DISTANCE]}
          center
          distanceFactor={100}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '20px 40px',
              borderRadius: '12px',
              border: '2px solid #00ff00',
              boxShadow: '0 0 30px rgba(0, 255, 0, 0.5)',
              fontFamily: "'Orbitron', monospace",
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#00ff00',
              textTransform: 'uppercase',
              letterSpacing: '4px',
              textShadow: '0 0 20px rgba(0, 255, 0, 0.8)',
              animation: 'pulse 1s ease-in-out infinite',
              whiteSpace: 'nowrap',
            }}
          >
            ⚑ FINISH LINE ⚑
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.05); }
            }
          `}</style>
        </Html>
      )}
    </>
  )
}