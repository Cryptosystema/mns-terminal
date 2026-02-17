/// <reference path="../../../types/three.d.ts" />
// @ts-nocheck - Three.js JSX elements from React Three Fiber
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { MarketNavigationData } from './utils/types'
import { TopographySurface } from './TopographySurface'
import { WireframeGrid } from './WireframeGrid'
import { ParticleField } from './ParticleField'
import { SceneLighting } from './SceneLighting'
import { InfoPanels } from './InfoPanels'

interface Props {
  data: MarketNavigationData
}

export function MarketNavigationScene({ data }: Props) {
  return (
    <div
      style={{
        width: '100%',
        height: '600px',
        position: 'relative',
        background: '#0a0e14',
      }}
    >
      <Canvas
        camera={{ position: [0, 12, 22], fov: 65 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* Atmospheric fog for depth */}
        <fog attach="fog" args={['#0a0e14', 20, 60]} />
        
        <SceneLighting data={data} />
        <WireframeGrid />
        <TopographySurface data={data} />
        <ParticleField data={data} />
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={40}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.5}
          enablePan={false}
        />
        
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
      
      <InfoPanels data={data} />
      
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '16px',
          textAlign: 'center',
          opacity: 0.8,
        }}
      >
        <div>{data.regime} Market - {data.predictions.length}-Day Navigation</div>
      </div>
    </div>
  )
}
