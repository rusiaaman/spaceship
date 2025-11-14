/**
 * Remote AI ship component (for peers to render host's AI)
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AIState } from '@/network/protocol';

interface RemoteAIShipProps {
  aiState: AIState;
}

export function RemoteAIShip({ aiState }: RemoteAIShipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const targetRotation = useRef(new THREE.Euler());

  // Update target position from network state
  useEffect(() => {
    if (aiState.position) {
      targetPosition.current.set(
        aiState.position[0],
        aiState.position[1],
        aiState.position[2]
      );
    }
    if (aiState.rotation) {
      targetRotation.current.set(
        aiState.rotation[0],
        aiState.rotation[1],
        aiState.rotation[2]
      );
    }
  }, [aiState.position, aiState.rotation]);

  // Interpolate to target position for smooth movement
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Interpolate position
    groupRef.current.position.lerp(targetPosition.current, Math.min(delta * 10, 1));

    // Interpolate rotation
    const currentRotation = groupRef.current.rotation;
    currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.current.x, Math.min(delta * 10, 1));
    currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.current.y, Math.min(delta * 10, 1));
    currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.current.z, Math.min(delta * 10, 1));
  });

  if (aiState.isDestroyed) {
    return null; // Don't render destroyed AI
  }

  return (
    <group ref={groupRef}>
      {/* Simple AI ship representation */}
      <mesh>
        <coneGeometry args={[1, 3, 8]} />
        <meshStandardMaterial 
          color="#ff4444" 
          emissive="#ff4444"
          emissiveIntensity={aiState.isInvulnerable ? 1.0 : 0.3}
        />
      </mesh>
      
      {/* Health bar */}
      {aiState.health < aiState.maxHealth && (
        <group position={[0, 3, 0]}>
          {/* Background */}
          <mesh position={[0, 0, 0.1]}>
            <planeGeometry args={[2, 0.2]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          {/* Health fill */}
          <mesh position={[-(1 - (aiState.health / aiState.maxHealth)), 0, 0.2]}>
            <planeGeometry args={[(aiState.health / aiState.maxHealth) * 2, 0.2]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </group>
      )}
    </group>
  );
}