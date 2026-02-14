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
 * MarketSurface - Hero Composition with Central Peak
 * 
 * Cinematic surface with dominant central mountain peak
 * Depth layers for volumetric presence
 */

// Main surface with central peak
function MainSurface({
  regime = 'NORMAL',
  visualState,
  confidence = 0.75,
  volatility = 0.5
}: MarketSurfaceProps) {
  const meshRef = useRef<Mesh>(null)
  const frameCountRef = useRef(0)
  const theme = getRegimeTheme(regime)
  
  const surfaceConfig = useMemo(() => ({
    width: 1000,
    height: 1000,
    widthSegments: 250,
    heightSegments: 250
  }), [])
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      surfaceConfig.width,
      surfaceConfig.height,
      surfaceConfig.widthSegments,
      surfaceConfig.heightSegments
    )
    const positions = geo.attributes.position.array
    geo.userData.originalPositions = new Float32Array(positions)
    return geo
  }, [surfaceConfig])
  
  const displacementParams = useMemo(() => ({
    baseAmplitude: 4,
    centerBoost: 8,
    centerRadius: 200,
    frequency: 0.4 + volatility * 0.6,
    speed: 0.25 + volatility * 0.25
  }), [volatility])
  
  useFrame((state) => {
    if (!meshRef.current) return
    
    const mesh = meshRef.current
    const geo = mesh.geometry as THREE.BufferGeometry
    const positions = geo.attributes.position.array as Float32Array
    const originalPositions = geo.userData.originalPositions as Float32Array
    const time = state.clock.elapsedTime * displacementParams.speed
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i]
      const y = originalPositions[i + 1]
      const distanceFromCenter = Math.sqrt(x * x + y * y)
      
      // Create central peak with smooth falloff
      const peakFalloff = Math.max(0, 1 - (distanceFromCenter / displacementParams.centerRadius))
      const peakBoost = peakFalloff * displacementParams.centerBoost
      
      // Base terrain waves
      const wave1 = Math.sin(distanceFromCenter * 0.01 * displacementParams.frequency - time) * 0.5
      const wave2 = Math.cos(distanceFromCenter * 0.008 * displacementParams.frequency + time * 0.8) * 0.3
      
      // Fine detail noise
      const noise = 
        Math.sin(x * 0.015 + time * 0.3) * 0.2 +
        Math.cos(y * 0.015 - time * 0.2) * 0.2
      
      const baseDisplacement = (wave1 + wave2 + noise) * displacementParams.baseAmplitude
      positions[i + 2] = baseDisplacement + peakBoost
    }
    
    geo.attributes.position.needsUpdate = true
    
    frameCountRef.current++
    if (frameCountRef.current % 2 === 0) {
      geo.computeVertexNormals()
    }
  })
  
  // Peak-focused emissive intensity
  const emissiveIntensity = useMemo(() => 0.3 + confidence * 0.7, [confidence])
  
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 15, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshPhysicalMaterial
        color={visualState?.tunnelColor ?? theme.primary}
        emissive={visualState?.tunnelColor ?? theme.glow}
        emissiveIntensity={emissiveIntensity}
        metalness={0.7}
        roughness={0.18}
        clearcoat={0.8}
        clearcoatRoughness={0.1}
        reflectivity={0.9}
        transparent={true}
        opacity={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Foreground dark plane (depth layer)
function ForegroundPlane({ regime = 'NORMAL' }: { regime?: RegimeType }) {
  const theme = getRegimeTheme(regime)
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 5, 100]}>
      <planeGeometry args={[800, 400]} />
      <meshBasicMaterial
        color={theme.primary}
        transparent
        opacity={0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Background faint duplicate (depth layer)
function BackgroundPlane({ regime = 'NORMAL' }: { regime?: RegimeType }) {
  const theme = getRegimeTheme(regime)
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 10, -400]} scale={1.5}>
      <planeGeometry args={[1000, 1000, 50, 50]} />
      <meshPhysicalMaterial
        color={theme.primary}
        emissive={theme.glow}
        emissiveIntensity={0.1}
        transparent
        opacity={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Vertical gradient backdrop
function GradientBackdrop() {
  return (
    <mesh position={[0, 0, -500]}>
      <planeGeometry args={[2000, 1000]} />
      <meshBasicMaterial
        color="#03050a"
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

export function MarketSurface(props: MarketSurfaceProps) {
  return (
    <group>
      <GradientBackdrop />
      <BackgroundPlane regime={props.regime} />
      <MainSurface {...props} />
      <ForegroundPlane regime={props.regime} />
    </group>
  )
}

