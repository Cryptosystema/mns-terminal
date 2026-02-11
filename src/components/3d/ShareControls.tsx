import { useState } from 'react'
import { useThree } from '@react-three/fiber'

export function ShareControls() {
  const { gl, scene, camera } = useThree()
  const [capturing, setCapturing] = useState(false)

  const captureScreenshot = () => {
    if (capturing) return
    setCapturing(true)

    try {
      // Render current scene
      gl.render(scene, camera)

      // Get canvas data
      const canvas = gl.domElement
      const dataURL = canvas.toDataURL('image/png')

      // Create watermarked image
      const img = new Image()
      img.onload = () => {
        const watermarkCanvas = document.createElement('canvas')
        const ctx = watermarkCanvas.getContext('2d')
        
        if (!ctx) {
          setCapturing(false)
          return
        }

        watermarkCanvas.width = canvas.width
        watermarkCanvas.height = canvas.height

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Add watermark
        ctx.font = '24px monospace'
        ctx.fillStyle = 'rgba(0, 255, 136, 0.8)'
        ctx.fillText('MNS Terminal - mns.com.ge', 20, canvas.height - 20)

        // Download
        const link = document.createElement('a')
        link.download = `btc-forecast-${Date.now()}.png`
        link.href = watermarkCanvas.toDataURL('image/png')
        link.click()

        setCapturing(false)
      }
      img.onerror = () => setCapturing(false)
      img.src = dataURL
    } catch (error) {
      console.error('Screenshot failed:', error)
      setCapturing(false)
    }
  }

  const shareOnTwitter = () => {
    // Open Twitter share dialog
    const text = encodeURIComponent('BTC 7-day forecast visualization from MNS Terminal')
    const url = encodeURIComponent('https://mns.com.ge')
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank'
    )
  }

  // Expose functions for external use
  void captureScreenshot
  void shareOnTwitter

  return null // UI будет добавлен в родительском компоненте
}

// Export UI component separately
export function ShareControlsUI() {
  const captureScreenshot = () => {
    // Эта функция будет вызываться из родительского компонента
    const event = new CustomEvent('capture-screenshot')
    window.dispatchEvent(event)
  }

  const shareOnTwitter = () => {
    const text = encodeURIComponent('BTC 7-day forecast visualization from MNS Terminal')
    const url = encodeURIComponent('https://mns.com.ge')
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank'
    )
  }

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      display: 'flex',
      gap: '8px',
      zIndex: 10
    }}>
      <button
        onClick={captureScreenshot}
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#00ff88',
          border: '1px solid #00ff88',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}
      >
        📸 Screenshot
      </button>

      <button
        onClick={shareOnTwitter}
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#1DA1F2',
          border: '1px solid #1DA1F2',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}
      >
        🐦 Share
      </button>
    </div>
  )
}
