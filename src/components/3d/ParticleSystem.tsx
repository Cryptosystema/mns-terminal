/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleSystemProps {
  count?: number
  regime?: 'NORMAL' | 'MODERATE' | 'HIGH' | 'EXTREME'
}

export function ParticleSystem({ 
  count = 1000,
  regime = 'NORMAL'
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)

  // Particle properties based on market regime
  const particleConfig = useMemo(() => {
    switch (regime) {
      case 'EXTREME':
        return {
          speed: 0.15,
          size: 0.08,
          color: new THREE.Color('#ff0000'),
          opacity: 0.8
        }
      case 'HIGH':
        return {
          speed: 0.1,
          size: 0.06,
          color: new THREE.Color('#ff8800'),
          opacity: 0.6
        }
      case 'MODERATE':
        return {
          speed: 0.05,
          size: 0.04,
          color: new THREE.Color('#00ffaa'),
          opacity: 0.4
        }
      default: // NORMAL
        return {
          speed: 0.02,
          size: 0.03,
          color: new THREE.Color('#0088ff'),
          opacity: 0.3
        }
    }
  }, [regime])

  // Generate particle positions
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Random position in cylindrical space (tunnel)
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 4.5 // Within tunnel radius
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = (Math.random() - 0.5) * 50 // Along tunnel length

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      // Random velocity
      velocities[i3] = (Math.random() - 0.5) * 0.01
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01
      velocities[i3 + 2] = (Math.random() - 0.5) * particleConfig.speed
    }

    return { positions, velocities }
  }, [count, particleConfig.speed])

  // Animate particles
  useFrame(() => {
    if (!pointsRef.current) return

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Update position based on velocity
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]

      // Wrap around tunnel (loop particles)
      if (positions[i3 + 2] < -25) {
        positions[i3 + 2] = 25
      }
      if (positions[i3 + 2] > 25) {
        positions[i3 + 2] = -25
      }

      // Keep particles within tunnel radius
      const x = positions[i3]
      const y = positions[i3 + 1]
      const radius = Math.sqrt(x * x + y * y)
      if (radius > 4.5) {
        const angle = Math.atan2(y, x)
        positions[i3] = Math.cos(angle) * 4.5
        positions[i3 + 1] = Math.sin(angle) * 4.5
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleConfig.size}
        color={particleConfig.color}
        transparent
        opacity={particleConfig.opacity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
