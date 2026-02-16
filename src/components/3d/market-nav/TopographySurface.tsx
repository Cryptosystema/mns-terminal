/// <reference path="../../../types/three.d.ts" />
/// <reference path="../../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MarketNavigationData } from './utils/types'
import { getRegimeConfig } from './utils/regimeConfig'
import { buildTopologyGeometry } from './utils/geometryBuilder'

interface Props {
  data: MarketNavigationData
}

export function TopographySurface({ data }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const config = getRegimeConfig(data.regime)
  
  // Generate geometry from forecast data
  const geometry = useMemo(() => {
    return buildTopologyGeometry(data.predictions, data.volatility)
  }, [data.predictions, data.volatility])
  
  // Subtle rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime
      meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.05
    }
  })
  
  return (
    <group>
      {/* Main surface with material */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={config.surfaceColor}
          emissive={config.emissiveColor}
          emissiveIntensity={config.emissiveIntensity}
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Wireframe overlay for detail */}
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      >
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  )
}
