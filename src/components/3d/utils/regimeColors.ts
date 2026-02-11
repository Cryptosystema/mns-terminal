import type { RegimeData } from '@/types/forecast'

export function getRegimeColor(regime: RegimeData): string {
  // Normal market: Blue tones
  if (regime.stress === 'NORMAL' && regime.volatility === 'LOW') {
    return '#0088ff'
  }
  
  // Moderate volatility: Green-blue
  if (regime.volatility === 'MODERATE') {
    return '#00ffaa'
  }
  
  // High stress: Orange-red
  if (regime.stress === 'HIGH' || regime.volatility === 'HIGH') {
    return '#ff8800'
  }
  
  // Crisis: Red
  if (regime.stress === 'EXTREME') {
    return '#ff0000'
  }
  
  // Default
  return '#00ff88'
}

export function getRegimeGradient(
  startRegime: RegimeData,
  endRegime: RegimeData
): [string, string] {
  return [
    getRegimeColor(startRegime),
    getRegimeColor(endRegime)
  ]
}
