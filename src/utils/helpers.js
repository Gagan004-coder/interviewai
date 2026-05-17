import { useState, useCallback } from 'react'

// Simple toast hook
export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  return { toasts, addToast }
}

// Format seconds to MM:SS
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// Compute score color
export function scoreColor(score) {
  if (score >= 75) return 'var(--accent-green)'
  if (score >= 50) return 'var(--accent-orange)'
  return 'var(--accent-red)'
}

// Count filler words in text
export function detectFillerWords(text) {
  const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'right', 'so', 'well']
  const lower = text.toLowerCase()
  let count = 0
  const found = []
  fillers.forEach(f => {
    const re = new RegExp(`\\b${f}\\b`, 'g')
    const matches = lower.match(re)
    if (matches) { count += matches.length; found.push(`"${f}" ×${matches.length}`) }
  })
  return { count, found }
}

// Estimate speaking speed (WPM)
export function speakingSpeed(text, durationSeconds) {
  if (!durationSeconds || durationSeconds < 1) return 0
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.round((words / durationSeconds) * 60)
}

// Confidence from speaking metrics
export function voiceConfidence(wpm, fillerCount, textLength) {
  let score = 70
  if (wpm >= 120 && wpm <= 160) score += 15
  else if (wpm < 80 || wpm > 200) score -= 15
  score -= fillerCount * 5
  if (textLength < 20) score -= 20
  return Math.max(0, Math.min(100, score))
}
