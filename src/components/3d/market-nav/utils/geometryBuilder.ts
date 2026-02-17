import * as THREE from 'three'
import { ForecastDataPoint } from './types'

export function buildTopologyGeometry(
  predictions: ForecastDataPoint[],
  volatility: number
): THREE.BufferGeometry {
  const segments = 64  // High quality mesh
  const size = 40      // Scene size
  
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  const positions = geometry.attributes.position.array as Float32Array
  
  // Calculate median price for normalization
  const medianPrices = predictions.map(p => p.p50)
  const overallMedian = medianPrices.reduce((a, b) => a + b, 0) / medianPrices.length
  
  // Calculate confidence (tightness of distribution)
  const avgSpread = predictions.reduce((sum, p) => sum + (p.p90 - p.p10), 0) / predictions.length
  const confidence = 1 - Math.min(avgSpread / overallMedian, 0.5) * 2
  
  // Transform flat plane to organic mountain landscape
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    
    // Normalize coordinates to 0-1 range
    const normalizedX = (x + size / 2) / size
    const normalizedY = (y + size / 2) / size
    
    // Map X to time axis (forecast days)
    const dayIndex = Math.floor(normalizedX * (predictions.length - 1))
    const currentDay = predictions[Math.min(dayIndex, predictions.length - 1)]
    const nextDay = predictions[Math.min(dayIndex + 1, predictions.length - 1)]
    
    // Interpolate between days
    const dayFraction = (normalizedX * (predictions.length - 1)) % 1
    const p10 = currentDay.p10 + (nextDay.p10 - currentDay.p10) * dayFraction
    const p50 = currentDay.p50 + (nextDay.p50 - currentDay.p50) * dayFraction
    const p90 = currentDay.p90 + (nextDay.p90 - currentDay.p90) * dayFraction
    
    // Map Y to probability range (P10 to P90)
    const priceAtPoint = p10 + (p90 - p10) * normalizedY
    
    // NORMALIZED DEVIATION (not raw prices!)
    const deviation = (priceAtPoint - p50) / p50  // Gives -0.05 to +0.05 range
    const baseHeight = deviation * 20  // Scale to scene (-1 to +1 range)
    
    // Add organic noise - multiple sine wave frequencies
    const noise1 = Math.sin(x * 0.25) * Math.cos(y * 0.18) * volatility * 3
    const noise2 = Math.sin(x * 0.5 + normalizedY * 10) * 0.5 * volatility
    const noise3 = Math.cos(x * 0.15 + y * 0.22) * volatility * 1.5
    
    // Central peak (probability concentration)
    const distFromCenter = Math.sqrt(x * x + y * y) / (size / 2)
    const centralBoost = (1 - Math.min(distFromCenter, 1)) * confidence * 4
    
    // Combine all height components
    let finalHeight = baseHeight + noise1 + noise2 + noise3 + centralBoost
    
    // Ensure height range is -2 to +8
    finalHeight = Math.max(-2, Math.min(8, finalHeight))
    
    // Set final Z position
    positions[i + 2] = finalHeight
  }
  
  // Recalculate normals for proper lighting
  geometry.computeVertexNormals()
  
  return geometry
}
