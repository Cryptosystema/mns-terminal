/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { getRegimeTheme, type RegimeType } from './config/regimePalette'

interface EnvironmentProps {
  regime?: RegimeType
}

export function Environment({ regime = 'NORMAL' }: EnvironmentProps) {
  const theme = getRegimeTheme(regime)

  return (
    <group>
      <gridHelper
        args={[60, 60, theme.grid, theme.grid]}
        rotation={[0, 0, 0]}
        position={[0, -5, 0]}
      />
    </group>
  )
}
