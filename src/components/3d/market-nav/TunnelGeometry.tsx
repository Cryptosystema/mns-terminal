/**
 * TunnelGeometry — Core tunnel arch with embedded metric peaks
 *
 * Generates a PlaneGeometry whose vertices are displaced to form:
 *   1. A base tunnel arch (high ridge at x = 0)
 *   2. Sharp Gaussian mountain peaks driven by real-time data
 *   3. Subtle organic noise for natural feel
 *
 * Rendered as two overlaid meshes:
 *   - Solid fill at 15 % opacity  (metallic, emissive)
 *   - Wireframe at 75 % opacity   (dominant visual)
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { PEAKS } from './MetricPeaks'

interface TunnelGeometryProps {
  peakHeights: number[]   // Animated heights, one per PEAKS entry
  regimeColor: string     // Surface / emissive color
  wireframeColor: string  // Wireframe color
}

const GRID = 180           // 180×180 segments
const HALF = 10            // Geometry spans ±10 in x and z
const SHARPNESS = 27       // Gaussian sharpness for peaks

export function TunnelGeometry({
  peakHeights,
  regimeColor,
  wireframeColor
}: TunnelGeometryProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, GRID, GRID)
    const positions = geo.attributes.position.array as Float32Array

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 1]

      // ── 1. Base arch (tunnel ridge) ─────────────────────────
      const arch = Math.exp(-(x * x) / 0.4) * 1.8
      const zAttenuation = Math.exp(-(z * z) / 1.2)
      let y = arch * (0.15 + zAttenuation * 1.0)

      // ── 2. Peak contributions ───────────────────────────────
      for (let p = 0; p < PEAKS.length; p++) {
        const peak = PEAKS[p]
        // Map normalized position (-1…1) → world coords (-HALF…HALF)
        const px = peak.position.x * HALF
        const pz = peak.position.z * HALF

        const dx = x - px
        const dz = z - pz
        const distSq = dx * dx + dz * dz

        const height = peakHeights[p] ?? peak.baseHeight
        const contribution = Math.exp(-distSq * SHARPNESS / (HALF * HALF)) * height
        y += contribution
      }

      // ── 3. Organic noise ────────────────────────────────────
      y += Math.sin(x * 4.5) * Math.cos(z * 3.2) * 0.08

      positions[i + 2] = Math.max(0, y)
    }

    geo.computeVertexNormals()
    return geo
  }, [peakHeights.join(',')])

  return (
    <group rotation={[-Math.PI / 3.2, 0, 0]} position={[0, -4, 0]}>
      {/* Layer 1 — Solid fill (transparent base) */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={regimeColor}
          emissive={regimeColor}
          emissiveIntensity={0.25}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      {/* Layer 2 — Wireframe (dominant visual) */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={wireframeColor}
          wireframe
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  )
}
