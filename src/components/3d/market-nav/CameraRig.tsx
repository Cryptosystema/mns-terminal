import { useEffect } from "react"
import { useThree } from "@react-three/fiber"

export function CameraRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 18, 28)
    camera.lookAt(0, -2, -8)
  }, [camera])
  return null
}
