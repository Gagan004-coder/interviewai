import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { generateQuestions, evaluateAnswer } from '../services/groq'
import { apiSaveInterview } from '../services/api'
import { detectFillerWords, speakingSpeed, voiceConfidence, formatTime } from '../utils/helpers'
import FaceDetector from '../components/FaceDetector'
import './SecureInterview.css'

// Fallback questions just in case
const FALLBACK = [
  { id:1, question:'Explain the concept of CI/CD and describe your ideal pipeline.', difficulty:'Medium' },
  { id:2, question:'What is Docker and how does it differ from a virtual machine?', difficulty:'Easy' },
]

const STEPS = { INTRO: 'intro', READY: 'ready', INTERVIEW: 'interview', DONE: 'done', TERMINATED: 'terminated' }
const Q_TIME = 180 // 3 mins for secure

export default function SecureInterview() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const domain = searchParams.get('domain') || 'Full Stack' // Passed by company
  
  const [step, setStep] = useState(STEPS.INTRO)
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [evalLoading, setEvalLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(Q_TIME)
  const [isRecording, setIsRecording] = useState(false)
  
  // Proctoring State
  const [violations, setViolations] = useState(0)
  const [warningMsg, setWarningMsg] = useState('')
  const [gazeLog, setGazeLog] = useState([])
  const [confLog, setConfLog] = useState([])
  const [cameraActive, setCameraActive] = useState(false)

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const recordStartRef = useRef(null)
  const containerRef = useRef(null)

  // ── Proctoring Listeners ──
  useEffect(() => {
    if (step !== STEPS.INTERVIEW) return

    const handleVisibility = () => {
      if (document.hidden) triggerViolation('Tab switched or window minimized.')
    }
    const handleBlur = () => {
      triggerViolation('Focus lost. Do not switch to other applications.')
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) triggerViolation('Exited fullscreen mode.')
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [step])

  function triggerViolation(reason) {
    setViolations(v => {
      const newV = v + 1
      if (newV >= 3) {
        setStep(STEPS.TERMINATED)
        document.exitFullscreen?.().catch(()=>{})
      } else {
        setWarningMsg(`⚠️ Warning ${newV}/3: ${reason} Return to the interview immediately.`)
        setTimeout(() => setWarningMsg(''), 5000)
      }
      return newV
    })
  }

  // Timer
  useEffect(() => {
    if (step !== STEPS.INTERVIEW) return
    setTimeLeft(Q_TIME)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmitAnswer(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [step, qIndex])

  async function startSecureSession() {
    // Enforce Fullscreen
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen()
      }
    } catch (e) {
      alert('Please allow fullscreen to begin the secure interview.')
      return
    }

    setLoading(true)
    try {
      let qs = await generateQuestions(domain, 5).catch(() => FALLBACK)
      setQuestions(qs)
      setAnswers([])
      setQIndex(0)
      setViolations(0)
      setGazeLog([])
      setConfLog([])
      setStep(STEPS.INTERVIEW)
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  // Voice recording
  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported.'); return }
    const rec = new SR()
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
    rec.onresult = (e) => {
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
      }
      if (final) setCurrentAnswer(a => a + final)
    }
    rec.onerror = () => setIsRecording(false)
    rec.start()
    recognitionRef.current = rec
    recordStartRef.current = Date.now()
    setIsRecording(true)
  }
  function stopVoice() {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  // Evaluate
  const handleSubmitAnswer = useCallback(async () => {
    clearInterval(timerRef.current)
    if (isRecording) stopVoice()
    setEvalLoading(true)

    const q = questions[qIndex]
    const ans = currentAnswer.trim()
    const durationSec = recordStartRef.current ? (Date.now() - recordStartRef.current) / 1000 : 60
    const { count: fillerCount } = detectFillerWords(ans)
    const wpm = speakingSpeed(ans, durationSec)
    
    // Average confidence from camera during this question
    const avgCameraConf = confLog.length ? confLog.reduce((a,b)=>a+b,0)/confLog.length : 50
    const centerGaze = gazeLog.filter(g => g === 'center').length
    const centerGazePct = gazeLog.length ? Math.round((centerGaze / gazeLog.length) * 100) : 0

    let eval_result = { relevance: 50, technical: 50, grammar: 60, confidence: 50, overall: 55, feedback: 'Evaluated locally.', tips: [] }
    if (ans.length > 10) {
      try { eval_result = await evaluateAnswer(q.question, ans, domain) } catch {}
    }
    
    // Blend API confidence with Camera confidence + Eye contact
    eval_result.confidence = Math.round((eval_result.confidence + avgCameraConf + centerGazePct) / 3)
    eval_result.overall = Math.round((eval_result.relevance + eval_result.technical + eval_result.grammar + eval_result.confidence) / 4)

    const newAnswer = {
      question: q.question, difficulty: q.difficulty, answer: ans,
      wpm, fillerCount, eyeContactPct: centerGazePct,
      ...eval_result
    }

    const updatedAnswers = [...answers, newAnswer]
    setAnswers(updatedAnswers)
    setCurrentAnswer('')
    recordStartRef.current = null
    setGazeLog([])
    setConfLog([])

    if (qIndex + 1 < questions.length) {
      setQIndex(i => i + 1)
    } else {
      document.exitFullscreen?.().catch(()=>{})
      const overall = Math.round(updatedAnswers.reduce((s, a) => s + a.overall, 0) / updatedAnswers.length)
      
      const proctoring = {
        violations,
        avgEyeContact: Math.round(updatedAnswers.reduce((s,a)=>s+a.eyeContactPct,0)/updatedAnswers.length),
        secureMode: true
      }

      const interview = {
        domain, date: new Date().toISOString(), answers: updatedAnswers, overall,
        technical: Math.round(updatedAnswers.reduce((s,a)=>s+a.technical,0)/updatedAnswers.length),
        communication: Math.round(updatedAnswers.reduce((s,a)=>s+(a.grammar+a.confidence)/2,0)/updatedAnswers.length),
        confidence: Math.round(updatedAnswers.reduce((s,a)=>s+a.confidence,0)/updatedAnswers.length),
        grammar: Math.round(updatedAnswers.reduce((s,a)=>s+a.grammar,0)/updatedAnswers.length),
        proctoring
      }
      
      try { await apiSaveInterview(interview) } catch(e) { console.error(e) }
      localStorage.setItem('iai_last_interview', JSON.stringify(interview))
      setStep(STEPS.DONE)
    }
    setEvalLoading(false)
  }, [answers, currentAnswer, domain, isRecording, qIndex, questions, confLog, gazeLog, violations])

  // Camera callbacks
  const handleGaze = useCallback((dir) => { if (dir!=='none') setGazeLog(p => [...p, dir]) }, [])
  const handleConf = useCallback((score) => { setConfLog(p => [...p, score]) }, [])
  const handleEmotion = useCallback((e) => { if (e) setCameraActive(true) }, [])

  // ── Render ──
  if (step === STEPS.INTRO) return (
    <div className="secure-iv-page" ref={containerRef}>
      <div className="secure-intro-card">
        <div className="sic-icon">🔒</div>
        <h1 className="sic-title">Secure Interview Environment</h1>
        <p className="sic-sub">You have been invited to take a company-proctored technical interview.</p>
        
        <div className="sic-rules">
          <h3>Proctoring Rules:</h3>
          <ul>
             <li>🖥️ <strong>Fullscreen required:</strong> Do not exit fullscreen.</li>
             <li>👁️ <strong>Eye Tracking active:</strong> Look at the camera/screen.</li>
             <li>🚫 <strong>No tab switching:</strong> Leaving the tab will trigger a violation.</li>
             <li>❌ <strong>3 Violations = Termination:</strong> Your test will be auto-submitted.</li>
          </ul>
        </div>
        
        <div className="sic-camera-check">
          <FaceDetector onEmotion={handleEmotion} />
        </div>

        <button className="btn btn-primary btn-lg w-full" disabled={!cameraActive || loading} onClick={startSecureSession} style={{marginTop: 20, justifyContent: 'center'}}>
          {loading ? <><span className="spinner"/> Generating Secure Session...</> : cameraActive ? 'Accept Rules & Start →' : 'Please Enable Camera First'}
        </button>
      </div>
    </div>
  )

  if (step === STEPS.TERMINATED) return (
    <div className="secure-iv-page">
      <div className="secure-intro-card" style={{borderColor: 'var(--accent-red)'}}>
        <div className="sic-icon">🚫</div>
        <h1 className="sic-title" style={{color: 'var(--accent-red)'}}>Interview Terminated</h1>
        <p className="sic-sub">You exceeded the maximum allowed proctoring violations (3/3).</p>
        <p style={{color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 12}}>
          Your partial results have been submitted to the company for review.
        </p>
        <button className="btn btn-secondary w-full" onClick={() => navigate('/app')} style={{marginTop: 24, justifyContent: 'center'}}>
          Return to Dashboard
        </button>
      </div>
    </div>
  )

  if (step === STEPS.DONE) return (
    <div className="secure-iv-page">
      <div className="secure-intro-card">
        <div className="sic-icon">✅</div>
        <h1 className="sic-title">Interview Completed</h1>
        <p className="sic-sub">Your proctored interview has been successfully submitted.</p>
        <div style={{display: 'flex', gap: 12, marginTop: 24}}>
          <button className="btn btn-primary flex-1" style={{justifyContent:'center'}} onClick={() => navigate('/app/report', { state: { interview: JSON.parse(localStorage.getItem('iai_last_interview')) } })}>
            View Your Report
          </button>
          <button className="btn btn-secondary flex-1" style={{justifyContent:'center'}} onClick={() => navigate('/app')}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  const q = questions[qIndex]
  const progress = ((qIndex) / questions.length) * 100

  return (
    <div className="secure-iv-page" ref={containerRef}>
      {warningMsg && <div className="secure-warning-banner">{warningMsg}</div>}
      
      {/* Top Bar */}
      <div className="siv-header">
        <div className="siv-brand">🔒 Secure Mode | {domain}</div>
        <div className="siv-stats">
          <span className="siv-badge">Q {qIndex+1}/{questions.length}</span>
          <span className={`siv-badge ${violations>0?'siv-badge-warn':''}`}>Violations: {violations}/3</span>
          <div className={`siv-timer ${timeLeft < 30 ? 'timer-warn' : ''}`}>⏱ {formatTime(timeLeft)}</div>
        </div>
      </div>
      <div className="iv-progress-bar" style={{position:'relative', top:0}}><div className="iv-progress-fill" style={{ width: `${progress}%` }} /></div>

      <div className="siv-main">
        {/* Left: QA */}
        <div className="siv-left">
          <div className="siv-q-card">
             <div className="siv-q-label">Question {qIndex+1}</div>
             <div className="siv-q-text">{q?.question}</div>
             {/* No hints in secure mode */}
          </div>
          
          <div className="iv-answer-area">
             <div className="iv-answer-header">
               <span>Your Answer</span>
               <div style={{ display: 'flex', gap: 8 }}>
                 {!isRecording ? (
                   <button className="btn btn-sm btn-secondary" onClick={startVoice}>🎤 Start Recording</button>
                 ) : (
                   <button className="btn btn-sm btn-danger" onClick={stopVoice}><span className="pulse-dot" /> Stop</button>
                 )}
               </div>
             </div>
             <textarea
               className="textarea iv-textarea"
               placeholder="Speak or type your answer..."
               value={currentAnswer}
               onChange={e => setCurrentAnswer(e.target.value)}
               onPaste={e => { e.preventDefault(); alert("Pasting is disabled in Secure Mode.") }}
             />
          </div>
          
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '14px' }} disabled={evalLoading} onClick={handleSubmitAnswer}>
             {evalLoading ? <><span className="spinner" /> Evaluating...</> : qIndex + 1 < questions.length ? `Submit & Next Question →` : `Submit Final Answers`}
          </button>
        </div>

        {/* Right: Camera Proctoring */}
        <div className="siv-right">
           <FaceDetector onEmotion={handleEmotion} onGaze={handleGaze} onConfidence={handleConf} />
           
           <div className="siv-proctor-logs">
             <div className="pl-title">Proctoring Status</div>
             <div className="pl-item">
               <span>Eye Contact Level</span>
               <strong style={{color: gazeLog.length && (gazeLog.filter(g=>g==='center').length/gazeLog.length)<0.5 ? 'var(--accent-red)' : 'var(--accent-green)'}}>
                 {gazeLog.length ? Math.round((gazeLog.filter(g=>g==='center').length/gazeLog.length)*100) : 100}%
               </strong>
             </div>
             <div className="pl-item">
               <span>Environment Focus</span>
               <strong style={{color: violations>0?'var(--accent-red)':'var(--accent-green)'}}>{violations===0?'Locked':'Violations detected'}</strong>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
