/**
 * TunnelGeometry — Immersive tunnel arch with data peaks
 * Camera looks INSIDE from position [0, -1, 12]
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PEAKS } from './MetricPeaks'

export interface TunnelGeometryProps {
  peakHeights: number[]
  regimeColor: string
  wireframeColor: string
  glowColor: string
}

const ARCH_RADIUS  = 9
const ARCH_LENGTH  = 50
const ARCH_RAD_SEG = 48
const ARCH_LEN_SEG = 80
const FLOOR_W      = 16
const FLOOR_D      = 50
const FLOOR_SEG_W  = 120
const FLOOR_SEG_D  = 120
const PEAK_SHARP   = 5.5
const FLOOR_Y      = -8.5

function buildArchGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(
    ARCH_RADIUS, ARCH_RADIUS,
    ARCH_LENGTH,
    ARCH_RAD_SEG, ARCH_LEN_SEG,
    true,
    Math.PI * 0.02,
    Math.PI * 0.96
  )
  geo.rotateZ(Math.PI)
  geo.rotateX(Math.PI / 2)
  return geo
}

function buildFloorGeometry(peakHeights: number[]): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(FLOOR_W, FLOOR_D, FLOOR_SEG_W, FLOOR_SEG_D)
  geo.rotateX(-Math.PI / 2)
  const positions = geo.attributes.position.array as Float32Array
  const halfW = FLOOR_W / 2
  const halfD = FLOOR_D / 2

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const z = positions[i + 2]
    let y = 0
    for (let p = 0; p < PEAKS.length; p++) {
      const peak = PEAKS[p]
      const px = peak.position.x * halfW * 0.85
      const pz = peak.position.z * halfD * 0.7
      const dx = x - px
      const dz = z - pz
      const distSq = dx * dx + dz * dz
      const height = peakHeights[p] ?? peak.baseHeight
      y += Math.exp(-distSq * PEAK_SHARP / (halfW * halfW)) * height
    }
    y += Math.sin(x * 1.8) * Math.cos(z * 1.2) * 0.12
    positions[i + 1] = Math.max(0, y)
  }
  geo.computeVertexNormals()
  return geo
}

function GlowLight({ color }: { color: string }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const timeRef = useRef(0)
  useFrame((_, delta) => {
    timeRef.current += delta
    if (lightRef.current) {
      lightRef.current.intensity = 2.8 + Math.sin(timeRef.current * 1.2) * 0.4
    }
  })
  return (
    <pointLight
      ref={lightRef}
      position={[0, 0, -5]}
      color={color}
      intensity={2.8}
      distance={35}
      decay={1.8}
    />
  )
}

export function TunnelGeometry({ peakHeights, regimeColor, wireframeColor, glowColor }: TunnelGeometryProps) {
  const archGeo = useMemo(() => buildArchGeometry(), [])
  const archEdgesGeo = useMemo(() => new THREE.EdgesGeometry(archGeo, 15), [archGeo])
  const floorGeo = useMemo(
    () => buildFloorGeometry(peakHeights),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [peakHeights.join(',')]
  )

  return (
    <group>
      <lineSegments geometry={archEdgesGeo}>
        <lineBasicMaterial color={wireframeColor} transparent opacity={0.0} />
      </lineSegments>

      <mesh geometry={archGeo}>
        <meshStandardMaterial
          color={regimeColor} emissive={regimeColor} emissiveIntensity={0.08}
          transparent opacity={0.18} side={THREE.BackSide} depthWrite={false}
        />
      </mesh>

      <mesh geometry={floorGeo} position={[0, FLOOR_Y, -8]}>
        <meshStandardMaterial
          color={regimeColor} emissive={regimeColor} emissiveIntensity={0.3}
          transparent opacity={0.13} side={THREE.DoubleSide} metalness={0.6} roughness={0.3}
        />
      </mesh>

      <mesh geometry={floorGeo} position={[0, FLOOR_Y, -8]}>
        <meshBasicMaterial color={wireframeColor} wireframe transparent opacity={0.82} />
      </mesh>

      <GlowLight color={glowColor} />
      <pointLight position={[0, 2, -18]} color={glowColor} intensity={1.4} distance={28} decay={2} />
      <pointLight position={[0, -4, 2]} color={glowColor} intensity={1.0} distance={20} decay={2} />
      <pointLight position={[-7.2, 0, 0]} color={wireframeColor} intensity={0.6} distance={15} decay={2} />
      <pointLight position={[7.2, 0, 0]} color={wireframeColor} intensity={0.6} distance={15} decay={2} />
    </group>
  )
}
