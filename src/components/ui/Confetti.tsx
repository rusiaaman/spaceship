import { useEffect, useRef } from 'react'
import styled from '@emotion/styled'

const ConfettiCanvas = styled.canvas`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9;
`

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  alpha: number
}

export const Confetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = [
      '#00d4ff', // cyan
      '#0088ff', // blue
      '#00ffaa', // green-cyan
      '#ffffff', // white
      '#88ddff', // light blue
    ]

    const particles: Particle[] = []
    const particleCount = 100 // Reduced from 150 for performance

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 6 + 3, // Reduced size for performance
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        alpha: 1,
      })
    }

    let animationId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Iterate backwards for safe removal via splice, optimizing for performance
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]
        
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.1 // gravity
        particle.rotation += particle.rotationSpeed

        // Fade out near bottom
        if (particle.y > canvas.height - 100) {
          particle.alpha -= 0.02
        }

        // Remove if off screen or fully transparent
        if (particle.y > canvas.height + 20 || particle.alpha <= 0) {
          particles.splice(i, 1) // Safe splice due to backward iteration
          continue 
        }

        // Draw particle
        ctx.save()
        ctx.globalAlpha = particle.alpha
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)

        // Draw as a rectangle with glow (Reduced shadow blur for performance)
        ctx.shadowBlur = 5 // Reduced from 10
        ctx.shadowColor = particle.color
        ctx.fillStyle = particle.color
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)

        ctx.restore()
      }

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <ConfettiCanvas ref={canvasRef} />
}