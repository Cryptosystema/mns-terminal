/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh, Points, Group } from 'three'
import type { RegimeVisualState } from './engine/RegimeVisualEngine'
import type { RegimeType } from './config/regimePalette'
import { getRegimeTheme } from './config/regimePalette'

interface DataEngineSceneProps {
  regime?: RegimeType
  visualState?: RegimeVisualState
  confidence?: number
  volatility?: number
}

/**
 * LAYER 1: Base Liquidity Grid
 * PlaneGeometry with semantic vertex displacement
 */
function BaseLiquidityGrid({
  regime = 'NORMAL',
  visualState,
  confidence = 0.75,
  volatility = 0.5
}: DataEngineSceneProps) {
  const meshRef = useRef<Mesh>(null)
  const frameCountRef = useRef(0)
  const theme = getRegimeTheme(regime)

  const gridConfig = useMemo(() => ({
    width: 600,
    height: 600,
    widthSegments: 300,
    heightSegments: 300
  }), [])

  const materialProps = useMemo(() => {
    const emissiveIntensity = confidence * 0.8
    
    return {
      color: visualState?.tunnelColor ?? theme.primary,
      emissive: visualState?.tunnelColor ?? theme.glow,
      emissiveIntensity,
      metalness: 0.6,
      roughness: 0.18,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      opacity: 0.9
    }
  }, [visualState, theme, confidence])

  const displacementParams = useMemo(() => ({
    amplitude: 1.5 + volatility * 4.5, // 1.5-6 range
    frequency: 0.3 + volatility * 0.9, // 0.3-1.2 range
    speed: 0.2 + volatility * 0.3
  }), [volatility])

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      gridConfig.width,
      gridConfig.height,
      gridConfig.widthSegments,
      gridConfig.heightSegments
    )
    const positions = geo.attributes.position.array
    geo.userData.originalPositions = new Float32Array(positions)
    return geo
  }, [gridConfig])

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
      const distance = Math.sqrt(x * x + y * y) / 10

      const wave1 = Math.sin(distance * displacementParams.frequency - time) * 0.6
      const wave2 = Math.cos(distance * displacementParams.frequency * 0.8 + time * 0.8) * 0.4
      const ripple = Math.sin(distance * 1.5 - time * 1.8) * 0.3
      const noise =
        Math.sin(x * 0.2 + time * 0.4) * 0.25 +
        Math.cos(y * 0.2 - time * 0.3) * 0.25

      positions[i + 2] = (wave1 + wave2 + ripple + noise) * displacementParams.amplitude
    }

    geo.attributes.position.needsUpdate = true

    frameCountRef.current++
    if (frameCountRef.current % 2 === 0) {
      geo.computeVertexNormals()
    }

    mesh.rotation.z = Math.sin(time * 0.08) * 0.03
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, 10, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshPhysicalMaterial
        {...materialProps}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * LAYER 2: Uncertainty Dome
 * Half-sphere representing market uncertainty
 */
function UncertaintyDome({
  regime = 'NORMAL',
  visualState,
  confidence = 0.75
}: DataEngineSceneProps) {
  const meshRef = useRef<Mesh>(null)
  const theme = getRegimeTheme(regime)

  const domeOpacity = useMemo(() => (1 - confidence) * 0.5, [confidence])

  const domeColor = useMemo(() => {
    const baseColor = new THREE.Color(visualState?.tunnelColor ?? theme.primary)
    return baseColor.clone().multiplyScalar(0.6) // Desaturate
  }, [visualState, theme])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    
    // Subtle pulsing animation
    const scale = 1 + Math.sin(time * 0.5) * 0.05
    meshRef.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={meshRef} position={[0, 10, 0]}>
      <sphereGeometry args={[280, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshPhysicalMaterial
        color={domeColor}
        transparent
        opacity={domeOpacity}
        side={THREE.BackSide}
        metalness={0.3}
        roughness={0.7}
        transmission={0.1}
      />
    </mesh>
  )
}

/**
 * LAYER 3: Liquidity Spikes
 * Vertical spikes representing liquidity depth
 */
function LiquiditySpikes({
  regime = 'NORMAL',
  volatility = 0.5
}: DataEngineSceneProps) {
  const groupRef = useRef<Group>(null)
  const theme = getRegimeTheme(regime)

  const spikes = useMemo(() => {
    const count = Math.floor(40 + volatility * 40) // 40-80 spikes
    const spikesData: Array<{ position: [number, number, number]; height: number; seed: number }> = []

    for (let i = 0; i < count; i++) {
      const seed = i * 123.456
      const angle = (seed * 17) % (Math.PI * 2)
      const radius = 50 + ((seed * 23) % 200)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const height = 15 + volatility * 35 + ((seed * 31) % 15)

      spikesData.push({
        position: [x, y, 10],
        height,
        seed
      })
    }

    return spikesData
  }, [volatility])

  const emissiveIntensity = useMemo(() => {
    return regime === 'CRITICAL' ? 1.2 :
           regime === 'ELEVATED_STRESS' ? 0.9 :
           regime === 'COMPRESSION' ? 0.6 : 0.4
  }, [regime])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime
    
    groupRef.current.children.forEach((spike, i) => {
      const offset = i * 0.1
      const scale = 1 + Math.sin(time * 0.8 + offset) * 0.1
      spike.scale.y = scale
    })
  })

  return (
    <group ref={groupRef}>
      {spikes.map((spike, i) => (
        <mesh key={i} position={spike.position}>
          <coneGeometry args={[2, spike.height, 8]} />
          <meshPhysicalMaterial
            color={theme.glow}
            emissive={theme.glow}
            emissiveIntensity={emissiveIntensity}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * LAYER 4: Capital Flow Particles
 * Adaptive particle system representing capital movement
 */
function CapitalFlowParticles({
  regime = 'NORMAL',
  volatility = 0.5,
  maxParticles = 2000
}: DataEngineSceneProps & { maxParticles?: number }) {
  const pointsRef = useRef<Points>(null)
  const theme = getRegimeTheme(regime)

  const particleCount = useMemo(() => {
    return Math.floor(1500 + volatility * 1500) // 1500-3000
  }, [volatility])

  const actualCount = Math.min(particleCount, maxParticles)

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(actualCount * 3)
    const velocities = new Float32Array(actualCount * 3)

    for (let i = 0; i < actualCount; i++) {
      const i3 = i * 3
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 280
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = (Math.random() - 0.5) * 200

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      const baseSpeed = 0.1 + volatility * 0.3
      velocities[i3] = (Math.random() - 0.5) * baseSpeed
      velocities[i3 + 1] = (Math.random() - 0.5) * baseSpeed
      velocities[i3 + 2] = (Math.random() - 0.5) * baseSpeed * 2
    }

    return { positions, velocities }
  }, [actualCount, volatility])

  const driftBias = useMemo(() => {
    return regime === 'CRITICAL' ? -0.15 :
           regime === 'ELEVATED_STRESS' ? -0.08 :
           regime === 'COMPRESSION' ? 0.02 : 0.08
  }, [regime])

  useFrame(() => {
    if (!pointsRef.current) return

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < actualCount; i++) {
      const i3 = i * 3

      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2] + driftBias

      if (positions[i3 + 2] < -100) positions[i3 + 2] = 100
      if (positions[i3 + 2] > 100) positions[i3 + 2] = -100

      const x = positions[i3]
      const y = positions[i3 + 1]
      const radius = Math.sqrt(x * x + y * y)
      if (radius > 280) {
        const angle = Math.atan2(y, x)
        positions[i3] = Math.cos(angle) * 280
        positions[i3 + 1] = Math.sin(angle) * 280
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={actualCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        color={theme.particles}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/**
 * LAYER 5: Forecast Path
 * Curved trajectory representing market forecast corridor
 */
function ForecastPath({
  confidence = 0.75,
  regime = 'NORMAL'
}: DataEngineSceneProps) {
  const meshRef = useRef<Mesh>(null)
  const theme = getRegimeTheme(regime)

  const pathGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-100, 15, 50),
      new THREE.Vector3(-50, 18, 0),
      new THREE.Vector3(0, 20, -30),
      new THREE.Vector3(50, 22, -60),
      new THREE.Vector3(100, 25, -100)
    ])

    const thickness = 1.5 + confidence * 3.5 // 1.5-5 range
    return new THREE.TubeGeometry(curve, 64, thickness, 8, false)
  }, [confidence])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    
    // Subtle glow pulsing
    const material = meshRef.current.material as THREE.MeshPhysicalMaterial
    material.emissiveIntensity = 0.4 + Math.sin(time * 1.5) * 0.2
  })

  return (
    <mesh ref={meshRef} geometry={pathGeometry}>
      <meshPhysicalMaterial
        color={theme.glow}
        emissive={theme.glow}
        emissiveIntensity={0.5}
        metalness={0.9}
        roughness={0.1}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

/**
 * DataEngineScene
 * Multi-layer volumetric 3D visualization engine
 */
export function DataEngineScene(props: DataEngineSceneProps) {
  return (
    <group>
      <BaseLiquidityGrid {...props} />
      <UncertaintyDome {...props} />
      <LiquiditySpikes {...props} />
      <CapitalFlowParticles {...props} maxParticles={2000} />
      <ForecastPath {...props} />
    </group>
  )
}
