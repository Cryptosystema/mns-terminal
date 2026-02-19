/**
 * MetricPeaks — Peak definitions & data mapping
 * 
 * Defines 15 peaks: 9 data-driven + 6 aesthetic.
 * Each peak maps to a backend API field with a normalizer
 * that converts raw data values to 0–1 multipliers.
 */

export interface PeakDefinition {
  id: string
  label: string
  position: { x: number; z: number } // Normalized -1 to 1
  dataPath: string | null             // JSONPath in API response (null = aesthetic)
  baseHeight: number                   // 0.8 to 5.0
  normalizer: (value: any) => number   // Convert data to 0-1 multiplier
  category: 'forecast' | 'regime' | 'market'
}

// ─── Data-driven peaks (9) ────────────────────────────────────────

const FORECAST_PEAKS: PeakDefinition[] = [
  {
    id: 'p50',
    label: 'P50 Median',
    position: { x: 0, z: 0 },
    dataPath: 'tier0.p50',
    baseHeight: 5.0,
    category: 'forecast',
    normalizer: () => 1.0 // Always tallest (central arch)
  },
  {
    id: 'p10',
    label: 'P10 Lower',
    position: { x: -0.8, z: -0.3 },
    dataPath: 'tier0.p10',
    baseHeight: 4.0,
    category: 'forecast',
    normalizer: () => 0.7
  },
  {
    id: 'p90',
    label: 'P90 Upper',
    position: { x: 0.8, z: -0.3 },
    dataPath: 'tier0.p90',
    baseHeight: 5.5,
    category: 'forecast',
    normalizer: () => 0.9
  },
  {
    id: 'p25',
    label: 'P25 Quartile',
    position: { x: -0.5, z: -0.1 },
    dataPath: 'tier0.p25',
    baseHeight: 4.5,
    category: 'forecast',
    normalizer: () => 0.75
  },
  {
    id: 'p75',
    label: 'P75 Quartile',
    position: { x: 0.5, z: -0.1 },
    dataPath: 'tier0.p75',
    baseHeight: 5.0,
    category: 'forecast',
    normalizer: () => 0.85
  }
]

const REGIME_PEAKS: PeakDefinition[] = [
  {
    id: 'volatility',
    label: 'Volatility',
    position: { x: -0.3, z: 0.7 },
    dataPath: 'regimes.volatility_regime',
    baseHeight: 4.0,
    category: 'regime',
    normalizer: (v: any) =>
      ({ LOW: 0.3, MODERATE: 0.6, HIGH: 0.9 } as Record<string, number>)[v] ?? 0.5
  },
  {
    id: 'stress',
    label: 'Stress',
    position: { x: 0.3, z: 0.7 },
    dataPath: 'regimes.stress_regime',
    baseHeight: 3.8,
    category: 'regime',
    normalizer: (v: any) =>
      ({ NORMAL: 0.2, ELEVATED: 0.6, CRITICAL: 1.0 } as Record<string, number>)[v] ?? 0.3
  }
]

const MARKET_PEAKS: PeakDefinition[] = [
  {
    id: 'confidence',
    label: 'Confidence',
    position: { x: -0.6, z: 0.3 },
    dataPath: 'tier0.confidence',
    baseHeight: 4.5,
    category: 'market',
    normalizer: (v: any) => (typeof v === 'number' ? v : 0.7)
  },
  {
    id: 'liquidity',
    label: 'Liquidity',
    position: { x: 0.6, z: 0.3 },
    dataPath: 'tier2.liquidity_state',
    baseHeight: 4.2,
    category: 'market',
    normalizer: (v: any) =>
      ({ SHALLOW: 0.3, NORMAL: 0.6, DEEP: 0.9 } as Record<string, number>)[v] ?? 0.6
  }
]

// ─── Aesthetic peaks (6) — constant height, no data ───────────────

const AESTHETIC_PEAKS: PeakDefinition[] = [
  { id: 'aesthetic_1', label: '', position: { x: -0.85, z: 0.15 }, dataPath: null, baseHeight: 2.5, category: 'forecast', normalizer: () => 1.0 },
  { id: 'aesthetic_2', label: '', position: { x: 0.85, z: 0.2 },  dataPath: null, baseHeight: 2.8, category: 'forecast', normalizer: () => 1.0 },
  { id: 'aesthetic_3', label: '', position: { x: -0.65, z: -0.65 }, dataPath: null, baseHeight: 2.2, category: 'forecast', normalizer: () => 1.0 },
  { id: 'aesthetic_4', label: '', position: { x: 0.7, z: -0.55 },  dataPath: null, baseHeight: 2.4, category: 'forecast', normalizer: () => 1.0 },
  { id: 'aesthetic_5', label: '', position: { x: -0.4, z: -0.85 }, dataPath: null, baseHeight: 2.0, category: 'forecast', normalizer: () => 1.0 },
  { id: 'aesthetic_6', label: '', position: { x: 0.45, z: -0.8 },  dataPath: null, baseHeight: 2.1, category: 'forecast', normalizer: () => 1.0 }
]

// ─── All 15 peaks ─────────────────────────────────────────────────

export const PEAKS: PeakDefinition[] = [
  ...FORECAST_PEAKS,
  ...REGIME_PEAKS,
  ...MARKET_PEAKS,
  ...AESTHETIC_PEAKS
]

// ─── Helpers ──────────────────────────────────────────────────────

/** Safely traverse nested object by dot-path */
export function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return null
  return path.split('.').reduce((curr, key) => curr?.[key], obj)
}

/**
 * Compute peak heights from live API data.
 * Returns array of heights in PEAKS order.
 */
export function computePeakHeights(
  apiData: any,
  regimesData: any
): number[] {
  const merged = { ...apiData, regimes: regimesData }

  console.log('[computePeakHeights] Input:', { apiData, regimesData })

  const heights = PEAKS.map((peak, index) => {
    if (!peak.dataPath) {
      const h = peak.baseHeight * peak.normalizer(null)
      console.log(`[computePeakHeights] Peak ${index} (${peak.id}): aesthetic, height=${h.toFixed(2)}`)
      return h
    }
    const rawValue = getNestedValue(merged, peak.dataPath)
    const multiplier = peak.normalizer(rawValue)
    const h = peak.baseHeight * multiplier
    console.log(`[computePeakHeights] Peak ${index} (${peak.id}): raw=${rawValue}, mult=${multiplier.toFixed(2)}, height=${h.toFixed(2)}`)
    return h
  })

  console.log('[computePeakHeights] Final heights:', heights)
  return heights
}

// ─── Regime color system ──────────────────────────────────────────

export interface RegimeColorSet {
  surface: string
  glow: string
  wireframe: string
  particles: string
  fog: string
}

export const REGIME_COLORS: Record<string, RegimeColorSet> = {
  NORMAL: {
    surface: '#00C2FF',
    glow: '#66E0FF',
    wireframe: '#00E5FF',
    particles: '#4a9eff',
    fog: '#000306'
  },
  COMPRESSION: {
    surface: '#7C3AED',
    glow: '#A78BFA',
    wireframe: '#9D8DFF',
    particles: '#8B7FFF',
    fog: '#0a051a'
  },
  ELEVATED_STRESS: {
    surface: '#F59E0B',
    glow: '#FCD34D',
    wireframe: '#FFB84D',
    particles: '#FFA94D',
    fog: '#1a0f04'
  },
  CRITICAL: {
    surface: '#B91C1C',
    glow: '#EF4444',
    wireframe: '#FF4444',
    particles: '#FF6B6B',
    fog: '#1a0404'
  }
}

/** Map backend stress string → display regime key */
export function mapRegime(stress: string | undefined): string {
  switch (stress) {
    case 'EXTREME': return 'CRITICAL'
    case 'HIGH': return 'ELEVATED_STRESS'
    case 'MODERATE': return 'COMPRESSION'
    default: return 'NORMAL'
  }
}

/** Get color set for a regime, with NORMAL fallback */
export function getRegimeColors(regime: string): RegimeColorSet {
  return REGIME_COLORS[regime] || REGIME_COLORS.NORMAL
}
