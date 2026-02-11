// Forecast data types for 3D visualization

export interface PredictionPoint {
  day: number
  p10: number
  p50: number
  p90: number
  timestamp: number
}

export interface RegimeData {
  stress: 'NORMAL' | 'MODERATE' | 'HIGH' | 'EXTREME'
  volatility: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  liquidity: 'HIGH' | 'MODERATE' | 'LOW'
}

export interface ForecastData {
  tiers: {
    tier0: {
      symbol: string
      horizon: string
      predictions: PredictionPoint[]
      confidence: number
    }
    tier1: {
      bias: string
      stability: string
    }
    tier2: {
      liquidity_state: string
      drivers: string[]
      blockers: string[]
    }
  }
  regime: RegimeData
  timestamp: number
}

// Mock data generator for testing
export function generateMockForecastData(): ForecastData {
  const basePrice = 45000
  const predictions: PredictionPoint[] = []
  
  for (let day = 1; day <= 7; day++) {
    const trend = day * 500
    const volatility = 2000 + (day * 200)
    
    predictions.push({
      day,
      p10: basePrice + trend - volatility,
      p50: basePrice + trend,
      p90: basePrice + trend + volatility,
      timestamp: Date.now() + (day * 24 * 60 * 60 * 1000)
    })
  }
  
  return {
    tiers: {
      tier0: {
        symbol: 'BTC',
        horizon: '7d',
        predictions,
        confidence: 0.85
      },
      tier1: {
        bias: 'BULLISH',
        stability: 'MODERATE'
      },
      tier2: {
        liquidity_state: 'HIGH',
        drivers: ['Institutional adoption', 'Network growth'],
        blockers: ['Regulatory uncertainty']
      }
    },
    regime: {
      stress: 'NORMAL',
      volatility: 'MODERATE',
      trend: 'BULLISH',
      liquidity: 'HIGH'
    },
    timestamp: Date.now()
  }
}
