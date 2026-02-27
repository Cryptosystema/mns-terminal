import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function CameraRig() {
  const { camera } = useThree()
  useEffect(() => {
    // Isometric-style: front-right, elevated ~35 degrees
    camera.position.set(18, 14, 22)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}
