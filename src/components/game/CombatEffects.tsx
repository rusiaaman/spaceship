import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface HitEffectProps {
  position: THREE.Vector3
  color: string
  onComplete: () => void
}

export const HitEffect = ({ position, color, onComplete }: HitEffectProps) => {
  const particlesRef = useRef<THREE.Points>(null)
  const [startTime] = useState(Date.now())
  const duration = 0.5 // seconds

  useFrame(() => {
    const elapsed = (Date.now() - startTime) / 1000
    if (elapsed > duration) {
      onComplete()
      return
    }

    if (particlesRef.current) {
      const progress = elapsed / duration
      const material = particlesRef.current.material
      if (!Array.isArray(material)) {
        material.opacity = 1 - progress
      }
      particlesRef.current.scale.setScalar(1 + progress * 2)
    }
  })

  const particleCount = 20
  const positions = new Float32Array(particleCount * 3)
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const radius = Math.random() * 2
    
    positions[i3] = position.x + Math.sin(phi) * Math.cos(theta) * radius
    positions[i3 + 1] = position.y + Math.sin(phi) * Math.sin(theta) * radius
    positions[i3 + 2] = position.z + Math.cos(phi) * radius
  }

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color={color}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

interface ExplosionEffectProps {
  position: THREE.Vector3
  onComplete: () => void
}

export const ExplosionEffect = ({ position, onComplete }: ExplosionEffectProps) => {
  const [startTime] = useState(Date.now())
  const particlesRef = useRef<THREE.Points>(null)
  const duration = 1.0 // seconds

  useFrame(() => {
    const elapsed = (Date.now() - startTime) / 1000
    if (elapsed > duration) {
      onComplete()
      return
    }

    if (particlesRef.current) {
      const progress = elapsed / duration
      const material = particlesRef.current.material
      if (!Array.isArray(material)) {
        material.opacity = 1 - progress
      }
      particlesRef.current.scale.setScalar(1 + progress * 5)
    }
  })

  const particleCount = 50
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const radius = Math.random() * 3
    
    positions[i3] = position.x + Math.sin(phi) * Math.cos(theta) * radius
    positions[i3 + 1] = position.y + Math.sin(phi) * Math.sin(theta) * radius
    positions[i3 + 2] = position.z + Math.cos(phi) * radius
    
    // Orange to yellow gradient
    const colorMix = Math.random()
    colors[i3] = 1.0 // R
    colors[i3 + 1] = 0.3 + colorMix * 0.7 // G
    colors[i3 + 2] = 0.0 // B
  }

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.0}
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Manager for all combat effects
export const CombatEffectsManager = () => {
  const [effects, setEffects] = useState<Array<{ id: string; type: 'hit' | 'explosion'; position: THREE.Vector3; color: string }>>([])

  useEffect(() => {
    // Expose function to add effects
    ;(window as any).__addCombatEffect = (type: 'hit' | 'explosion', position: THREE.Vector3, color: string) => {
      setEffects(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, type, position, color }])
    }
  }, [])

  const removeEffect = (id: string) => {
    setEffects(prev => prev.filter(e => e.id !== id))
  }

  return (
    <group>
      {effects.map(effect => (
        effect.type === 'hit' ? (
          <HitEffect
            key={effect.id}
            position={effect.position}
            color={effect.color}
            onComplete={() => removeEffect(effect.id)}
          />
        ) : (
          <ExplosionEffect
            key={effect.id}
            position={effect.position}
            onComplete={() => removeEffect(effect.id)}
          />
        )
      ))}
    </group>
  )
}