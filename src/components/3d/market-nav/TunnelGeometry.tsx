import { useMemo } from 'react'
import * as THREE from 'three'
import { PEAKS } from './MetricPeaks'

export interface TunnelGeometryProps {
  peaks: number[]
  regime: string
  color: string
}

function gaussian(x: number, z: number, cx: number, cz: number, sigma: number, height: number) {
  const dx = x - cx
  const dz = z - cz
  return height * Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma))
}

export function TunnelGeometry({ peaks, color }: TunnelGeometryProps) {
  const GRID_SIZE = 40
  const SEGMENTS = 80
  const FLOOR_Y = -2

  const { positions, indices, colors } = useMemo(() => {
    const step = GRID_SIZE / SEGMENTS
    const verts: number[] = []
    const cols: number[] = []
    const idx: number[] = []

    // Peak centers from MetricPeaks (same coordinate space as grid)
    const peakCenters = PEAKS.map(p => [p.position.x, p.position.z] as [number, number])

    const baseColor = new THREE.Color(color)
    const highColor = new THREE.Color(color).multiplyScalar(2.5)

    for (let i = 0; i <= SEGMENTS; i++) {
      for (let j = 0; j <= SEGMENTS; j++) {
        const x = -GRID_SIZE / 2 + i * step
        const z = -GRID_SIZE / 2 + j * step

        let y = FLOOR_Y
        for (let k = 0; k < Math.min(peaks.length, peakCenters.length); k++) {
          const [cx, cz] = peakCenters[k]
          const h = peaks[k] * 0.8
          const sigma = 2.5 + (peaks[k] * 0.3)
          y += gaussian(x, z, cx, cz, sigma, h)
        }

        verts.push(x, y, z)

        // Color based on height
        const t = Math.min((y - FLOOR_Y) / 6, 1)
        const c = baseColor.clone().lerp(highColor, t)
        cols.push(c.r, c.g, c.b)
      }
    }

    // Build indices for wireframe grid lines
    for (let i = 0; i < SEGMENTS; i++) {
      for (let j = 0; j < SEGMENTS; j++) {
        const a = i * (SEGMENTS + 1) + j
        const b = a + 1
        const c = a + (SEGMENTS + 1)
        const d = c + 1
        idx.push(a, b, b, d, d, c, c, a)
      }
    }

    return {
      positions: new Float32Array(verts),
      indices: new Uint32Array(idx),
      colors: new Float32Array(cols)
    }
  }, [peaks, color, GRID_SIZE, SEGMENTS, FLOOR_Y])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setIndex(new THREE.BufferAttribute(indices, 1))
    return geo
  }, [positions, indices, colors])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.85} />
    </lineSegments>
  )
}
