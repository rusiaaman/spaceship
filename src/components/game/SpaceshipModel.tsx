import { useRef, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import type { GLTF } from 'three-stdlib'

interface SpaceshipModelProps {
  spaceshipRef: React.RefObject<THREE.Group>
}

export const SpaceshipModel = ({ spaceshipRef }: SpaceshipModelProps) => {
  const modelRef = useRef<THREE.Group>(null!)
  const gltf = useGLTF('/racing-spaceship.glb') as GLTF
  
  // Clone the scene once and reuse it
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true)
    
    // Traverse and ensure all materials are properly set up with enhanced visibility
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          // Clone materials to avoid sharing issues
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(mat => {
              const clonedMat = mat.clone()
              clonedMat.side = THREE.DoubleSide
              
              // Make materials much brighter and more visible
              if (clonedMat instanceof THREE.MeshStandardMaterial || clonedMat instanceof THREE.MeshPhysicalMaterial) {
                // Add strong emissive glow
                clonedMat.emissive = new THREE.Color(0x00aaff)
                clonedMat.emissiveIntensity = 0.8
                clonedMat.metalness = 0.9
                clonedMat.roughness = 0.3
              }
              
              return clonedMat
            })
          } else {
            mesh.material = mesh.material.clone()
            mesh.material.side = THREE.DoubleSide
            
            // Make materials much brighter and more visible
            if (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhysicalMaterial) {
              mesh.material.emissive = new THREE.Color(0x00aaff)
              mesh.material.emissiveIntensity = 0.8
              mesh.material.metalness = 0.9
              mesh.material.roughness = 0.3
            }
          }
        }
        // Ensure the mesh casts and receives shadows
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    
    return clone
  }, [gltf.scene])
  
  // Only render in third-person view
  // We only subscribe to cameraView here to minimize component re-renders.
  const cameraView = useGameStore(state => state.cameraView)
  const getPlayerSizeConfig = useGameStore(state => state.getPlayerSizeConfig)
  const sizeConfig = getPlayerSizeConfig()
  
  useEffect(() => {
    console.log('Spaceship model component mounted, camera view:', cameraView)
    console.log('Cloned scene:', clonedScene)
  }, [cameraView, clonedScene])
  
  useFrame(() => {
    if (!modelRef.current || !spaceshipRef.current) return
    
    // Access state directly inside useFrame for high-frequency updates (raceTime)
    const { raceTime, playerInvulnerableUntil } = useGameStore.getState()
    
    // Sync model position and rotation with the spaceship controller
    modelRef.current.position.copy(spaceshipRef.current.position)
    modelRef.current.rotation.copy(spaceshipRef.current.rotation)
    
    // --- Invulnerability Blinking Effect ---
    const isInvulnerable = raceTime < playerInvulnerableUntil;

    if (isInvulnerable) {
      // Toggle visibility every 0.1 seconds
      const blinkFrequency = 0.1;
      const isVisible = (Math.floor(raceTime / blinkFrequency) % 2) === 0;
      modelRef.current.visible = isVisible;
    } else {
      // Ensure visibility is always true when not invulnerable
      modelRef.current.visible = true;
    }
    
    // Update weapon system player position to match the visible model
    if ((window as any).__weaponSystemRefs) {
      (window as any).__weaponSystemRefs.playerPosition.copy(spaceshipRef.current.position)
    }
  })
  
  // Model visibility is now controlled inside useFrame using modelRef.current.visible.
  // We only return null if the camera view is not third-person.
  if (cameraView !== 'third-person') return null
  
  return (
    <group ref={modelRef}>
      {/* Actual spaceship model with size-based scale and correct orientation */}
      {/* Scale: 0.5 makes MEDIUM ship ~1.125 gu ≈ 270m (Titanic-sized) */}
      <primitive 
        object={clonedScene} 
        scale={0.5 * sizeConfig.scale}
        rotation={[0, -Math.PI / 2, 0]}
      />
      
      {/* Intense lighting from all directions to make ship highly visible */}
      <pointLight position={[0, 10, 0]} intensity={15} distance={50} color="#ffffff" />
      <pointLight position={[0, -10, 0]} intensity={10} distance={50} color="#00ccff" />
      <pointLight position={[15, 0, 0]} intensity={10} distance={50} color="#ffffff" />
      <pointLight position={[-15, 0, 0]} intensity={10} distance={50} color="#ffffff" />
      <pointLight position={[0, 0, 15]} intensity={10} distance={50} color="#ffffff" />
      <pointLight position={[0, 0, -15]} intensity={10} distance={50} color="#00ccff" />
      
      {/* Additional directional lighting for better visibility */}
      <directionalLight 
        position={[0, 20, 0]} 
        intensity={3} 
        color="#ffffff"
      />
      <directionalLight 
        position={[0, -20, 0]} 
        intensity={2} 
        color="#00ccff"
      />
    </group>
  )
}

// Preload the model
useGLTF.preload('/racing-spaceship.glb')