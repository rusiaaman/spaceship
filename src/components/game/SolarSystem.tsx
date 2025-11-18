import { Suspense, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Planet, PlanetFallback } from './Planet'
import { PLANETS, PLANETARY_POSITIONS, polarToCartesian } from '@/utils/solarSystemData'

export const SolarSystem = () => {
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0))
  
  // Debug: Log planet positions on mount
  useEffect(() => {
    console.log('🌍 Solar System Initialized')
    console.log('Sun position:', PLANETARY_POSITIONS.sun)
    console.log('Earth position:', PLANETARY_POSITIONS.earth)
    console.log('Moon position:', PLANETARY_POSITIONS.moon)
    console.log('Neptune position:', PLANETARY_POSITIONS.neptune)
    console.log('Earth radius:', PLANETS.earth.radiusGameUnits)
    console.log('Moon radius:', PLANETS.moon.radiusGameUnits)
  }, [])
  
  // Track player position for LOD calculations
  useFrame(() => {
    // Get player position from global ref if available
    if ((window as any).__weaponSystemRefs?.playerPosition) {
      playerPosRef.current.copy((window as any).__weaponSystemRefs.playerPosition)
    }
  })
  
  // Calculate positions for planets with angle/radius
  const mercuryPos = polarToCartesian(
    PLANETARY_POSITIONS.mercury.angle,
    PLANETARY_POSITIONS.mercury.radius
  )
  const venusPos = polarToCartesian(
    PLANETARY_POSITIONS.venus.angle,
    PLANETARY_POSITIONS.venus.radius
  )
  const marsPos = polarToCartesian(
    PLANETARY_POSITIONS.mars.angle,
    PLANETARY_POSITIONS.mars.radius
  )
  const jupiterPos = polarToCartesian(
    PLANETARY_POSITIONS.jupiter.angle,
    PLANETARY_POSITIONS.jupiter.radius
  )
  const saturnPos = polarToCartesian(
    PLANETARY_POSITIONS.saturn.angle,
    PLANETARY_POSITIONS.saturn.radius
  )
  const uranusPos = polarToCartesian(
    PLANETARY_POSITIONS.uranus.angle,
    PLANETARY_POSITIONS.uranus.radius
  )
  
  return (
    <group>
      {/* Sun - behind the starting position */}
      <Suspense fallback={<PlanetFallback data={PLANETS.sun} position={[PLANETARY_POSITIONS.sun.x, PLANETARY_POSITIONS.sun.y, PLANETARY_POSITIONS.sun.z]} />}>
        <Planet 
          data={PLANETS.sun} 
          position={[PLANETARY_POSITIONS.sun.x, PLANETARY_POSITIONS.sun.y, PLANETARY_POSITIONS.sun.z]}
        />
      </Suspense>
      
      {/* Sun as a point light source */}
      <pointLight
        position={[PLANETARY_POSITIONS.sun.x, PLANETARY_POSITIONS.sun.y, PLANETARY_POSITIONS.sun.z]}
        intensity={2.0}
        distance={100000}
        decay={2}
        color="#FDB813"
      />
      
      {/* Mercury */}
      <Suspense fallback={<PlanetFallback data={PLANETS.mercury} position={[mercuryPos.x, 0, mercuryPos.z]} />}>
        <Planet 
          data={PLANETS.mercury} 
          position={[mercuryPos.x, 0, mercuryPos.z]}
        />
      </Suspense>
      
      {/* Venus */}
      <Suspense fallback={<PlanetFallback data={PLANETS.venus} position={[venusPos.x, 0, venusPos.z]} />}>
        <Planet 
          data={PLANETS.venus} 
          position={[venusPos.x, 0, venusPos.z]}
        />
      </Suspense>
      
      {/* Earth - visible on the left at start */}
      <Suspense fallback={<PlanetFallback data={PLANETS.earth} position={[PLANETARY_POSITIONS.earth.x, PLANETARY_POSITIONS.earth.y, PLANETARY_POSITIONS.earth.z]} />}>
        <Planet 
          data={PLANETS.earth} 
          position={[PLANETARY_POSITIONS.earth.x, PLANETARY_POSITIONS.earth.y, PLANETARY_POSITIONS.earth.z]}
        />
      </Suspense>
      
      {/* Moon - at starting position */}
      <Suspense fallback={<PlanetFallback data={PLANETS.moon} position={[PLANETARY_POSITIONS.moon.x, PLANETARY_POSITIONS.moon.y, PLANETARY_POSITIONS.moon.z]} />}>
        <Planet 
          data={PLANETS.moon} 
          position={[PLANETARY_POSITIONS.moon.x, PLANETARY_POSITIONS.moon.y, PLANETARY_POSITIONS.moon.z]}
        />
      </Suspense>
      
      {/* Mars */}
      <Suspense fallback={<PlanetFallback data={PLANETS.mars} position={[marsPos.x, 0, marsPos.z]} />}>
        <Planet 
          data={PLANETS.mars} 
          position={[marsPos.x, 0, marsPos.z]}
        />
      </Suspense>
      
      {/* Jupiter */}
      <Suspense fallback={<PlanetFallback data={PLANETS.jupiter} position={[jupiterPos.x, 0, jupiterPos.z]} />}>
        <Planet 
          data={PLANETS.jupiter} 
          position={[jupiterPos.x, 0, jupiterPos.z]}
        />
      </Suspense>
      
      {/* Saturn with rings */}
      <Suspense fallback={<PlanetFallback data={PLANETS.saturn} position={[saturnPos.x, 0, saturnPos.z]} />}>
        <Planet 
          data={PLANETS.saturn} 
          position={[saturnPos.x, 0, saturnPos.z]}
        />
        {/* Saturn's rings - scaled to match planet size */}
        <mesh position={[saturnPos.x, 0, saturnPos.z]} rotation-x={Math.PI / 2}>
          <ringGeometry args={[PLANETS.saturn.radiusGameUnits * 1.2, PLANETS.saturn.radiusGameUnits * 2.0, 64]} />
          <meshBasicMaterial
            color="#FAD5A5"
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
      </Suspense>
      
      {/* Uranus */}
      <Suspense fallback={<PlanetFallback data={PLANETS.uranus} position={[uranusPos.x, 0, uranusPos.z]} />}>
        <Planet 
          data={PLANETS.uranus} 
          position={[uranusPos.x, 0, uranusPos.z]}
        />
      </Suspense>
      
      {/* Neptune - at finish line */}
      <Suspense fallback={<PlanetFallback data={PLANETS.neptune} position={[PLANETARY_POSITIONS.neptune.x, PLANETARY_POSITIONS.neptune.y, PLANETARY_POSITIONS.neptune.z]} />}>
        <Planet 
          data={PLANETS.neptune} 
          position={[PLANETARY_POSITIONS.neptune.x, PLANETARY_POSITIONS.neptune.y, PLANETARY_POSITIONS.neptune.z]}
        />
      </Suspense>
    </group>
  )
}