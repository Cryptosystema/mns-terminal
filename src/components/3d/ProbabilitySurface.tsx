/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useMemo } from 'react'
import * as THREE from 'three'
import type { ForecastData } from '@/types/forecast'
import { transformForecastTo3D } from './utils/dataTransform'
import { ProbabilityLine } from './ProbabilityLine'
import { DataPointMarker } from './DataPointMarker'
import { getRegimeTheme, type RegimeType } from './config/regimePalette'

interface ProbabilitySurfaceProps {
  forecastData: ForecastData
  tunnelLength?: number
  tunnelRadius?: number
  regime?: RegimeType
}

export function ProbabilitySurface({ 
  forecastData,
  tunnelLength = 50,
  tunnelRadius = 5,
  regime = 'NORMAL'
}: ProbabilitySurfaceProps) {
  const theme = getRegimeTheme(regime)

  const surfaceData = useMemo(() => {
    return transformForecastTo3D(forecastData, tunnelLength, tunnelRadius)
  }, [forecastData, tunnelLength, tunnelRadius])

  const probabilityMesh = useMemo(() => {
    const { p10, p50, p90 } = surfaceData
    
    const geometry = new THREE.BufferGeometry()
    
    const vertices: number[] = []
    const indices: number[] = []
    
    for (let i = 0; i < p10.length - 1; i++) {
      const idx = vertices.length / 3
      
      vertices.push(p10[i].x, p10[i].y, p10[i].z)
      vertices.push(p10[i + 1].x, p10[i + 1].y, p10[i + 1].z)
      vertices.push(p90[i].x, p90[i].y, p90[i].z)
      vertices.push(p90[i + 1].x, p90[i + 1].y, p90[i + 1].z)
      
      indices.push(idx, idx + 1, idx + 2)
      indices.push(idx + 1, idx + 3, idx + 2)
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    
    return geometry
  }, [surfaceData])

  const wireframeMesh = useMemo(() => {
    const { p10, p90 } = surfaceData
    
    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    
    for (let i = 0; i < p10.length - 1; i++) {
      vertices.push(p10[i].x, p10[i].y, p10[i].z)
      vertices.push(p10[i + 1].x, p10[i + 1].y, p10[i + 1].z)
      
      vertices.push(p90[i].x, p90[i].y, p90[i].z)
      vertices.push(p90[i + 1].x, p90[i + 1].y, p90[i + 1].z)
      
      vertices.push(p10[i].x, p10[i].y, p10[i].z)
      vertices.push(p90[i].x, p90[i].y, p90[i].z)
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    
    return geometry
  }, [surfaceData])

  return (
    <group>
      <mesh geometry={probabilityMesh}>
        <meshStandardMaterial
          color={theme.base}
          emissive={theme.glow}
          emissiveIntensity={0.3}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      <lineSegments geometry={wireframeMesh}>
        <lineBasicMaterial
          color={theme.grid}
          transparent
          opacity={0.3}
        />
      </lineSegments>

      <ProbabilityLine
        points={surfaceData.p90}
        color={theme.base}
        lineWidth={2}
        dashed={true}
      />

      <ProbabilityLine
        points={surfaceData.p50}
        color={theme.glow}
        lineWidth={3}
        dashed={false}
      />

      <ProbabilityLine
        points={surfaceData.p10}
        color={theme.base}
        lineWidth={2}
        dashed={true}
      />

      {surfaceData.p50.map((point, index) => {
        const prediction = forecastData.tiers.tier0.predictions[index]
        return (
          <DataPointMarker
            key={index}
            position={[point.x, point.y, point.z]}
            day={index + 1}
            price={prediction.p50}
            percentile="P50"
            color={theme.glow}
          />
        )
      })}
    </group>
  )
}
