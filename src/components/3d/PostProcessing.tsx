import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

interface PostProcessingProps {
  enabled?: boolean
  bloomIntensity?: number
}

export function PostProcessing({ 
  enabled = true,
  bloomIntensity = 0.5 
}: PostProcessingProps) {
  if (!enabled) return null

  return (
    <EffectComposer>
      {/* Bloom effect for glow */}
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        blendFunction={BlendFunction.SCREEN}
      />
    </EffectComposer>
  )
}
