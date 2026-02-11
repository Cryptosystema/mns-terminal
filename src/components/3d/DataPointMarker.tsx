/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { useState } from 'react'
import { Html } from '@react-three/drei'

interface DataPointMarkerProps {
  position: [number, number, number]
  day: number
  price: number
  percentile: 'P10' | 'P50' | 'P90'
  color: string
}

export function DataPointMarker({
  position,
  day,
  price,
  percentile,
  color
}: DataPointMarkerProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <group position={position}>
      {/* Sphere marker */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.5 : 1}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </mesh>

      {/* Tooltip on hover */}
      {hovered && (
        <Html distanceFactor={10}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.9)',
            color: color,
            padding: '8px 12px',
            borderRadius: '4px',
            border: `1px solid ${color}`,
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}>
            <div><strong>Day {day}</strong></div>
            <div>{percentile}: ${price.toLocaleString()}</div>
          </div>
        </Html>
      )}
    </group>
  )
}
