/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useMemo } from 'react'
import * as THREE from 'three'
import type { ForecastData } from '@/types/forecast'
import { transformForecastTo3D } from './utils/dataTransform'
import { ProbabilityLine } from './ProbabilityLine'
import { DataPointMarker } from './DataPointMarker'

interface ProbabilitySurfaceProps {
  forecastData: ForecastData
  tunnelLength?: number
  tunnelRadius?: number
}

const COLORS = {
  p10: '#00aaff',    // Blue (lower bound)
  p50: '#00ff88',    // Green (median)
  p90: '#ff4444'     // Red (upper bound)
}

export function ProbabilitySurface({ 
  forecastData,
  tunnelLength = 50,
  tunnelRadius = 5
}: ProbabilitySurfaceProps) {
  const surfaceData = useMemo(() => {
    return transformForecastTo3D(forecastData, tunnelLength, tunnelRadius)
  }, [forecastData, tunnelLength, tunnelRadius])

  // Create gradient mesh between P10 and P90
  const probabilityMesh = useMemo(() => {
    const { p10, p50, p90 } = surfaceData
    
    // Create geometry for filled area between P10 and P90
    const geometry = new THREE.BufferGeometry()
    
    const vertices: number[] = []
    const indices: number[] = []
    const colors: number[] = []
    
    // Create triangulated mesh between bounds
    for (let i = 0; i < p10.length - 1; i++) {
      const idx = vertices.length / 3
      
      // Bottom edge (P10)
      vertices.push(p10[i].x, p10[i].y, p10[i].z)
      vertices.push(p10[i + 1].x, p10[i + 1].y, p10[i + 1].z)
      
      // Top edge (P90)
      vertices.push(p90[i].x, p90[i].y, p90[i].z)
      vertices.push(p90[i + 1].x, p90[i + 1].y, p90[i + 1].z)
      
      // Create two triangles for this segment
      indices.push(idx, idx + 1, idx + 2)
      indices.push(idx + 1, idx + 3, idx + 2)
      
      // Color gradient (blue at bottom, red at top)
      const blueColor = new THREE.Color(COLORS.p10)
      const redColor = new THREE.Color(COLORS.p90)
      
      colors.push(blueColor.r, blueColor.g, blueColor.b)
      colors.push(blueColor.r, blueColor.g, blueColor.b)
      colors.push(redColor.r, redColor.g, redColor.b)
      colors.push(redColor.r, redColor.g, redColor.b)
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    
    return geometry
  }, [surfaceData])

  return (
    <group>
      {/* Filled probability surface (gradient mesh) */}
      <mesh geometry={probabilityMesh}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* P90 line (upper bound) - dashed red */}
      <ProbabilityLine
        points={surfaceData.p90}
        color={COLORS.p90}
        lineWidth={2}
        dashed={true}
      />

      {/* P50 line (median) - solid green, thicker */}
      <ProbabilityLine
        points={surfaceData.p50}
        color={COLORS.p50}
        lineWidth={3}
        dashed={false}
      />

      {/* P10 line (lower bound) - dashed blue */}
      <ProbabilityLine
        points={surfaceData.p10}
        color={COLORS.p10}
        lineWidth={2}
        dashed={true}
      />

      {/* Interactive markers on P50 */}
      {surfaceData.p50.map((point, index) => {
        const prediction = forecastData.tiers.tier0.predictions[index]
        return (
          <DataPointMarker
            key={index}
            position={[point.x, point.y, point.z]}
            day={index + 1}
            price={prediction.p50}
            percentile="P50"
            color={COLORS.p50}
          />
        )
      })}
    </group>
  )
}
