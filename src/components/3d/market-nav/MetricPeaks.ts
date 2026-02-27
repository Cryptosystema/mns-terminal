export interface PeakDefinition {
  id: string
  label: string
  position: { x: number; z: number }
  dataPath: string | null
  baseHeight: number
  normalizer: (value: any) => number
  category: 'forecast' | 'regime' | 'market'
}

const FORECAST_PEAKS: PeakDefinition[] = [
  { id: 'p50', label: 'P50 Median',   position: { x:  0, z:  0 }, dataPath: 'tier0.p50', baseHeight: 8.0, category: 'forecast', normalizer: () => 1.0 },
  { id: 'p10', label: 'P10 Lower',    position: { x: -5, z: -3 }, dataPath: 'tier0.p10', baseHeight: 3.5, category: 'forecast', normalizer: () => 0.75 },
  { id: 'p90', label: 'P90 Upper',    position: { x:  5, z: -3 }, dataPath: 'tier0.p90', baseHeight: 5.5, category: 'forecast', normalizer: () => 0.88 },
  { id: 'p25', label: 'P25 Quartile', position: { x: -3, z:  1 }, dataPath: 'tier0.p25', baseHeight: 4.5, category: 'forecast', normalizer: () => 0.80 },
  { id: 'p75', label: 'P75 Quartile', position: { x:  3, z:  1 }, dataPath: 'tier0.p75', baseHeight: 5.0, category: 'forecast', normalizer: () => 0.85 },
]

const REGIME_PEAKS: PeakDefinition[] = [
  {
    id: 'volatility', label: 'Volatility', position: { x: -8, z: 5 },
    dataPath: 'regimes.volatility_regime', baseHeight: 4.0, category: 'regime',
    normalizer: (v: any) => ({ LOW: 0.5, MODERATE: 0.75, HIGH: 1.0 } as Record<string,number>)[v] ?? 0.6
  },
  {
    id: 'stress', label: 'Stress', position: { x: 8, z: 5 },
    dataPath: 'regimes.stress_regime', baseHeight: 3.8, category: 'regime',
    normalizer: (v: any) => ({ NORMAL: 0.3, ELEVATED: 0.65, CRITICAL: 1.0 } as Record<string,number>)[v] ?? 0.4
  },
]

const MARKET_PEAKS: PeakDefinition[] = [
  {
    id: 'confidence', label: 'Confidence', position: { x: -6, z: 2 },
    dataPath: 'tier0.confidence', baseHeight: 4.2, category: 'market',
    normalizer: (v: any) => (typeof v === 'number' ? Math.max(0.3, v) : 0.7)
  },
  {
    id: 'liquidity', label: 'Liquidity', position: { x: 6, z: 2 },
    dataPath: 'tier2.liquidity_state', baseHeight: 3.8, category: 'market',
    normalizer: (v: any) => ({ SHALLOW: 0.35, NORMAL: 0.65, DEEP: 0.95 } as Record<string,number>)[v] ?? 0.65
  },
]

const AESTHETIC_PEAKS: PeakDefinition[] = [
  { id: 'a1', label: '', position: { x: -12, z:  2 }, dataPath: null, baseHeight: 2.5, category: 'forecast', normalizer: () => 1.0 },
  { id: 'a2', label: '', position: { x:  12, z:  3 }, dataPath: null, baseHeight: 2.8, category: 'forecast', normalizer: () => 1.0 },
  { id: 'a3', label: '', position: { x:  -9, z: -7 }, dataPath: null, baseHeight: 2.2, category: 'forecast', normalizer: () => 1.0 },
  { id: 'a4', label: '', position: { x:   9, z: -7 }, dataPath: null, baseHeight: 2.4, category: 'forecast', normalizer: () => 1.0 },
  { id: 'a5', label: '', position: { x:  -4, z:-10 }, dataPath: null, baseHeight: 1.8, category: 'forecast', normalizer: () => 1.0 },
  { id: 'a6', label: '', position: { x:   4, z:-10 }, dataPath: null, baseHeight: 2.0, category: 'forecast', normalizer: () => 1.0 },
]

export const PEAKS: PeakDefinition[] = [
  ...FORECAST_PEAKS, ...REGIME_PEAKS, ...MARKET_PEAKS, ...AESTHETIC_PEAKS
]

export function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return null
  return path.split('.').reduce((curr, key) => curr?.[key], obj)
}

export function computePeakHeights(apiData: any, regimesData: any): number[] {
  const merged = { ...apiData, regimes: regimesData }
  return PEAKS.map((peak) => {
    if (!peak.dataPath) return peak.baseHeight * peak.normalizer(null)
    const rawValue = getNestedValue(merged, peak.dataPath)
    return peak.baseHeight * peak.normalizer(rawValue)
  })
}

export interface RegimeColorSet {
  surface: string; glow: string; wireframe: string; particles: string; fog: string
}

export const REGIME_COLORS: Record<string, RegimeColorSet> = {
  NORMAL:          { surface: '#00C2FF', glow: '#00E5FF', wireframe: '#00E5FF', particles: '#4a9eff', fog: '#000306' },
  COMPRESSION:     { surface: '#7C3AED', glow: '#A78BFA', wireframe: '#9D8DFF', particles: '#8B7FFF', fog: '#07031a' },
  ELEVATED_STRESS: { surface: '#F59E0B', glow: '#FCD34D', wireframe: '#FFB84D', particles: '#FFA94D', fog: '#130a00' },
  CRITICAL:        { surface: '#B91C1C', glow: '#EF4444', wireframe: '#FF4444', particles: '#FF6B6B', fog: '#0f0000' },
}

export function mapRegime(stress: string | undefined): string {
  switch (stress) {
    case 'EXTREME':  return 'CRITICAL'
    case 'HIGH':     return 'ELEVATED_STRESS'
    case 'MODERATE': return 'COMPRESSION'
    default:         return 'NORMAL'
  }
}

export function getRegimeColors(regime: string): RegimeColorSet {
  return REGIME_COLORS[regime] || REGIME_COLORS.NORMAL
}
