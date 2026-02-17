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
  
  // Breathing surface animation
  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array
    
    // Subtle wave animation
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      // Breathing effect
      positions[i + 1] += Math.sin(time * 0.5 + x * 0.3 + z * 0.2) * 0.002
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()
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
          emissiveIntensity={config.emissiveIntensity * 1.5}
          metalness={0.4}
          roughness={0.3}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          envMapIntensity={1.2}
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
