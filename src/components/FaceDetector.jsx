import { useEffect, useRef, useState } from 'react'
import './FaceDetector.css'

const EMOTION_COLORS = {
  happy: 'var(--accent-green)',
  neutral: 'var(--accent-cyan)',
  surprised: 'var(--accent-orange)',
  fearful: 'var(--accent-red)',
  disgusted: 'var(--accent-red)',
  angry: 'var(--accent-red)',
  sad: 'var(--accent-orange)',
}

const EMOTION_LABELS = {
  happy: '😊 Happy',
  neutral: '😐 Neutral',
  surprised: '😮 Surprised',
  fearful: '😰 Nervous',
  disgusted: '😒 Uncomfortable',
  angry: '😠 Stressed',
  sad: '😢 Unsure',
}

export default function FaceDetector({ onEmotion, onGaze, onConfidence }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [currentEmotion, setCurrentEmotion] = useState(null)
  const [gaze, setGaze] = useState('none')
  const [confidenceScore, setConfidenceScore] = useState(0)
  const [faceApiLoaded, setFaceApiLoaded] = useState(false)
  
  const animRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    async function loadFaceApi() {
      try {
        const faceapi = await import('face-api.js')
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ])
        setFaceApiLoaded(true)
      } catch (e) {
        setStatus('error')
      }
    }
    loadFaceApi()
    return () => {
      cancelAnimationFrame(animRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function startCamera() {
    if (!faceApiLoaded) { setStatus('loading'); return }
    setStatus('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setStatus('active')
      runDetection()
    } catch {
      setStatus('error')
    }
  }

  async function runDetection() {
    const faceapi = await import('face-api.js')
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })

    async function detect() {
      if (!video || video.paused || video.ended) return
      try {
        const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks(true).withFaceExpressions()
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (result) {
          const dims = faceapi.matchDimensions(canvas, video, true)
          const resized = faceapi.resizeResults(result, dims)

          // Draw face box
          const box = resized.detection.box
          ctx.strokeStyle = 'rgba(6,182,212,0.8)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.roundRect(box.x, box.y, box.width, box.height, 6)
          ctx.stroke()

          // Emotion & Confidence
          const expr = result.expressions
          const dominant = Object.entries(expr).sort((a,b)=>b[1]-a[1])[0]
          
          let conf = 0
          if (dominant[0] === 'happy' || dominant[0] === 'neutral') {
             conf = 50 + (dominant[1] * 50)
          } else if (dominant[0] === 'surprised') {
             conf = 50
          } else {
             conf = 50 - (dominant[1] * 50)
          }
          conf = Math.round(Math.max(0, Math.min(100, conf)))

          setCurrentEmotion({ name: dominant[0], score: dominant[1], all: expr })
          setConfidenceScore(conf)
          
          onEmotion?.({ emotion: dominant[0], confidence: Math.round(dominant[1]*100) })
          onConfidence?.(conf)

          // Gaze Detection using Landmarks
          const landmarks = resized.landmarks
          const leftEye = landmarks.getLeftEye()
          const rightEye = landmarks.getRightEye()
          const nose = landmarks.getNose()
          
          // Simple heuristic based on pupil position relative to eye corners
          // For a more robust approach, we compare nose position relative to the face box
          const faceCenterX = box.x + box.width / 2
          const noseX = nose[0].x
          const noseY = nose[0].y
          const faceCenterY = box.y + box.height / 2
          
          let currentGaze = 'center'
          
          if (noseX < faceCenterX - box.width * 0.15) {
            currentGaze = 'right' // User looking right (camera mirrored)
          } else if (noseX > faceCenterX + box.width * 0.15) {
            currentGaze = 'left' // User looking left
          } else if (noseY > faceCenterY + box.height * 0.15) {
            currentGaze = 'down'
          }
          
          setGaze(currentGaze)
          onGaze?.(currentGaze)

        } else {
          setCurrentEmotion(null)
          setGaze('none')
          onEmotion?.(null)
          onGaze?.('none')
        }
      } catch (e) { console.error(e) }
      animRef.current = requestAnimationFrame(detect)
    }
    detect()
  }

  function stopCamera() {
    cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setStatus('idle')
    setCurrentEmotion(null)
    setGaze('none')
  }

  const getRingColor = (score) => {
    if (score >= 70) return 'var(--accent-green)'
    if (score >= 40) return 'var(--accent-orange)'
    return 'var(--accent-red)'
  }

  return (
    <div className="face-detector">
      <div className="fd-header">
        <span className="fd-title">😊 AI Proctoring</span>
        {status === 'active' && <span className="fd-live"><span className="pulse-dot" /> LIVE</span>}
      </div>

      <div className="fd-video-wrap">
        <video ref={videoRef} className="fd-video" muted playsInline width={320} height={240} />
        <canvas ref={canvasRef} className="fd-canvas" width={320} height={240} />

        {status !== 'active' && (
          <div className="fd-overlay">
            {status === 'idle' && !faceApiLoaded && <><span className="spinner" /><span>Loading AI model...</span></>}
            {status === 'idle' && faceApiLoaded && <button className="btn btn-primary" onClick={startCamera}>📷 Enable Camera</button>}
            {status === 'loading' && <><span className="spinner" /><span>Starting camera...</span></>}
            {status === 'error' && <span style={{color:'var(--accent-red)',fontSize:13}}>❌ Camera access denied</span>}
          </div>
        )}
      </div>

      {status === 'active' && (
        <div className="fd-results">
          {currentEmotion ? (
            <>
              <div className="fd-gaze-box">
                <span className="fd-gaze-icon">
                  {gaze === 'center' ? '🎯' : gaze === 'left' ? '👈' : gaze === 'right' ? '👉' : '👇'}
                </span>
                <span className="fd-gaze-text">
                  Looking {gaze.charAt(0).toUpperCase() + gaze.slice(1)}
                </span>
              </div>
              
              <div className="fd-confidence-ring">
                <svg viewBox="0 0 100 100" width="80" height="80">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={getRingColor(confidenceScore)} strokeWidth="8"
                    strokeDasharray={`${2*Math.PI*40 * confidenceScore/100} ${2*Math.PI*40}`}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="fd-ring-inner">
                  <span className="fd-ring-score" style={{color: getRingColor(confidenceScore)}}>{confidenceScore}%</span>
                  <span className="fd-ring-label">Confidence</span>
                </div>
              </div>
              
              <div className="fd-emotion-name" style={{ color: EMOTION_COLORS[currentEmotion.name] || 'var(--accent-cyan)' }}>
                 {EMOTION_LABELS[currentEmotion.name] || currentEmotion.name}
              </div>
            </>
          ) : (
             <div className="fd-no-face">No face detected — look at the camera</div>
          )}
          <button className="btn btn-sm btn-secondary w-full" onClick={stopCamera} style={{marginTop:16}}>Stop Camera</button>
        </div>
      )}
    </div>
  )
}
