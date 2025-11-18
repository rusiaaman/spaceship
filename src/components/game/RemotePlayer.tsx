/**
 * Remote player spaceship component
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RemotePlayer as RemotePlayerType } from '@/multiplayer/MultiplayerGameStore';

interface RemotePlayerProps {
  player: RemotePlayerType;
}

export function RemotePlayer({ player }: RemotePlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const targetRotation = useRef(new THREE.Euler());

  // Update target position from network state
  useEffect(() => {
    if (player.state.position) {
      targetPosition.current.set(
        player.state.position[0],
        player.state.position[1],
        player.state.position[2]
      );
    }
    if (player.state.rotation) {
      targetRotation.current.set(
        player.state.rotation[0],
        player.state.rotation[1],
        player.state.rotation[2]
      );
    }
  }, [player.state.position, player.state.rotation]);

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

  return (
    <group ref={groupRef}>
      {/* TODO: Add proper remote player ship model */}
      <mesh>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial 
          color="#00aaff" 
          emissive="#00aaff"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      
      {/* Player name label */}
      <mesh position={[0, 8, 0]}>
        <planeGeometry args={[6, 1]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
      </mesh>
      
      {/* Health bar */}
      {player.state.health < player.state.maxHealth && (
        <group position={[0, 7, 0]}>
          {/* Background */}
          <mesh position={[0, 0, 0.1]}>
            <planeGeometry args={[4, 0.3]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          {/* Health fill */}
          <mesh position={[-(2 - (player.state.health / player.state.maxHealth) * 2), 0, 0.2]}>
            <planeGeometry args={[(player.state.health / player.state.maxHealth) * 4, 0.3]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        </group>
      )}
    </group>
  );
}