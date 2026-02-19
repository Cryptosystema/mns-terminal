import { RegimeColorSet } from './MetricPeaks'

interface LightingProps {
  colors: RegimeColorSet
}

export function Lighting({ colors }: LightingProps) {
  return (
    <>
      <ambientLight intensity={0.08} color="#000d1a" />
      <directionalLight position={[0, 20, 10]} intensity={0.15} color={colors.glow} />
      <hemisphereLight args={['#001833', '#000000', 0.2]} />
    </>
  )
}
