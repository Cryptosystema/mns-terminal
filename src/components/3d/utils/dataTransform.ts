import type { ForecastData } from '@/types/forecast'

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface ProbabilitySurface {
  p10: Point3D[]
  p50: Point3D[]
  p90: Point3D[]
}

/**
 * Transform forecast data to 3D coordinates
 * 
 * Mapping:
 * - X axis: Time (0 to length of tunnel)
 * - Y axis: Price (scaled to fit tunnel radius)
 * - Z axis: Depth in tunnel
 */
export function transformForecastTo3D(
  forecastData: ForecastData,
  tunnelLength: number = 50,
  tunnelRadius: number = 5
): ProbabilitySurface {
  const predictions = forecastData.tiers.tier0.predictions
  const days = predictions.length

  // Find price range for scaling
  const allPrices = predictions.flatMap(p => [p.p10, p.p50, p.p90])
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const priceRange = maxPrice - minPrice

  // Transform each prediction to 3D point
  const p10Points: Point3D[] = []
  const p50Points: Point3D[] = []
  const p90Points: Point3D[] = []

  predictions.forEach((pred, index) => {
    // X: position along tunnel (0 to tunnelLength)
    const x = (index / (days - 1)) * tunnelLength - tunnelLength / 2

    // Y: price scaled to tunnel radius
    // Scale prices to fit within tunnel radius (with some margin)
    const maxRadius = tunnelRadius * 0.8
    const scaleY = (price: number) => {
      return ((price - minPrice) / priceRange - 0.5) * maxRadius * 2
    }

    // Z: offset for each band (to separate them visually)
    const zOffset = 0 // All on same z-plane for now

    p10Points.push({
      x,
      y: scaleY(pred.p10),
      z: zOffset
    })

    p50Points.push({
      x,
      y: scaleY(pred.p50),
      z: zOffset
    })

    p90Points.push({
      x,
      y: scaleY(pred.p90),
      z: zOffset
    })
  })

  return { p10: p10Points, p50: p50Points, p90: p90Points }
}

/**
 * Create geometry vertices for probability band
 * Returns array of Vector3 points for Line or Mesh
 */
export function createBandVertices(points: Point3D[]): number[] {
  const vertices: number[] = []
  
  points.forEach(point => {
    vertices.push(point.x, point.y, point.z)
  })
  
  return vertices
}
