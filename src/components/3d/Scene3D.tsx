/// <reference path="../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { TunnelGeometry } from './TunnelGeometry'
import { CameraControls } from './CameraControls'
import { Lighting } from './Lighting'
import { ProbabilitySurface } from './ProbabilitySurface'
import { Scene3DProps } from '@/types/3d'
import { generateMockForecastData } from '@/types/forecast'

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

export function Scene3D({ data, onInteraction }: Scene3DProps) {
  // Placeholder for future use of onInteraction
  void onInteraction
  
  // Use provided data or generate mock data for development
  const forecastData = useMemo(() => {
    return data || generateMockForecastData()
  }, [data])
  
  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 5, 15], fov: 75 }}
          style={{ background: '#0a0e14' }}
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
        >
          <Lighting />
          <CameraControls />
          <TunnelGeometry regime={forecastData.regime} />
          
          {/* Probability surfaces */}
          <ProbabilitySurface 
            forecastData={forecastData}
            tunnelLength={50}
            tunnelRadius={5}
          />
          
          {/* Grid helper for development */}
          {import.meta.env.DEV && (
            <gridHelper args={[50, 50, '#333333', '#1a1a1a']} />
          )}
        </Canvas>
      </Suspense>

      {/* Performance overlay (dev only) */}
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
          3D Scene Active
        </div>
      )}
    </div>
  )
}
