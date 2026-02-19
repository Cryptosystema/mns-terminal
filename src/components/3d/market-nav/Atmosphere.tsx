import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AtmosphereProps {
  fogColor: string
  particleColor: string
}

const PARTICLE_COUNT = 600

export function Atmosphere({ fogColor, particleColor }: AtmosphereProps) {
  const meshRef = useRef<THREE.Points>(null)

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14
      positions[i * 3 + 2] = (Math.random() - 0.5) * 45
      sizes[i] = 0.03 + Math.random() * 0.07
    }
    return { positions, sizes }
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [positions, sizes])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.003
    meshRef.current.position.z += delta * 0.04
    if (meshRef.current.position.z > 5) meshRef.current.position.z = -5
  })

  return (
    <>
      <fog attach="fog" args={[fogColor, 8, 55]} />
      <points ref={meshRef} geometry={geo}>
        <pointsMaterial
          color={particleColor} size={0.06} transparent opacity={0.45}
          sizeAttenuation depthWrite={false}
        />
      </points>
    </>
  )
}
