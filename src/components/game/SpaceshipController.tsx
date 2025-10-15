import { useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from '@/hooks/useControls'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'

export const SpaceshipController = forwardRef<THREE.Group>((_, ref) => {
  const controls = useControls()
  const velocity = useRef(new THREE.Vector3(0, 0, 0)).current
  const rotationVelocity = useRef(new THREE.Vector3(0, 0, 0)).current

  // Only subscribe to state that affects component logic outside of useFrame
  const gameState = useGameStore((state) => state.gameState);
  const isRaceStarted = useGameStore((state) => state.isRaceStarted);

  const checkFinishCollision = (position: THREE.Vector3) => {
    const finishZ = -GAME_CONSTANTS.RACE_DISTANCE;
    
    // Check if the spaceship has passed the finish line (z < finishZ)
    if (position.z < finishZ && isRaceStarted && gameState === 'playing') {
        const raceTime = useGameStore.getState().raceTime;
        useGameStore.getState().finishRace(raceTime);
    }
  }

  useFrame((state, delta) => {
    if (!ref || !('current' in ref) || !ref.current) {
      return;
    }
    const spaceship = ref.current;
    
    // Get frequently updated state and setters inside useFrame
    const { speed, setRaceTime, setSpeed } = useGameStore.getState();

    // Update Race Timer
    if (isRaceStarted && gameState === 'playing') {
      setRaceTime((prev) => prev + delta);
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
        if (controls.backward) targetSpeed -= acceleration;
        if (controls.brake) targetSpeed *= (1 - GAME_CONSTANTS.BRAKE_FORCE * delta);
        
        // Natural damping
        targetSpeed *= (1 - 0.1 * delta);

        targetSpeed = Math.max(0, Math.min(GAME_CONSTANTS.MAX_SPEED, targetSpeed));
        setSpeed(targetSpeed);

        // --- Rotation ---
        const rotationSpeed = GAME_CONSTANTS.ROTATION_SPEED * delta;

        // Keyboard rotation
        if (controls.left) rotationVelocity.y += rotationSpeed;
        if (controls.right) rotationVelocity.y -= rotationSpeed;
        if (controls.up) rotationVelocity.x += rotationSpeed;
        if (controls.down) rotationVelocity.x -= rotationSpeed;

        // Mouse rotation
        const mouseSensitivity = 2;
        rotationVelocity.y -= controls.mouseX * rotationSpeed * mouseSensitivity;
        rotationVelocity.x += controls.mouseY * rotationSpeed * mouseSensitivity;
        
        // Damping
        rotationVelocity.multiplyScalar(1 - 3 * delta); // Frame-rate independent damping

        // Apply rotation
        spaceship.rotation.x += rotationVelocity.x;
        spaceship.rotation.y += rotationVelocity.y;

        // Clamp pitch
        spaceship.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, spaceship.rotation.x));

        // --- Position ---
        const direction = new THREE.Vector3();
        spaceship.getWorldDirection(direction);
        
        velocity.copy(direction).multiplyScalar(targetSpeed * delta);
        spaceship.position.add(velocity);

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

    // Smoothly move camera to ideal position and look at point
    state.camera.position.lerp(cameraPosition, 0.1);
    state.camera.lookAt(idealLookat);
  })

  return null
})