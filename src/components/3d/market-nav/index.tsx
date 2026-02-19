import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { TunnelGeometry } from './TunnelGeometry'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { Atmosphere } from './Atmosphere'
import { useMarketData } from './hooks/useMarketData'
import { usePeakAnimation } from './hooks/usePeakAnimation'
import { PEAKS, computePeakHeights, mapRegime, getRegimeColors } from './MetricPeaks'

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
  const colors = getRegimeColors(regime)
  return (
    <>
      <CameraRig />
      <Lighting colors={colors} />
      <Atmosphere fogColor={colors.fog} particleColor={colors.particles} />
      <TunnelGeometry
        peakHeights={peakHeights}
        regimeColor={colors.surface}
        wireframeColor={colors.wireframe}
        glowColor={colors.glow}
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
  const colors = getRegimeColors(regime)

  if (loading) return <LoadingScreen />

  return (
    <div style={{ width: '100%', height: '540px' }}>
      <Canvas
        camera={{ position: [0, -1, 12], fov: 75, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        dpr={[1, 2]}
        style={{ background: colors.fog }}
      >
        <SceneInner peakHeights={animatedHeights} regime={regime} />
      </Canvas>
    </div>
  )
}

export default MarketNavigationScene
