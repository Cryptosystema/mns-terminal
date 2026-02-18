import { useMemo } from 'react'
import * as THREE from 'three'

export function TunnelGeometry() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 20, 200, 200)
    const positions = geo.attributes.position.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 1]
      
      const arch = Math.exp(-x * x / 0.3) * 4
      const zFocus = Math.exp(-z * z / 0.8)
      let y = arch * (0.3 + zFocus * 1.5)
      
      const peaks = [
        [0, 0, 5], [-4, -2, 2], [4, -2, 3.5], [-2, 0, 2.5],
        [2, 0, 3], [-1.5, 3.5, 2], [1.5, 3.5, 2], [0, -3, 2.8], [3, 1.5, 2.5]
      ]
      
      peaks.forEach(([px, pz, height]) => {
        const dist = Math.sqrt((x - px) ** 2 + (z - pz) ** 2)
        y += Math.exp(-(dist ** 2) * 8) * height
      })
      
      positions[i + 2] = Math.max(0, y)
    }
    
    geo.computeVertexNormals()
    return geo
  }, [])
  
  return (
    <group rotation={[-Math.PI / 3, 0, 0]} position={[0, -5, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.3}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.8} />
      </mesh>
    </group>
  )
}
