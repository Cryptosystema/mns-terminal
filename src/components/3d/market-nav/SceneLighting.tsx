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
      {/* Ambient base light - boosted */}
      <ambientLight intensity={0.3} color={config.lightColor} />
      
      {/* KEY LIGHT - Main directional light */}
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        color="#ffffff"
        castShadow={false}
      />
      
      {/* FILL LIGHT - Soften shadows */}
      <directionalLight
        position={[-10, 5, -5]}
        intensity={0.4}
        color={config.lightColor}
      />
      
      {/* RIM LIGHT - Edge glow */}
      <directionalLight
        position={[0, 5, -15]}
        intensity={0.6}
        color={config.surfaceColor}
      />
      
      {/* DRAMATIC POINT LIGHT - Top */}
      <pointLight
        position={[0, 12, 0]}
        intensity={2.0}
        color={config.lightColor}
        distance={40}
        decay={2}
      />
      
      {/* ACCENT POINT LIGHT - Side */}
      <pointLight
        position={[-12, 8, -12]}
        intensity={1.2}
        color={config.surfaceColor}
        distance={35}
        decay={2}
      />
    </>
  )
}
