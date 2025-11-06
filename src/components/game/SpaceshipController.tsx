import { useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from '@/hooks/useControls'
import { useGameStore } from '@/store/gameStore'
import { GAME_CONSTANTS } from '@/utils/constants'
import { profiler } from '@/utils/profiler'
import { ShipState, BitFlagUtils } from '@/utils/BitFlags'
import { soundManager } from '@/utils/soundManager'

export const SpaceshipController = forwardRef<THREE.Group>((_, ref) => {
  const controls = useControls()
  const velocity = useRef(new THREE.Vector3(0, 0, 0)).current
  const lastShootStateRef = useRef(false)
  const lastToggleCameraStateRef = useRef(false)

  // Only subscribe to state that affects component logic outside of useFrame
  const gameState = useGameStore(state => state.gameState);
  const isRaceStarted = useGameStore(state => state.isRaceStarted);
  const cameraView = useGameStore(state => state.cameraView);

  const checkFinishCollision = (position: THREE.Vector3) => {
    const finishZ = -GAME_CONSTANTS.RACE_DISTANCE;
    const finishRadius = GAME_CONSTANTS.FINISH_DISK_RADIUS;
    
    // Check if the spaceship has reached the finish line Z position
    if (position.z <= finishZ && isRaceStarted && gameState === 'playing') {
        // Check if within the finish disk radius
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.y * position.y);
        if (distanceFromCenter <= finishRadius) {
      const raceTime = useGameStore.getState().raceTime;
          soundManager.playSound('victory')
          useGameStore.getState().finishRace(raceTime);
        }
    }
  }

  // Use ref to track last collected booster to prevent multiple collections
  const lastCollectedBoosterRef = useRef<number>(-1)
  const collectionCooldownRef = useRef<number>(0)
  
  const checkBoosterCollision = (position: THREE.Vector3, currentTime: number) => {
    // Cooldown to prevent rapid re-collection
    if (currentTime - collectionCooldownRef.current < 0.5) return
    
    const { BOOSTER_RADIUS, BOOSTER_RING_RADIUS, BOOSTER_DURATION } = GAME_CONSTANTS
    const { collectedBoosters, collectBooster, activateBoost, spatialIndices } = useGameStore.getState()
    
    // Use spatial index for O(log n) booster proximity check
    // Use a wider radius for the initial query to ensure we don't miss boosters
    const nearbyBoosters = spatialIndices.boosters.queryRadius(position, BOOSTER_RING_RADIUS * 1.5)
    
    for (const booster of nearbyBoosters) {
      const boosterId = booster.id as number
      
      if (collectedBoosters.has(boosterId) || lastCollectedBoosterRef.current === boosterId) continue
      
      const distance = position.distanceTo(booster.position)
      
      // Use a slightly relaxed threshold to avoid misses at speed
      if (distance < BOOSTER_RADIUS + 3) {
        console.log('🚀 Booster collected!', boosterId, 'at time:', currentTime)
        soundManager.playSound('boost-collect')
        lastCollectedBoosterRef.current = boosterId
        collectionCooldownRef.current = currentTime
        
        // Remove from spatial index first
        spatialIndices.boosters.remove(boosterId)
        // Rebuild immediately so subsequent queries don't see this booster
        spatialIndices.boosters.rebuild()
        
        // Batch the state updates
        collectBooster(boosterId)
        activateBoost(BOOSTER_DURATION)
        
        console.log('✅ Boost activated! Duration:', BOOSTER_DURATION, 'End time:', currentTime + BOOSTER_DURATION)
        
        break
      }
    }
  }

  useFrame((state, delta) => {
    profiler.start('SpaceshipController.frame')
    
    if (!ref || !('current' in ref) || !ref.current) {
      profiler.end('SpaceshipController.frame')
      return;
    }
    const spaceship = ref.current;
    
    // Update player position for weapon system
    if ((window as any).__weaponSystemRefs) {
      (window as any).__weaponSystemRefs.playerPosition.copy(spaceship.position)
    }
    
    // Get frequently updated state and setters inside useFrame
    const { speed, setRaceTime, setSpeed, setDistanceToFinish, aiStandings, setPlayerPosition, playerState, boostEndTime, deactivateBoost, raceTime, fireProjectile, maxSpeed } = useGameStore.getState();
    
    // Update engine sound based on speed
    soundManager.updateEngineSound(speed, maxSpeed, BitFlagUtils.has(playerState, ShipState.BOOSTING))

    // Check if boost should end - always check this every frame
    const isBoosting = BitFlagUtils.has(playerState, ShipState.BOOSTING)
    if (isBoosting) {
      console.log('⚡ Boosting active! Race time:', raceTime, 'Boost end time:', boostEndTime)
    }
    if (isBoosting && boostEndTime > 0 && raceTime >= boostEndTime) {
      console.log('🛑 Boost ended at:', raceTime)
      deactivateBoost()
    }

    // Update Race Timer and Distance
    if (isRaceStarted && gameState === 'playing') {
      setRaceTime((prev: number) => prev + delta);
      
      // Update distance to finish (throttled)
      const finishZ = -GAME_CONSTANTS.RACE_DISTANCE;
      const distance = Math.max(0, Math.abs(spaceship.position.z - finishZ));
      setDistanceToFinish(distance);
      
      // Calculate player position less frequently (every 15 frames for better performance)
      if (Math.floor(raceTime * 60) % 15 === 0) {
        let position = 1;
        const aiCount = aiStandings.length;
        for (let i = 0; i < aiCount; i++) {
          if (aiStandings[i].distance < distance) {
            position++;
          }
        }
        setPlayerPosition(position);
      }
    }

    // Only allow movement when playing (not during countdown or other states)
    if (gameState === 'playing') {
        profiler.start('SpaceshipController.movement')
        
        // --- Camera Toggle ---
        // Only toggle on the transition (edge trigger)
        if (controls.toggleCamera && !lastToggleCameraStateRef.current) {
          useGameStore.getState().toggleCameraView()
        }
        lastToggleCameraStateRef.current = controls.toggleCamera
        
        // --- Shooting ---
        // Fire continuously while shoot button is held (allows burst shooting)
        if (controls.shoot) {
          profiler.start('SpaceshipController.shooting')
          const direction = new THREE.Vector3()
          spaceship.getWorldDirection(direction)
          direction.negate() // Forward direction
          
          const spawnOffset = direction.clone().multiplyScalar(5)
          const spawnPosition = spaceship.position.clone().add(spawnOffset)
          
          soundManager.playSound('weapon-fire')
          fireProjectile(spawnPosition, direction, true)
          profiler.end('SpaceshipController.shooting')
        }
        lastShootStateRef.current = controls.shoot
        // --- Speed and Acceleration ---
        profiler.start('SpaceshipController.speedCalc')
        let targetSpeed = speed;
        const acceleration = GAME_CONSTANTS.ACCELERATION * delta;
        
        // Apply booster speed multiplier if active
        const speedMultiplier = isBoosting ? GAME_CONSTANTS.BOOSTER_SPEED_MULTIPLIER : 1
        
        if (controls.forward) {
          targetSpeed += acceleration * speedMultiplier;
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

        // Apply speed cap with boost multiplier
        const maxSpeedWithBoost = GAME_CONSTANTS.MAX_SPEED * speedMultiplier;
        targetSpeed = Math.max(0, Math.min(maxSpeedWithBoost, targetSpeed));
        setSpeed(targetSpeed);
        profiler.end('SpaceshipController.speedCalc')

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

        // Check for booster collision every frame for responsive detection
        if (isRaceStarted) {
          profiler.start('SpaceshipController.boosterCheck')
          const projectedPos = spaceship.position.clone().add(direction.clone().multiplyScalar(5));
          checkBoosterCollision(projectedPos, raceTime);
          profiler.end('SpaceshipController.boosterCheck')
        }

        // Check for finish
        checkFinishCollision(spaceship.position);
        
        profiler.end('SpaceshipController.movement')
    }

    // --- Camera Follow ---
    // Different camera positions based on view mode
    const idealOffset = cameraView === 'first-person' 
      ? new THREE.Vector3(0, 2, 5)      // Close first-person view
      : new THREE.Vector3(0, 8, 20);    // Wider third-person view
    
    idealOffset.applyQuaternion(spaceship.quaternion);
    
    const idealLookat = new THREE.Vector3(0, 0, -10);
    idealLookat.applyQuaternion(spaceship.quaternion);
    idealLookat.add(spaceship.position);

    const cameraPosition = new THREE.Vector3();
    cameraPosition.copy(spaceship.position).add(idealOffset);

    // Faster camera follow for more responsive controls
    state.camera.position.lerp(cameraPosition, 0.2);
    state.camera.lookAt(idealLookat);
    
    profiler.end('SpaceshipController.frame')
  })

  return null
})