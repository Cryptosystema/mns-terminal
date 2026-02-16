/// <reference path="../../../types/three.d.ts" />
/// <reference path="../../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { MarketNavigationData } from './utils/types'
import { getRegimeConfig } from './utils/regimeConfig'

interface Props {
  data: MarketNavigationData
}

export function SceneLighting({ data }: Props) {
  const config = getRegimeConfig(data.regime)
  
  return (
    <>
      {/* Ambient base light */}
      <ambientLight intensity={0.2} color={config.lightColor} />
      
      {/* Main directional light */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        color="#ffffff"
        castShadow
      />
      
      {/* Accent point light (top) */}
      <pointLight
        position={[0, 10, 0]}
        intensity={1.5}
        color={config.lightColor}
        distance={50}
      />
      
      {/* Secondary point light (side) */}
      <pointLight
        position={[-15, 5, -15]}
        intensity={0.8}
        color={config.surfaceColor}
      />
    </>
  )
}
