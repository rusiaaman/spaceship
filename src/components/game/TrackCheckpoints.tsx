import { Torus } from '@react-three/drei'
import { CHECKPOINTS } from '@/utils/solarSystemData'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '@/store/gameStore'
import { useRef } from 'react'
import * as THREE from 'three'

export const TrackCheckpoints = () => {
  const checkpointsPassed = useGameStore((state) => state.checkpointsPassed)
  const passCheckpoint = useGameStore((state) => state.passCheckpoint)
  const isRaceStarted = useGameStore((state) => state.isRaceStarted)
  const gameState = useGameStore((state) => state.gameState)
  
  const playerPosRef = useRef(new THREE.Vector3())
  
  useFrame(() => {
    if (gameState !== 'playing' || !isRaceStarted) return
    
    // Get player position
    if ((window as any).__weaponSystemRefs?.playerPosition) {
      playerPosRef.current.copy((window as any).__weaponSystemRefs.playerPosition)
      
      // Check if player passed the next checkpoint
      const nextCheckpointIndex = checkpointsPassed
      if (nextCheckpointIndex < CHECKPOINTS.length) {
        const checkpoint = CHECKPOINTS[nextCheckpointIndex]
        const checkpointPos = new THREE.Vector3(
          checkpoint.position.x,
          checkpoint.position.y,
          checkpoint.position.z
        )
        
        const distance = playerPosRef.current.distanceTo(checkpointPos)
        
        // Check if player is within checkpoint radius
        if (distance < checkpoint.radius) {
          passCheckpoint(nextCheckpointIndex)
        }
      }
    }
  })
  
  return (
    <group>
      {CHECKPOINTS.map((checkpoint, index) => {
        const isPassed = index < checkpointsPassed
        const isNext = index === checkpointsPassed
        
        return (
          <group key={index} position={[checkpoint.position.x, checkpoint.position.y, checkpoint.position.z]}>
            {/* Outer checkpoint ring */}
            <Torus args={[checkpoint.radius, 2, 8, 32]}>
              <meshBasicMaterial 
                color={isPassed ? '#00ff00' : isNext ? '#ffff00' : index % 2 === 0 ? '#00aaff' : '#ffaa00'} 
                transparent 
                opacity={isPassed ? 0.3 : isNext ? 0.9 : 0.6}
                toneMapped={false}
              />
            </Torus>
            
            {/* Inner glow ring */}
            <Torus args={[checkpoint.radius * 0.85, 1, 8, 32]}>
              <meshBasicMaterial 
                color={isPassed ? '#00ff00' : isNext ? '#ffff00' : index % 2 === 0 ? '#00aaff' : '#ffaa00'} 
                transparent 
                opacity={isPassed ? 0.2 : isNext ? 0.6 : 0.4}
                toneMapped={false}
              />
            </Torus>
            
            {/* Pulsing center ring for next checkpoint */}
            {isNext && (
              <Torus args={[checkpoint.radius * 0.5, 0.5, 8, 32]}>
                <meshBasicMaterial 
                  color="#ffffff" 
                  transparent 
                  opacity={0.8}
                  toneMapped={false}
                />
              </Torus>
            )}
          </group>
        )
      })}
    </group>
  )
}