/**
 * CameraRig — Camera INSIDE tunnel, looking through arch depth
 */

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export function CameraRig() {
  const { camera } = useThree()
  const timeRef = useRef(0)
  const initRef = useRef(false)

  useFrame((_, delta) => {
    timeRef.current += delta
    if (!initRef.current) {
      camera.position.set(0, -1, 12)
      initRef.current = true
    }
    const breathX = Math.sin(timeRef.current * 0.18) * 0.08
    const breathY = Math.sin(timeRef.current * 0.12) * 0.05
    camera.position.x = breathX
    camera.position.y = -5 + breathY
    camera.position.z = 6 + Math.sin(timeRef.current * 0.09) * 0.15
    camera.lookAt(breathX * 0.3, -6, -15)
  })

  return null
}
