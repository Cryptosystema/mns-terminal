/// <reference path="../../../types/three.d.ts" />
/// <reference path="../../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

export function WireframeGrid() {
  const gridLines = useMemo(() => {
    const lines: THREE.Vector3[][] = []
    const size = 50
    const divisions = 50
    const step = size / divisions
    const yPosition = -5  // Floor level
    
    // Create horizontal lines
    for (let i = 0; i <= divisions; i++) {
      const z = -size / 2 + i * step
      lines.push([
        new THREE.Vector3(-size / 2, yPosition, z),
        new THREE.Vector3(size / 2, yPosition, z),
      ])
    }
    
    // Create vertical lines
    for (let i = 0; i <= divisions; i++) {
      const x = -size / 2 + i * step
      lines.push([
        new THREE.Vector3(x, yPosition, -size / 2),
        new THREE.Vector3(x, yPosition, size / 2),
      ])
    }
    
    return lines
  }, [])
  
  return (
    <group>
      {gridLines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#1a1a1a"
          lineWidth={0.5}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  )
}
