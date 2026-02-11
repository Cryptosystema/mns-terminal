/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import type { Point3D } from './utils/dataTransform'

interface ProbabilityLineProps {
  points: Point3D[]
  color: string
  lineWidth: number
  dashed?: boolean
}

export function ProbabilityLine({ 
  points, 
  color, 
  lineWidth,
  dashed = false 
}: ProbabilityLineProps) {
  // Convert points to Vector3 array
  const vector3Points = useMemo(() => {
    return points.map(p => new THREE.Vector3(p.x, p.y, p.z))
  }, [points])

  return (
    <Line
      points={vector3Points}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashScale={dashed ? 2 : 1}
      dashSize={dashed ? 0.5 : 1}
      gapSize={dashed ? 0.3 : 0}
    />
  )
}
