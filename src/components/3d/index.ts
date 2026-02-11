// Public API - only export what's needed
export { Scene3D } from './Scene3D'
export type { Scene3DProps } from '@/types/3d'

// Hooks
export { use3DEnabled } from '@/hooks/3d/use3DEnabled'
export { usePerformanceMonitor } from '@/hooks/3d/usePerformanceMonitor'

// Types and utilities
export type { ForecastData, PredictionPoint, RegimeData } from '@/types/forecast'
export { generateMockForecastData } from '@/types/forecast'

// Internal components NOT exported:
// - TunnelGeometry (internal)
// - CameraControls (internal)
// - Lighting (internal)
// - ProbabilitySurface (internal)
// - ProbabilityLine (internal)
// - DataPointMarker (internal)
