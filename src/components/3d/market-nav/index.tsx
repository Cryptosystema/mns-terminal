import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { TunnelGeometry } from './TunnelGeometry'

export interface MarketNavigationData {
  predictions?: Array<{ day: number; p10: number; p50: number; p90: number }>
  regime?: { stress?: string }
  volatility?: number
  confidence?: number
  stress?: number
}

export function MarketNavigationScene() {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas camera={{ position: [0, 4, 15], fov: 75 }} style={{ background: '#001020' }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 6, 0]} intensity={4} color="#00ff88" />
        <TunnelGeometry />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export { MarketNavigationScene as default }
