import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { TunnelGeometry } from './TunnelGeometry'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { Atmosphere } from './Atmosphere'
import { useMarketData } from './hooks/useMarketData'
import { usePeakAnimation } from './hooks/usePeakAnimation'
import { PEAKS, computePeakHeights, mapRegime } from './MetricPeaks'

function getRegimeColor(regime: string): string {
  switch (regime) {
    case 'CRITICAL':        return '#FF6B00'
    case 'ELEVATED_STRESS': return '#FF6B00'
    case 'COMPRESSION':     return '#FFD700'
    default:                return '#00E5FF'
  }
}

function LoadingScreen() {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#000306',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#00E5FF', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.1em'
    }}>
      INITIALIZING MARKET NAVIGATION...
    </div>
  )
}

interface SceneInnerProps {
  peakHeights: number[]
  regime: string
}

function SceneInner({ peakHeights, regime }: SceneInnerProps) {
  const color = getRegimeColor(regime)
  return (
    <>
      <CameraRig />
      <Lighting color={color} />
      <Atmosphere fogColor="#000306" particleColor={color} />
      <TunnelGeometry
        peaks={peakHeights}
        regime={regime}
        color={color}
      />
    </>
  )
}

export function MarketNavigationScene() {
  const { data, regimes, loading } = useMarketData()

  const regime = useMemo(() => mapRegime(regimes?.stress_regime), [regimes])

  const targetHeights = useMemo(
    () => data
      ? computePeakHeights(data, regimes)
      : PEAKS.map((p) => p.baseHeight * p.normalizer(null)),
    [data, regimes]
  )

  const animatedHeights = usePeakAnimation(targetHeights, 1200)

  if (loading) return <LoadingScreen />

  return (
    <div style={{ width: '100%', height: '540px' }}>
      <Canvas
        camera={{ position: [18, 14, 22], fov: 50, near: 0.1, far: 300 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        dpr={[1, 2]}
        style={{ background: '#000306' }}
      >
        <SceneInner peakHeights={animatedHeights} regime={regime} />
      </Canvas>
    </div>
  )
}

export default MarketNavigationScene
