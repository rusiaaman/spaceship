/**
 * Remote player spaceship component
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RemotePlayer as RemotePlayerType } from '@/multiplayer/MultiplayerGameStore';

// Reusable texture generator for the dot
const getShipDotTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

interface RemotePlayerProps {
  player: RemotePlayerType;
}

export function RemotePlayer({ player }: RemotePlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const targetRotation = useRef(new THREE.Euler());

  // Refs for the distant dot
  const dotRef = useRef<THREE.Points>(null);
  const dotMaterialRef = useRef<THREE.PointsMaterial>(null);

  const { camera } = useThree();

  // Generate texture and geometry once
  const shipDotTexture = useMemo(() => getShipDotTexture(), []);
  const dotGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
    return geo
  }, []);

  // Ship size proxy for visibility calculation
  const SHIP_VISUAL_RADIUS_PROXY = 2.5;
  const FADE_START = SHIP_VISUAL_RADIUS_PROXY * 2000;
  const FADE_END = SHIP_VISUAL_RADIUS_PROXY * 200;

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

  // Interpolate to target position for smooth movement and handle dot visibility
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Interpolate position
    groupRef.current.position.lerp(targetPosition.current, Math.min(delta * 10, 1));

    // Interpolate rotation
    const currentRotation = groupRef.current.rotation;
    currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.current.x, Math.min(delta * 10, 1));
    currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.current.y, Math.min(delta * 10, 1));
    currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.current.z, Math.min(delta * 10, 1));

    // Ship Dot / Visibility Logic
    if (dotMaterialRef.current && dotRef.current) {
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      const dist = camera.position.distanceTo(worldPos);

      let opacity = 0;
      let modelVisible = true;

      if (dist > FADE_START) {
        opacity = 1.0;
        modelVisible = false; // Model should be hidden when dot is fully visible
      } else if (dist > FADE_END) {
        opacity = (dist - FADE_END) / (FADE_START - FADE_END);
        modelVisible = opacity < 0.5; // Hide model when dot starts to take over
      }

      // The actual mesh is the first child of the group (index 0)
      const shipMesh = groupRef.current.children[0];
      if (shipMesh instanceof THREE.Mesh) {
        shipMesh.visible = modelVisible;
      }

      dotMaterialRef.current.opacity = opacity;
      dotRef.current.visible = opacity > 0.01;

      // Ensure sorting is correct for transparent objects
      dotMaterialRef.current.depthWrite = false;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Screen-space Dot for distant visibility */}
      <points ref={dotRef} geometry={dotGeometry}>
        <pointsMaterial
          ref={dotMaterialRef}
          map={shipDotTexture}
          size={5} // Smaller size than planet dot (planets use 8)
          sizeAttenuation={false} // Constant screen size
          color={new THREE.Color("#00ffff")} // Match ship label color
          transparent={true}
          opacity={1}
          depthWrite={false}
          depthTest={true} 
          blending={THREE.AdditiveBlending}
        />
      </points>

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