import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export function CameraRig() {
  const { camera } = useThree()
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    const breathX = Math.sin(timeRef.current * 0.18) * 0.06
    camera.position.x = breathX
    camera.position.y = -7 + Math.sin(timeRef.current * 0.12) * 0.04
    camera.position.z = 4 + Math.sin(timeRef.current * 0.09) * 0.1
    camera.lookAt(breathX * 0.3, -8, -20)
  })

  return null
}
