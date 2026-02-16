/// <reference path="../../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MarketNavigationData } from './utils/types'
import { getRegimeConfig } from './utils/regimeConfig'

interface Props {
  data: MarketNavigationData
}

export function ParticleField({ data }: Props) {
  const pointsRef = useRef<THREE.Points>(null)
  const config = getRegimeConfig(data.regime)
  
  // Create glow texture for particles
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 32, 32)
    
    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [])
  
  const { positions, velocities } = useMemo(() => {
    const count = config.particleCount
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Distribute in cylindrical volume around scene
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 20
      const height = Math.random() * 15 - 5
      
      pos[i3] = Math.cos(angle) * radius
      pos[i3 + 1] = height
      pos[i3 + 2] = Math.sin(angle) * radius
      
      // Random velocity based on regime speed
      vel[i3] = (Math.random() - 0.5) * config.particleSpeed
      vel[i3 + 1] = (Math.random() - 0.5) * config.particleSpeed
      vel[i3 + 2] = (Math.random() - 0.5) * config.particleSpeed
    }
    
    return { positions: pos, velocities: vel }
  }, [config.particleCount, config.particleSpeed])
  
  // Animate particles
  useFrame(() => {
    if (!pointsRef.current) return
    
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < pos.length; i += 3) {
      // Update positions
      pos[i] += velocities[i]
      pos[i + 1] += velocities[i + 1]
      pos[i + 2] += velocities[i + 2]
      
      // Boundary collision (wrap around)
      if (Math.abs(pos[i]) > 25) velocities[i] *= -1
      if (pos[i + 1] > 10 || pos[i + 1] < -10) velocities[i + 1] *= -1
      if (Math.abs(pos[i + 2]) > 25) velocities[i + 2] *= -1
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        map={particleTexture}
        color={config.particleColor}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
