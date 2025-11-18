import { useEffect, useRef, useMemo } from 'react'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js'
import { PLANETARY_POSITIONS } from '@/utils/solarSystemData'

// Extend Three.js with Lensflare
extend({ Lensflare })

// Add types to R3F
declare module '@react-three/fiber' {
  interface ThreeElements {
    lensflare: any
  }
}

export function LensFlareEffect() {
  const lensflareRef = useRef<any>(null)
  
  // Create flare textures procedurally to avoid external asset discrepancies
  const [flare0, flare3] = useMemo(() => {
    const createFlareTexture = (size: number, hue: number, saturation: number, lightness: number, alphaType: 'soft' | 'hard' = 'soft') => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      
      if (context) {
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
        
        if (alphaType === 'soft') {
          // Soft center glow (Sun burst)
          gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`)
          gradient.addColorStop(0.2, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`)
          gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.1)`)
          gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`)
        } else {
          // Hard ring/artifact
          gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)`)
          gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.1)`)
          gradient.addColorStop(0.9, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`)
          gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`)
        }
        
        context.fillStyle = gradient
        context.fillRect(0, 0, size, size)
      }
      
      const texture = new THREE.CanvasTexture(canvas)
      return texture
    }

    // Main sun burst (white/warm)
    const f0 = createFlareTexture(512, 210, 50, 100, 'soft')
    // Artifacts (purple/blue)
    const f3 = createFlareTexture(64, 270, 50, 70, 'hard')
    
    return [f0, f3]
  }, [])

  useEffect(() => {
    if (lensflareRef.current) {
      // Clear existing elements to prevent duplication on remount
      lensflareRef.current.elements = []
      
      // Add flare elements
      // Main flare
      lensflareRef.current.addElement(new LensflareElement(flare0, 700, 0, new THREE.Color(0xffffff)))
      
      // Artifacts extending outward
      lensflareRef.current.addElement(new LensflareElement(flare3, 60, 0.6, new THREE.Color(0xff00ff)))
      lensflareRef.current.addElement(new LensflareElement(flare3, 70, 0.7, new THREE.Color(0x00ffff)))
      lensflareRef.current.addElement(new LensflareElement(flare3, 120, 0.9, new THREE.Color(0xffffff)))
      lensflareRef.current.addElement(new LensflareElement(flare3, 70, 1.0, new THREE.Color(0xff00ff)))
      lensflareRef.current.addElement(new LensflareElement(flare3, 50, 1.1, new THREE.Color(0x0000ff)))
    }
  }, [flare0, flare3])

  return (
    <lensflare 
      ref={lensflareRef} 
      position={[PLANETARY_POSITIONS.sun.x, PLANETARY_POSITIONS.sun.y, PLANETARY_POSITIONS.sun.z]} 
    />
  )
}