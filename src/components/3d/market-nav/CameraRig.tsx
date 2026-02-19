import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export function CameraRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 8, 20)
    camera.lookAt(0, 0, -10)
  }, [camera])
  return null
}
