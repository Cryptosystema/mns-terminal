/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { LightConfig } from '@/types/3d'
import { getRegimeTheme, type RegimeType } from './config/regimePalette'
import type { RegimeVisualState } from './engine/RegimeVisualEngine'

const DEFAULT_LIGHTS: LightConfig = {
  ambient: {
    color: '#ffffff',
    intensity: 0.6
  },
  directional: {
    color: '#ffffff',
    intensity: 1.2,
    position: [5, 8, 15]
  },
  point: {
    color: '#00ff88',
    intensity: 2,
    position: [0, 0, 5]
  }
}

interface LightingProps {
  config?: LightConfig
  regime?: RegimeType
  visualState?: RegimeVisualState
}

export function Lighting({ config = DEFAULT_LIGHTS, regime = 'NORMAL', visualState }: LightingProps) {
  const theme = getRegimeTheme(regime)
  
  // Use visual state for intelligent lighting adjustments
  const ambientIntensity = visualState?.ambientIntensity ?? config.ambient.intensity
  const glowIntensity = visualState?.glowIntensity ?? 0.8
  
  // Regime-driven key light intensity and color
  const keyLightIntensity = regime === 'CRITICAL' ? 2.0 : 
                           regime === 'ELEVATED_STRESS' ? 1.7 : 
                           regime === 'COMPRESSION' ? 1.5 : 1.4
  
  // Warmer hue for stress, cooler for normal
  const keyLightColor = regime === 'CRITICAL' ? '#ffb8a0' :
                       regime === 'ELEVATED_STRESS' ? '#ffd4b8' :
                       regime === 'COMPRESSION' ? '#dde8ff' : '#ffffff'

  return (
    <>
      {/* Hemisphere light for ambient depth */}
      <hemisphereLight
        color="#b8d4ff"
        groundColor="#0a1929"
        intensity={0.1}
      />
      
      <ambientLight
        color={config.ambient.color}
        intensity={0.1}
      />

      {/* Key light - top-left */}
      <directionalLight
        color={keyLightColor}
        intensity={keyLightIntensity}
        position={[-50, 60, 40]}
      />

      {/* Fill light */}
      <directionalLight
        color="#b8d4ff"
        intensity={0.4}
        position={[30, 30, 50]}
      />

      {/* Rim/back light behind peak */}
      <directionalLight
        color={theme.glow}
        intensity={1.2}
        position={[0, 50, -60]}
      />

      {config.point && (
        <pointLight
          color={theme.glow}
          intensity={config.point.intensity * (glowIntensity / 0.8)}
          position={config.point.position}
          distance={60}
          decay={2}
        />
      )}
    </>
  )
}
