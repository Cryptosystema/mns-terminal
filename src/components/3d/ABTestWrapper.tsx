import { useState, useEffect } from 'react'

export function ABTestWrapper({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<'3D' | '2D'>('3D')

  useEffect(() => {
    // Simple A/B test: 50% get 3D, 50% get 2D
    const userHash = Math.random()
    const assigned = userHash < 0.5 ? '3D' : '2D'
    setVariant(assigned)

    // Log to analytics (placeholder)
    if (import.meta.env.DEV) {
      console.log('A/B Test Variant:', assigned, '(using variant:', variant, ')')
    }

    // Track engagement
    const startTime = Date.now()
    return () => {
      const sessionDuration = Date.now() - startTime
      if (import.meta.env.DEV) {
        console.log('Session duration:', sessionDuration, 'ms, Variant:', assigned)
      }
    }
  }, [])

  return <>{children}</>
}
