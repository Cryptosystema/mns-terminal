/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ProbabilitySurface } from './ProbabilitySurface'
import type { ForecastData } from '@/types/forecast'

interface AnimatedSurfaceProps {
  forecastData: ForecastData
  tunnelLength?: number
  tunnelRadius?: number
}

export function AnimatedSurface(props: AnimatedSurfaceProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Smooth fade-in animation on mount
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Gradually increase opacity for all children
      groupRef.current.children.forEach(child => {
        if ('material' in child && child.material) {
          const material = child.material as THREE.Material & { opacity?: number }
          const target = 1
          
          if (material.transparent && typeof material.opacity === 'number') {
            if (material.opacity < target) {
              material.opacity = Math.min(target, material.opacity + delta * 0.5)
            }
          }
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      <ProbabilitySurface {...props} />
    </group>
  )
}
