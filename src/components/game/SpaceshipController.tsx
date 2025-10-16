import { useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from '@/hooks/useControls'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'

export const SpaceshipController = forwardRef<THREE.Group>((_, ref) => {
  const controls = useControls()
  const velocity = useRef(new THREE.Vector3(0, 0, 0)).current

  // Only subscribe to state that affects component logic outside of useFrame
  const gameState = useGameStore((state) => state.gameState);
  const isRaceStarted = useGameStore((state) => state.isRaceStarted);

  const checkFinishCollision = (position: THREE.Vector3) => {
    const finishZ = -GAME_CONSTANTS.RACE_DISTANCE;
    const finishRadius = GAME_CONSTANTS.FINISH_DISK_RADIUS;
    
    // Check if the spaceship has reached the finish line Z position
    if (position.z <= finishZ && isRaceStarted && gameState === 'playing') {
        // Check if within the finish disk radius
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.y * position.y);
        if (distanceFromCenter <= finishRadius) {
          const raceTime = useGameStore.getState().raceTime;
          useGameStore.getState().finishRace(raceTime);
        }
    }
  }

  useFrame((state, delta) => {
    if (!ref || !('current' in ref) || !ref.current) {
      return;
    }
    const spaceship = ref.current;
    
    // Get frequently updated state and setters inside useFrame
    const { speed, setRaceTime, setSpeed, setDistanceToFinish, aiStandings, setPlayerPosition } = useGameStore.getState();

    // Update Race Timer and Distance
    if (isRaceStarted && gameState === 'playing') {
      setRaceTime((prev) => prev + delta);
      
      // Update distance to finish
      const finishZ = -GAME_CONSTANTS.RACE_DISTANCE;
      const distance = Math.max(0, Math.abs(spaceship.position.z - finishZ));
      setDistanceToFinish(distance);
      
      // Calculate player position based on distance compared to AI
      let position = 1;
      aiStandings.forEach(ai => {
        if (ai.distance < distance) {
          position++;
        }
      });
      setPlayerPosition(position);
    }

    // Only allow movement when playing (not during countdown or other states)
    if (gameState === 'playing') {
        // --- Speed and Acceleration ---
        let targetSpeed = speed;
        const acceleration = GAME_CONSTANTS.ACCELERATION * delta;
        
        if (controls.forward) {
          targetSpeed += acceleration;
          if (controls.boost) {
            targetSpeed += acceleration * GAME_CONSTANTS.BOOST_MULTIPLIER;
          }
        }
        if (controls.backward) targetSpeed -= acceleration * 0.5;
        if (controls.brake) targetSpeed *= (1 - GAME_CONSTANTS.BRAKE_FORCE * delta);
        
        // Reduced natural damping - only when not accelerating
        if (!controls.forward) {
          targetSpeed *= (1 - 0.3 * delta);
        }

        targetSpeed = Math.max(0, Math.min(GAME_CONSTANTS.MAX_SPEED, targetSpeed));
        setSpeed(targetSpeed);

        // --- Rotation ---
        const rotationSpeed = GAME_CONSTANTS.ROTATION_SPEED;
        const keyboardRotationSpeed = rotationSpeed * 60 * delta; // Normalized for 60fps
        const mouseSensitivity = 0.002; // Sensitivity for mouse delta

        // Keyboard rotation - direct control
        if (controls.left) {
          spaceship.rotation.y += keyboardRotationSpeed;
        }
        if (controls.right) {
          spaceship.rotation.y -= keyboardRotationSpeed;
        }
        if (controls.up) {
          spaceship.rotation.x -= keyboardRotationSpeed;
        }
        if (controls.down) {
          spaceship.rotation.x += keyboardRotationSpeed;
        }

        // Mouse rotation - relative movement with smoothing
        const maxMouseDelta = 100; // Prevent extreme values
        if (Math.abs(controls.mouseDeltaX) < maxMouseDelta && Math.abs(controls.mouseDeltaY) < maxMouseDelta) {
          if (controls.mouseDeltaX !== 0 || controls.mouseDeltaY !== 0) {
            spaceship.rotation.y -= controls.mouseDeltaX * mouseSensitivity;
            spaceship.rotation.x -= controls.mouseDeltaY * mouseSensitivity;
          }
        }

        // Clamp pitch to prevent extreme flipping but allow more freedom
        spaceship.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, spaceship.rotation.x));
        
        // Gentler auto-leveling - only when not actively controlling
        const isActivelyPitching = controls.up || controls.down || Math.abs(controls.mouseDeltaY) > 0.5;
        if (!isActivelyPitching && !controls.forward) {
          // Gentle damping to return to level flight
          spaceship.rotation.x = THREE.MathUtils.damp(spaceship.rotation.x, 0, 3, delta);
        }
        
        // Ensure rotation values are valid (prevent NaN)
        if (!isFinite(spaceship.rotation.x)) spaceship.rotation.x = 0;
        if (!isFinite(spaceship.rotation.y)) spaceship.rotation.y = 0;
        if (!isFinite(spaceship.rotation.z)) spaceship.rotation.z = 0;

        // --- Position ---
        const direction = new THREE.Vector3();
        spaceship.getWorldDirection(direction);
        
        // Invert direction so forward movement goes into the star field (negative Z)
        direction.negate();
        
        // Constrain movement to XZ plane to prevent vertical drift
        direction.y = 0;
        direction.normalize();
        
        velocity.copy(direction).multiplyScalar(targetSpeed * delta);
        spaceship.position.add(velocity);
        
        // Keep spaceship at a consistent height (prevent sinking or floating)
        const targetHeight = 0;
        spaceship.position.y = THREE.MathUtils.lerp(spaceship.position.y, targetHeight, 0.1);

        // Check for finish
        checkFinishCollision(spaceship.position);
    }

    // --- Camera Follow ---
    const idealOffset = new THREE.Vector3(0, 2, 5); // Camera behind and slightly above
    idealOffset.applyQuaternion(spaceship.quaternion);
    const idealLookat = new THREE.Vector3(0, 0, -10);
    idealLookat.applyQuaternion(spaceship.quaternion);
    idealLookat.add(spaceship.position);

    const cameraPosition = new THREE.Vector3();
    cameraPosition.copy(spaceship.position).add(idealOffset);

    // Faster camera follow for more responsive controls
    state.camera.position.lerp(cameraPosition, 0.2);
    state.camera.lookAt(idealLookat);
  })

  return null
})