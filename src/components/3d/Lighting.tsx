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
  const keyLightIntensity = regime === 'CRITICAL' ? 1.8 : 
                           regime === 'ELEVATED_STRESS' ? 1.5 : 
                           regime === 'COMPRESSION' ? 1.3 : 1.2
  
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
        intensity={0.4}
      />
      
      <ambientLight
        color={config.ambient.color}
        intensity={ambientIntensity * 0.5}
      />

      {/* Key light - regime-driven */}
      <directionalLight
        color={keyLightColor}
        intensity={keyLightIntensity}
        position={config.directional.position}
      />

      {/* Fill light */}
      <directionalLight
        color="#b8d4ff"
        intensity={0.5}
        position={[-10, 5, 10]}
      />

      {/* Rim/back light for depth and premium edge glow */}
      <directionalLight
        color={theme.glow}
        intensity={0.8}
        position={[0, -3, -20]}
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
