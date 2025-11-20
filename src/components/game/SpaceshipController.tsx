import { useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from '@/hooks/useControls'
import { useGameStore } from '@/store/gameStore'
import { useMultiplayerStore } from '@/multiplayer/MultiplayerGameStore'
import { getMultiplayerController } from '@/multiplayer/MultiplayerController'
import { GAME_CONSTANTS } from '@/utils/constants'
import { SOLAR_CONSTANTS, PLANETARY_POSITIONS } from '@/utils/solarSystemData'
import { profiler } from '@/utils/profiler'
import { ShipState, BitFlagUtils } from '@/utils/BitFlags'
import { soundManager } from '@/utils/soundManager'

export const SpaceshipController = forwardRef<THREE.Group>((_, ref) => {
  const controls = useControls()
  const velocity = useRef(new THREE.Vector3(0, 0, 0)).current
  const lastShootStateRef = useRef(false)
  const lastToggleCameraStateRef = useRef(false)
  // Maintain local high-precision speed state to allow for microscopic acceleration
  const currentSpeedRef = useRef(0)

  // Only subscribe to state that affects component logic outside of useFrame
  const gameState = useGameStore(state => state.gameState);
  const isRaceStarted = useGameStore(state => state.isRaceStarted);
  const cameraView = useGameStore(state => state.cameraView);
  const getPlayerSizeConfig = useGameStore(state => state.getPlayerSizeConfig);

  const checkFinishCollision = (position: THREE.Vector3) => {
    // Check collision with Neptune sphere (1000km from surface)
    const neptunePos = new THREE.Vector3(
      PLANETARY_POSITIONS.neptune.x,
      PLANETARY_POSITIONS.neptune.y,
      PLANETARY_POSITIONS.neptune.z
    )
    
    // Calculate distance to Neptune's center
    const distanceToNeptune = position.distanceTo(neptunePos)
    
    // Finish at 1000km from Neptune surface (106,759 gu from center)
    if (distanceToNeptune <= GAME_CONSTANTS.FINISH_NEPTUNE_THRESHOLD && isRaceStarted && gameState === 'playing') {
      const raceTime = useGameStore.getState().raceTime;
      soundManager.playSound('victory')
      useGameStore.getState().finishRace(raceTime);
    }
  }

  const collectionCooldownRef = useRef<number>(0)

  const checkBoosterCollision = (position: THREE.Vector3, currentTime: number) => {
    // Cooldown to prevent rapid re-collection
    if (currentTime - collectionCooldownRef.current < 0.5) return

    const { BOOSTER_RADIUS, BOOSTER_RING_RADIUS, BOOSTER_DURATION } = GAME_CONSTANTS
    const { activateBoost, spatialIndices, refillAmmo } = useGameStore.getState() // Added refillAmmo

    // Use spatial index for O(log n) booster proximity check
    // Use a wider radius for the initial query to ensure we don't miss boosters at high speeds
    const nearbyBoosters = spatialIndices.boosters.queryRadius(position, BOOSTER_RING_RADIUS * 2)

    for (const booster of nearbyBoosters) {
      const boosterId = booster.id as number

      // Skip checks for collectedBoosters/lastCollectedBoosterRef - now handled solely by collectionCooldownRef

      const distance = position.distanceTo(booster.position)

      // Collision detection with solar-scale radius
      if (distance < BOOSTER_RADIUS) {
        console.log('🚀 Booster re-used!', boosterId, 'at time:', currentTime)
        soundManager.playSound('boost-collect')
        collectionCooldownRef.current = currentTime

        // Apply the effect: activate boost and refill ammo (the previous side effect of collection)
        activateBoost(BOOSTER_DURATION)
        refillAmmo()

        console.log('✅ Boost activated and Ammo refilled! Duration:', BOOSTER_DURATION, 'End time:', currentTime + BOOSTER_DURATION)

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

    // Send inputs to multiplayer controller
    const multiplayerStore = useMultiplayerStore.getState();
    if (multiplayerStore.isMultiplayer && !multiplayerStore.isHost) {
      const controller = getMultiplayerController();
      controller.update(delta, controls);
    }
    
    // Get frequently updated state and setters inside useFrame
    const { setRaceTime, setSpeed, setDistanceToFinish, playerState, boostEndTime, deactivateBoost, raceTime, fireProjectile, maxSpeed, playerAmmo, checkPlayerRespawn } = useGameStore.getState();
    
    // Use local ref for physics calculations
    let targetSpeed = currentSpeedRef.current;

    // Update engine sound based on speed
    soundManager.updateEngineSound(targetSpeed, maxSpeed, BitFlagUtils.has(playerState, ShipState.BOOSTING))

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
      
      // Check if player needs to transition from RESPAWNING to ACTIVE after delay
      checkPlayerRespawn(raceTime);
      
      // Update distance to finish - distance to Neptune center
      const neptunePos = new THREE.Vector3(
        PLANETARY_POSITIONS.neptune.x,
        PLANETARY_POSITIONS.neptune.y,
        PLANETARY_POSITIONS.neptune.z
      )
      const distance = Math.max(0, spaceship.position.distanceTo(neptunePos))
      setDistanceToFinish(distance);
      

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
        if (controls.shoot && playerAmmo > 0) {
          profiler.start('SpaceshipController.shooting')
          // Use local forward direction for shooting
          const shootDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(spaceship.quaternion)
          
          // Use a spawn offset larger than SHIP_COLLISION_RADIUS (6 units) to prevent self-collision on fire
          const spawnOffset = shootDirection.clone().multiplyScalar(8)
          const spawnPosition = spaceship.position.clone().add(spawnOffset)
          
          soundManager.playSound('weapon-fire')
          fireProjectile(spawnPosition, shootDirection, true)
          profiler.end('SpaceshipController.shooting')
        }
        lastShootStateRef.current = controls.shoot
        
        // Get ship size configuration for mass and maneuverability
        const sizeConfig = getPlayerSizeConfig()
        
    // --- Speed and Acceleration ---
        profiler.start('SpaceshipController.speedCalc')
        // Local speed variable initialized from Ref above
        
        const absSpeed = Math.abs(targetSpeed);
        const massFactor = 1.0 / Math.max(0.1, sizeConfig.mass);

        // Determine max speed capacity
        let currentMaxSpeed = sizeConfig.maxSpeed;
        const speedMultiplier = isBoosting ? GAME_CONSTANTS.BOOSTER_SPEED_MULTIPLIER : 1.0;
        currentMaxSpeed *= speedMultiplier;

        // Exponential Acceleration Logic (0 -> 10 -> 100 -> 1000...)
        if (controls.forward) {
          // Logistic Growth: (Base + v*k) * (1 - v/max)
          const growthRate = GAME_CONSTANTS.LOG_GROWTH_RATE;
          const baseAccel = GAME_CONSTANTS.LOG_BASE_ACCEL;
          
          const headroom = Math.max(0, 1 - (absSpeed / currentMaxSpeed));
          
          let instantaneousAccel = (baseAccel + absSpeed * growthRate) * headroom * massFactor;
          
          if (controls.boost) {
            instantaneousAccel *= GAME_CONSTANTS.BOOST_MULTIPLIER;
          }
          
          targetSpeed += instantaneousAccel * delta;
        }

        // Exponential Backward/Reverse
        if (controls.backward) {
          const growthRate = GAME_CONSTANTS.LOG_GROWTH_RATE;
          const baseAccel = GAME_CONSTANTS.LOG_BASE_ACCEL;
          
          // Only limit reverse acceleration if we are actually moving backward approaching the limit
          let headroom = 1.0;
          if (targetSpeed < 0) {
            const reverseMax = Math.abs(GAME_CONSTANTS.MIN_SPEED);
            headroom = Math.max(0, 1 - (absSpeed / reverseMax));
          }
          
          const instantaneousAccel = (baseAccel + absSpeed * growthRate) * headroom * massFactor * 0.8;
          
          targetSpeed -= instantaneousAccel * delta;
        }

        // Exponential Braking (Deceleration)
        if (controls.brake) {
           const decayRate = GAME_CONSTANTS.BRAKE_FORCE;
           // Use logical base brake proportional to base accel scale + minimum stop force
           const baseBrake = (GAME_CONSTANTS.LOG_BASE_ACCEL * 10 + 1e-9) * massFactor;
           
           const brakePower = (baseBrake + absSpeed * decayRate) * delta;
           
           if (targetSpeed > 0) targetSpeed = Math.max(0, targetSpeed - brakePower);
           else if (targetSpeed < 0) targetSpeed = Math.min(0, targetSpeed + brakePower);
        }
        
        // No natural damping - space has no air resistance!

        // Clamp speed
        targetSpeed = Math.max(GAME_CONSTANTS.MIN_SPEED, Math.min(currentMaxSpeed, targetSpeed));
        
        // Sync local state
        currentSpeedRef.current = targetSpeed;
        setSpeed(targetSpeed);
        profiler.end('SpaceshipController.speedCalc')

        // --- Rotation ---
        // Apply maneuverability multiplier based on ship size
        const rotationSpeed = GAME_CONSTANTS.ROTATION_SPEED * sizeConfig.maneuverability;
        const keyboardRotationSpeed = rotationSpeed * 60 * delta; // Normalized for 60fps
        const mouseSensitivity = 0.002; // Sensitivity for mouse delta

        // Yaw rotation (left/right) - always around world Y axis
        let yawDelta = 0;
        if (controls.left) {
          yawDelta += keyboardRotationSpeed;
        }
        if (controls.right) {
          yawDelta -= keyboardRotationSpeed;
        }
        if (Math.abs(controls.mouseDeltaX) < 100) {
          yawDelta -= controls.mouseDeltaX * mouseSensitivity;
        }
        
        if (yawDelta !== 0) {
          spaceship.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), yawDelta);
        }

        // Pitch rotation (up/down) - around local X axis for consistent behavior
        let pitchDelta = 0;
        if (controls.up) {
          pitchDelta -= keyboardRotationSpeed;
        }
        if (controls.down) {
          pitchDelta += keyboardRotationSpeed;
        }
        if (Math.abs(controls.mouseDeltaY) < 100) {
          pitchDelta -= controls.mouseDeltaY * mouseSensitivity;
        }
        
        if (pitchDelta !== 0) {
          // Apply pitch rotation around local X axis
          const localXAxis = new THREE.Vector3(1, 0, 0);
          spaceship.rotateOnAxis(localXAxis, pitchDelta);
        }

        // Clamp pitch to prevent extreme flipping (Increased range to allow looking down)
        // Extract pitch from quaternion to clamp it properly
        const euler = new THREE.Euler().setFromQuaternion(spaceship.quaternion, 'YXZ');
        // Allow almost 90 degrees (PI/2 is ~1.57)
        euler.x = Math.max(-1.5, Math.min(1.5, euler.x));
        spaceship.quaternion.setFromEuler(euler);
        
        // Auto-leveling removed to allow smooth looking around without forced tilting
        
        // --- Position ---
        // Use local forward direction (always -Z in local space) for consistent controls
        // This fixes the issue where controls invert when facing backwards
        const localForward = new THREE.Vector3(0, 0, -1);
        const worldDirection = localForward.applyQuaternion(spaceship.quaternion);
        
        // The previous constraint (worldDirection.y = 0) and normalization are removed
        // to allow for 3D movement based on pitch rotation.
        
        // Convert game speed to actual movement speed in game units/second
        // Speed 100 should move 375 game units/second for a ~4 minute race to Neptune
        const actualSpeed = SOLAR_CONSTANTS.gameSpeedToUnitsPerSec(targetSpeed);
        velocity.copy(worldDirection).multiplyScalar(actualSpeed * delta);
        spaceship.position.add(velocity);
        
        // The previous vertical damping (spaceship.position.y = ...) is removed
        // to allow the ship to fly up and down freely.

        // Check for booster collision every frame for responsive detection
        if (isRaceStarted) {
          profiler.start('SpaceshipController.boosterCheck')
          const projectedPos = spaceship.position.clone().add(worldDirection.clone().multiplyScalar(5));
          checkBoosterCollision(projectedPos, raceTime);
          profiler.end('SpaceshipController.boosterCheck')
        }

        // Check for finish
        checkFinishCollision(spaceship.position);
        
        profiler.end('SpaceshipController.movement')
    }

    // --- Camera Follow ---
    // Only update camera during gameplay (not during camera-sweep or countdown)
    if (gameState === 'playing') {
      // Different camera positions based on view mode
      // Adjusted for new ship scale (0.5x smaller ships)
      const idealOffset = cameraView === 'first-person' 
        ? new THREE.Vector3(0, 0.15, 0.3)      // Very close first-person view
        : new THREE.Vector3(0, 0.5, 1.5);      // Close third-person view
      
      idealOffset.applyQuaternion(spaceship.quaternion);
      
      const idealLookat = new THREE.Vector3(0, 0, -0.5);
      idealLookat.applyQuaternion(spaceship.quaternion);
      idealLookat.add(spaceship.position);

      const cameraPosition = new THREE.Vector3();
      cameraPosition.copy(spaceship.position).add(idealOffset);

      // Instant camera follow for FTL speeds - no lerp needed at these velocities
      state.camera.position.copy(cameraPosition);
      state.camera.lookAt(idealLookat);
    }
    
    profiler.end('SpaceshipController.frame')
  })

  return null
})