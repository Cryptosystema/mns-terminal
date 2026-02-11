/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import { TunnelConfig, MaterialConfig } from '@/types/3d'
import type { RegimeData } from '@/types/forecast'
import { getRegimeColor } from './utils/regimeColors'

const DEFAULT_TUNNEL: TunnelConfig = {
  segments: 64,
  radius: 5,
  length: 50,
  wireframe: false
}

export function TunnelGeometry({
  config = DEFAULT_TUNNEL,
  regime
}: {
  config?: TunnelConfig
  material?: MaterialConfig
  regime?: RegimeData
}) {
  const meshRef = useRef<Mesh>(null)
  
  // Get color based on regime
  const tunnelColor = useMemo(() => {
    if (regime) {
      return getRegimeColor(regime)
    }
    return '#0088ff'
  }, [regime])

  // Slow rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      {/* Cylinder geometry for tunnel */}
      <cylinderGeometry
        args={[
          config.radius,        // radiusTop
          config.radius,        // radiusBottom
          config.length,        // height (tunnel length)
          config.segments,      // radialSegments
          1,                    // heightSegments
          true                  // openEnded
        ]}
      />

      {/* Basic material */}
      <meshStandardMaterial
        color={tunnelColor}
        transparent={true}
        opacity={0.3}
        wireframe={false}
        emissive={tunnelColor}
        emissiveIntensity={0.2}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
