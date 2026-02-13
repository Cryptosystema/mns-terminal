/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { LightConfig } from '@/types/3d'
import { getRegimeTheme, type RegimeType } from './config/regimePalette'

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
}

export function Lighting({ config = DEFAULT_LIGHTS, regime = 'NORMAL' }: LightingProps) {
  const theme = getRegimeTheme(regime)

  return (
    <>
      <ambientLight
        color={config.ambient.color}
        intensity={config.ambient.intensity}
      />

      <directionalLight
        color={config.directional.color}
        intensity={config.directional.intensity}
        position={config.directional.position}
        castShadow
      />

      <directionalLight
        color="#b8d4ff"
        intensity={0.6}
        position={[-10, 5, 10]}
      />

      <directionalLight
        color={theme.glow}
        intensity={0.8}
        position={[0, 5, -15]}
      />

      {config.point && (
        <pointLight
          color={theme.glow}
          intensity={config.point.intensity}
          position={config.point.position}
          distance={60}
          decay={2}
        />
      )}

      <fog attach="fog" args={[theme.fog, 20, 80]} />
    </>
  )
}
