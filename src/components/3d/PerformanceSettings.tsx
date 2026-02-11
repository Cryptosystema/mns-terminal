import { useEffect, useState } from 'react'
import { usePerformanceMonitor } from '@/hooks/3d/usePerformanceMonitor'

export interface QualitySettings {
  particleCount: number
  bloomEnabled: boolean
  antialiasing: boolean
  shadowsEnabled: boolean
  pixelRatio: number
}

const QUALITY_PRESETS = {
  LOW: {
    particleCount: 300,
    bloomEnabled: false,
    antialiasing: false,
    shadowsEnabled: false,
    pixelRatio: 1
  },
  MEDIUM: {
    particleCount: 600,
    bloomEnabled: true,
    antialiasing: true,
    shadowsEnabled: false,
    pixelRatio: 1.5
  },
  HIGH: {
    particleCount: 1000,
    bloomEnabled: true,
    antialiasing: true,
    shadowsEnabled: true,
    pixelRatio: 2
  }
}

export function useAdaptiveQuality(enabled: boolean): QualitySettings {
  const metrics = usePerformanceMonitor(enabled)
  const [quality, setQuality] = useState<keyof typeof QUALITY_PRESETS>('HIGH')

  useEffect(() => {
    if (!enabled) return

    // Adaptive quality based on FPS
    if (metrics.fps < 30 && metrics.fps > 0) {
      setQuality('LOW')
      console.warn('Low FPS detected, switching to LOW quality')
    } else if (metrics.fps < 50 && metrics.fps > 0) {
      setQuality('MEDIUM')
    } else if (metrics.fps >= 55) {
      setQuality('HIGH')
    }

    // Memory check
    if (metrics.memory > 150) {
      console.warn('High memory usage, reducing quality')
      setQuality(prev => prev === 'HIGH' ? 'MEDIUM' : 'LOW')
    }
  }, [metrics.fps, metrics.memory, enabled])

  return QUALITY_PRESETS[quality]
}

// Mobile detection and settings
function isMobileDevice(): boolean {
  return /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function getMobileQualitySettings(): Partial<QualitySettings> {
  const isMobile = isMobileDevice()
  
  if (!isMobile) {
    return {} // Use default high quality for desktop
  }

  // Mobile-specific settings
  return {
    particleCount: 200,
    bloomEnabled: false,
    antialiasing: false,
    shadowsEnabled: false,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5)
  }
}
