import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera } from 'three'
import { CameraConfig } from '@/types/3d'

const DEFAULT_CAMERA: CameraConfig = {
  position: [0, 5, 15],
  fov: 75,
  near: 0.1,
  far: 1000
}

export function CameraControls({ config = DEFAULT_CAMERA }: { config?: CameraConfig }) {
  const { camera } = useThree()

  useEffect(() => {
    // Set camera position
    camera.position.set(...config.position)
    
    // Only set fov if it's a PerspectiveCamera
    if (camera instanceof PerspectiveCamera) {
      camera.fov = config.fov
      camera.near = config.near
      camera.far = config.far
      camera.updateProjectionMatrix()
    }
  }, [camera, config])

  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.08}          // Slightly higher for smoother inertia
      rotateSpeed={0.5}              // Slower rotation for premium feel
      enableZoom={true}
      zoomSpeed={0.6}                // Controlled zoom
      enablePan={false}
      enableRotate={true}
      autoRotate={true}
      autoRotateSpeed={0.115}        // 0.002 rad/sec = 0.115 deg/sec
      minDistance={40}
      maxDistance={120}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2.3}
      target={[0, 0, 0]}
    />
  )
}
