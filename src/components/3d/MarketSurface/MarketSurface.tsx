/// <reference path="../../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import type { RegimeVisualState } from '../engine/RegimeVisualEngine'
import type { RegimeType } from '../config/regimePalette'
import { getRegimeTheme } from '../config/regimePalette'

interface MarketSurfaceProps {
  regime?: RegimeType
  visualState?: RegimeVisualState
  confidence?: number
  volatility?: number
}

/**
 * MarketSurface - Dynamic probability topology grid
 * 
 * Renders a 3D surface with vertex displacement driven by:
 * - Confidence: amplitude modifier
 * - Volatility: noise frequency modifier
 * - Regime: color and emissive intensity
 */
export function MarketSurface({
  regime = 'NORMAL',
  visualState,
  confidence = 0.75,
  volatility = 0.5
}: MarketSurfaceProps) {
  const meshRef = useRef<Mesh>(null)
  const theme = getRegimeTheme(regime)
  
  // Surface configuration
  const surfaceConfig = useMemo(() => ({
    width: 40,
    height: 40,
    widthSegments: 200,
    heightSegments: 200
  }), [])
  
  // Material properties from visual state
  const materialProps = useMemo(() => {
    if (visualState) {
      return {
        color: visualState.tunnelColor,
        emissive: visualState.tunnelColor,
        emissiveIntensity: visualState.tunnelEmissive * 1.5, // Boost for surface visibility
        metalness: 0.4,
        roughness: 0.2,
        opacity: visualState.tunnelOpacity * 0.8
      }
    }
    return {
      color: theme.primary,
      emissive: theme.glow,
      emissiveIntensity: 0.3,
      metalness: 0.4,
      roughness: 0.2,
      opacity: 0.8
    }
  }, [visualState, theme])
  
  // Displacement parameters based on confidence and volatility
  const displacementParams = useMemo(() => ({
    amplitude: 2 + (1 - confidence) * 3,        // Low confidence = higher amplitude
    frequency: 0.5 + volatility * 0.5,          // Higher volatility = more noise frequency
    speed: 0.3 + volatility * 0.2               // Animation speed
  }), [confidence, volatility])
  
  // Create geometry with initial positions stored for animation
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      surfaceConfig.width,
      surfaceConfig.height,
      surfaceConfig.widthSegments,
      surfaceConfig.heightSegments
    )
    
    // Store original positions for displacement calculations
    const positions = geo.attributes.position.array
    const originalPositions = new Float32Array(positions)
    geo.userData.originalPositions = originalPositions
    
    return geo
  }, [surfaceConfig])
  
  // Animate surface with breathing motion
  useFrame((state) => {
    if (!meshRef.current) return
    
    const mesh = meshRef.current
    const geo = mesh.geometry as THREE.BufferGeometry
    const positions = geo.attributes.position.array as Float32Array
    const originalPositions = geo.userData.originalPositions as Float32Array
    
    const time = state.clock.elapsedTime * displacementParams.speed
    
    // Apply vertex displacement
    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i]
      const y = originalPositions[i + 1]
      
      // Create wave pattern with noise
      const distance = Math.sqrt(x * x + y * y) / 10
      const wave1 = Math.sin(distance * displacementParams.frequency - time) * 0.5
      const wave2 = Math.cos(distance * displacementParams.frequency * 0.7 + time * 0.7) * 0.3
      
      // Add ripple effect from center
      const ripple = Math.sin(distance * 2 - time * 2) * 0.2
      
      // Perlin-like noise simulation using multiple sine waves
      const noise = 
        Math.sin(x * 0.3 + time * 0.5) * 0.2 +
        Math.cos(y * 0.3 - time * 0.3) * 0.2 +
        Math.sin((x + y) * 0.2 + time * 0.4) * 0.15
      
      // Combine all displacement factors
      const displacement = (wave1 + wave2 + ripple + noise) * displacementParams.amplitude
      
      // Apply to Z coordinate
      positions[i + 2] = displacement
    }
    
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals() // Recompute normals for proper lighting
    
    // Subtle rotation for premium feel
    mesh.rotation.z = Math.sin(time * 0.1) * 0.05
  })
  
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 3, 0, 0]} // Tilt surface for better view
      position={[0, -5, 0]}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={materialProps.color}
        emissive={materialProps.emissive}
        emissiveIntensity={materialProps.emissiveIntensity}
        metalness={materialProps.metalness}
        roughness={materialProps.roughness}
        wireframe={true}
        transparent={true}
        opacity={materialProps.opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
