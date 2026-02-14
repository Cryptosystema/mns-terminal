/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { CameraControls } from './CameraControls'
import { Lighting } from './Lighting'
import { ProbabilitySurface } from './ProbabilitySurface'
import { ParticleSystem } from './ParticleSystem'
import { MarketSurface } from './MarketSurface'
import { Environment } from './Environment'
import { ShareControlsUI } from './ShareControls'
import { Scene3DProps } from '@/types/3d'
import { generateMockForecastData } from '@/types/forecast'
import { use3DEnabled } from '@/hooks/3d/use3DEnabled'
import { useAdaptiveQuality } from './PerformanceSettings'
import { usePerformanceMonitor } from '@/hooks/3d/usePerformanceMonitor'
import type { RegimeType } from './config/regimePalette'
import { computeRegimeVisualState, validatePerformanceConstraints, getFogParameters } from './engine/RegimeVisualEngine'

function LoadingFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0e14',
      color: '#8b949e',
      fontFamily: 'monospace'
    }}>
      Loading 3D Scene...
    </div>
  )
}

function mapRegimeToType(stress?: string): RegimeType {
  switch (stress) {
    case 'EXTREME':
      return 'CRITICAL'
    case 'HIGH':
      return 'ELEVATED_STRESS'
    case 'MODERATE':
      return 'COMPRESSION'
    default:
      return 'NORMAL'
  }
}

export function Scene3D({ data, onInteraction }: Scene3DProps) {
  void onInteraction
  
  const is3DEnabled = use3DEnabled()
  const quality = useAdaptiveQuality(is3DEnabled)
  const metrics = usePerformanceMonitor(is3DEnabled)
  
  const forecastData = useMemo(() => {
    return data || generateMockForecastData()
  }, [data])
  
  const regime = mapRegimeToType(forecastData.regime?.stress)
  
  // Compute semantic visual state from regime and confidence
  const visualState = useMemo(() => {
    const confidence = forecastData.tiers?.tier0?.confidence ?? 0.75
    const rawState = computeRegimeVisualState(regime, confidence)
    return validatePerformanceConstraints(rawState)
  }, [regime, forecastData.tiers?.tier0?.confidence])
  
  const fogParams = useMemo(() => getFogParameters(visualState), [visualState])
  
  // Extract market parameters for surface
  const marketParams = useMemo(() => ({
    confidence: forecastData.tiers?.tier0?.confidence ?? 0.75,
    volatility: forecastData.regime?.volatility ?? 0.5
  }), [forecastData])
  
  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 5, 15], fov: 75 }}
          style={{ background: '#0a0e14' }}
          gl={{ 
            antialias: quality.antialiasing,
            alpha: true,
            powerPreference: 'high-performance'
          }}
          dpr={quality.pixelRatio}
          onCreated={({ scene }) => {
            // Apply semantic fog depth
            scene.fog = new THREE.Fog(
              fogParams.color,
              fogParams.near,
              fogParams.far
            )
          }}
        >
          <Lighting 
            regime={regime}
            visualState={visualState}
          />
          <CameraControls />
          
          <MarketSurface 
            regime={regime}
            visualState={visualState}
            confidence={marketParams.confidence}
            volatility={marketParams.volatility}
          />
          
          <ProbabilitySurface 
            forecastData={forecastData}
            tunnelLength={50}
            tunnelRadius={5}
            regime={regime}
          />

          <ParticleSystem 
            count={quality.particleCount}
            regime={regime}
            visualState={visualState}
          />
          
          <Environment regime={regime} />
        </Canvas>
      </Suspense>

      <ShareControlsUI />

      {import.meta.env.DEV && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.7)',
          color: '#00ff88',
          padding: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          borderRadius: '4px'
        }}>
          <div>3D Scene Active</div>
          <div>FPS: {metrics.fps}</div>
          <div>Quality: {quality.particleCount}p</div>
          <div>Mem: {metrics.memory}MB</div>
          <div>Regime: {regime}</div>
        </div>
      )}
    </div>
  )
}
