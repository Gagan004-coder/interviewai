import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { generateQuestions, evaluateAnswer } from '../services/gemini'
import { apiSaveInterview } from '../services/api'
import { detectFillerWords, speakingSpeed, voiceConfidence, formatTime } from '../utils/helpers'
import FaceDetector from '../components/FaceDetector'
import './Interview.css'

const DOMAINS = ['DevOps', 'Cloud Computing', 'AI / ML', 'Java', 'Python', 'Full Stack']
const DOMAIN_ICONS = { 'DevOps': '⚙️', 'Cloud Computing': '☁️', 'AI / ML': '🤖', 'Java': '☕', 'Python': '🐍', 'Full Stack': '🌐' }

const FALLBACK_QUESTIONS = {
  'DevOps': [
    { id:1, question:'Explain the concept of CI/CD and describe your ideal pipeline.', difficulty:'Medium', hint:'Continuous Integration, Delivery, Deployment' },
    { id:2, question:'What is Docker and how does it differ from a virtual machine?', difficulty:'Easy', hint:'Containerization vs VM isolation' },
    { id:3, question:'How would you implement blue-green deployment in Kubernetes?', difficulty:'Hard', hint:'Zero-downtime, traffic switching' },
    { id:4, question:'Explain Infrastructure as Code (IaC) and name 2 popular tools.', difficulty:'Medium', hint:'Terraform, Ansible, CloudFormation' },
    { id:5, question:'How do you monitor a microservices architecture in production?', difficulty:'Hard', hint:'Prometheus, Grafana, distributed tracing' },
  ],
  'Cloud Computing': [
    { id:1, question:'What are the differences between IaaS, PaaS, and SaaS?', difficulty:'Easy', hint:'Service model layers' },
    { id:2, question:'Explain auto-scaling and when you would use it.', difficulty:'Medium', hint:'Dynamic resource allocation' },
    { id:3, question:'How does AWS Lambda differ from EC2 for running code?', difficulty:'Medium', hint:'Serverless vs server-based' },
    { id:4, question:'What is the Shared Responsibility Model in cloud security?', difficulty:'Medium', hint:'Provider vs customer duties' },
    { id:5, question:'Design a highly available 3-tier web app on AWS.', difficulty:'Hard', hint:'Load balancer, multi-AZ, RDS' },
  ],
  'AI / ML': [
    { id:1, question:'What is the difference between supervised and unsupervised learning?', difficulty:'Easy', hint:'Labeled vs unlabeled data' },
    { id:2, question:'Explain the bias-variance tradeoff.', difficulty:'Medium', hint:'Underfitting vs overfitting' },
    { id:3, question:'How does the attention mechanism work in transformers?', difficulty:'Hard', hint:'Query, Key, Value matrices' },
    { id:4, question:'What is gradient descent and how does learning rate affect it?', difficulty:'Medium', hint:'Optimization, convergence' },
    { id:5, question:'Explain how you would handle class imbalance in a dataset.', difficulty:'Medium', hint:'SMOTE, weighted loss, resampling' },
  ],
  'Java': [
    { id:1, question:'Explain the difference between == and .equals() in Java.', difficulty:'Easy', hint:'Reference vs value equality' },
    { id:2, question:'What is the difference between ArrayList and LinkedList?', difficulty:'Easy', hint:'Random access vs insertion speed' },
    { id:3, question:'Explain Java memory model: stack vs heap.', difficulty:'Medium', hint:'Object allocation, GC' },
    { id:4, question:'What are design patterns? Explain Singleton and Factory.', difficulty:'Medium', hint:'Creational patterns' },
    { id:5, question:'How does Java handle concurrency? Explain synchronized and volatile.', difficulty:'Hard', hint:'Thread safety, memory visibility' },
  ],
  'Python': [
    { id:1, question:'What is the GIL in Python and how does it affect multithreading?', difficulty:'Medium', hint:'Global Interpreter Lock, CPython' },
    { id:2, question:'Explain Python decorators with a real-world example.', difficulty:'Medium', hint:'Higher-order functions, wrapping' },
    { id:3, question:'What is the difference between a generator and an iterator?', difficulty:'Medium', hint:'yield, lazy evaluation' },
    { id:4, question:'How does Python manage memory? Explain garbage collection.', difficulty:'Medium', hint:'Reference counting, cyclic GC' },
    { id:5, question:'Describe async/await in Python with an example use case.', difficulty:'Hard', hint:'asyncio, event loop, coroutines' },
  ],
  'Full Stack': [
    { id:1, question:'Explain the difference between REST and GraphQL APIs.', difficulty:'Medium', hint:'Over/under-fetching, schema' },
    { id:2, question:'How does the browser render a webpage? (Critical rendering path)', difficulty:'Medium', hint:'DOM, CSSOM, render tree, paint' },
    { id:3, question:'What is JWT and how is it used for authentication?', difficulty:'Medium', hint:'Token structure, stateless auth' },
    { id:4, question:'Explain database indexing and when NOT to use an index.', difficulty:'Hard', hint:'B-tree, query optimization, write overhead' },
    { id:5, question:'How would you optimize a slow React application?', difficulty:'Hard', hint:'Memoization, code splitting, virtualization' },
  ],
}

const STEPS = { SELECT: 'select', READY: 'ready', INTERVIEW: 'interview', DONE: 'done' }
const Q_TIME = 120 // 2 min per question

export default function Interview() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(STEPS.SELECT)
  const [domain, setDomain] = useState(searchParams.get('domain') || '')
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [evalLoading, setEvalLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(Q_TIME)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [emotions, setEmotions] = useState([])
  const [error, setError] = useState('')

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const recordStartRef = useRef(null)

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

  // Load questions
  async function startInterview() {
    if (!domain) return
    setLoading(true); setError('')
    try {
      const geminiKey = localStorage.getItem('iai_gemini_key') || true
      let qs
      if (geminiKey) {
        try { qs = await generateQuestions(domain, 5) }
        catch { qs = FALLBACK_QUESTIONS[domain] || FALLBACK_QUESTIONS['Full Stack'] }
      } else {
        qs = FALLBACK_QUESTIONS[domain] || FALLBACK_QUESTIONS['Full Stack']
      }
      setQuestions(qs)
      setAnswers([])
      setQIndex(0)
      setStep(STEPS.INTERVIEW)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  // Voice recording
  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported in this browser. Use Chrome.'); return }
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

  // Evaluate and move to next
  const handleSubmitAnswer = useCallback(async () => {
    clearInterval(timerRef.current)
    if (isRecording) stopVoice()
    setEvalLoading(true)

    const q = questions[qIndex]
    const ans = currentAnswer.trim()
    const durationSec = recordStartRef.current ? (Date.now() - recordStartRef.current) / 1000 : 60
    const { count: fillerCount } = detectFillerWords(ans)
    const wpm = speakingSpeed(ans, durationSec)
    const voiceConf = voiceConfidence(wpm, fillerCount, ans.length)

    let eval_result = { relevance: 50, technical: 50, grammar: 60, confidence: voiceConf, overall: 55, feedback: 'Answer evaluated locally.', tips: [] }
    const geminiKey = localStorage.getItem('iai_gemini_key') || true
    if (geminiKey && ans.length > 10) {
      try { eval_result = await evaluateAnswer(q.question, ans, domain) }
      catch { /* keep local eval */ }
    }
    eval_result.confidence = Math.round((eval_result.confidence + voiceConf) / 2)
    eval_result.overall = Math.round((eval_result.relevance + eval_result.technical + eval_result.grammar + eval_result.confidence) / 4)

    const newAnswer = {
      question: q.question,
      difficulty: q.difficulty,
      answer: ans,
      wpm, fillerCount,
      emotions: emotions.slice(-3),
      ...eval_result
    }

    const updatedAnswers = [...answers, newAnswer]
    setAnswers(updatedAnswers)
    setCurrentAnswer('')
    recordStartRef.current = null

    if (qIndex + 1 < questions.length) {
      setQIndex(i => i + 1)
    } else {
      // Save interview to MySQL
      const overall = Math.round(updatedAnswers.reduce((s, a) => s + a.overall, 0) / updatedAnswers.length)
      const interview = {
        domain, date: new Date().toISOString(),
        answers: updatedAnswers,
        overall,
        technical: Math.round(updatedAnswers.reduce((s,a)=>s+a.technical,0)/updatedAnswers.length),
        communication: Math.round(updatedAnswers.reduce((s,a)=>s+(a.grammar+a.confidence)/2,0)/updatedAnswers.length),
        confidence: Math.round(updatedAnswers.reduce((s,a)=>s+a.confidence,0)/updatedAnswers.length),
        grammar: Math.round(updatedAnswers.reduce((s,a)=>s+a.grammar,0)/updatedAnswers.length),
      }
      try { await apiSaveInterview(interview) } catch (e) { console.error('Failed to save interview:', e) }
      localStorage.setItem('iai_last_interview', JSON.stringify(interview))
      setStep(STEPS.DONE)
    }
    setEvalLoading(false)
  }, [answers, currentAnswer, domain, emotions, isRecording, qIndex, questions])

  // Face emotion callback
  const handleEmotion = useCallback((e) => {
    if (e) setEmotions(prev => [...prev.slice(-29), e])
  }, [])

  // ── Render ──
  if (step === STEPS.SELECT || step === STEPS.READY) return (
    <div className="interview-page">
      <h1 className="page-title">🎤 AI Mock Interview</h1>
      <p className="page-subtitle">Select your domain and let Gemini AI generate personalized questions</p>

      <div className="domain-select-grid">
        {DOMAINS.map(d => (
          <button key={d}
            className={`domain-select-card ${domain === d ? 'selected' : ''}`}
            onClick={() => setDomain(d)}>
            <span className="dsc-icon">{DOMAIN_ICONS[d]}</span>
            <span className="dsc-name">{d}</span>
            {domain === d && <span className="dsc-check">✓</span>}
          </button>
        ))}
      </div>

      {error && <div className="iv-error">{error}</div>}

      <div className="iv-setup-actions">
        <div className="iv-voice-toggle">
          <label className="toggle-label">
            <input type="checkbox" checked={voiceMode} onChange={e => setVoiceMode(e.target.checked)} />
            <span className="toggle-slider" />
            <span>🎤 Voice Mode</span>
          </label>
        </div>
        <button className="btn btn-primary btn-lg" disabled={!domain || loading} onClick={startInterview}>
          {loading ? <><span className="spinner" /> Generating Questions...</> : '🚀 Start Interview →'}
        </button>
      </div>
    </div>
  )

  if (step === STEPS.DONE) return (
    <div className="interview-page interview-done">
      <div className="done-card">
        <div className="done-emoji">🎉</div>
        <h2 className="done-title">Interview Complete!</h2>
        <p className="done-sub">Your answers have been evaluated by Gemini AI</p>
        <div className="done-score">
          {Math.round(answers.reduce((s,a)=>s+a.overall,0)/answers.length)}%
          <span>Overall Score</span>
        </div>
        <div className="done-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/app/report', { state: { interview: JSON.parse(localStorage.getItem('iai_last_interview')) } })}>
            📊 View Full Report →
          </button>
          <button className="btn btn-secondary" onClick={() => { setStep(STEPS.SELECT); setDomain('') }}>
            🔄 New Interview
          </button>
        </div>
      </div>
    </div>
  )

  // INTERVIEW step
  const q = questions[qIndex]
  const progress = ((qIndex) / questions.length) * 100

  return (
    <div className="interview-page">
      {/* Progress */}
      <div className="iv-progress-bar">
        <div className="iv-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="iv-header">
        <div>
          <span className="badge badge-purple">{DOMAIN_ICONS[domain]} {domain}</span>
          <span className="badge badge-cyan" style={{ marginLeft: 8 }}>Q{qIndex+1}/{questions.length}</span>
          <span className={`badge ${q?.difficulty === 'Easy' ? 'badge-green' : q?.difficulty === 'Medium' ? 'badge-orange' : 'badge-red'}`} style={{ marginLeft: 8 }}>{q?.difficulty}</span>
        </div>
        <div className={`iv-timer ${timeLeft < 30 ? 'timer-warn' : ''}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      <div className="iv-main">
        {/* Question + Answer */}
        <div className="iv-left">
          <div className="iv-question-card">
            <div className="iv-q-label">Question {qIndex+1}</div>
            <div className="iv-q-text">{q?.question}</div>
            {q?.hint && <div className="iv-q-hint">💡 Hint: {q.hint}</div>}
          </div>

          <div className="iv-answer-area">
            <div className="iv-answer-header">
              <span>Your Answer</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {voiceMode && !isRecording && (
                  <button className="btn btn-sm btn-secondary" onClick={startVoice}>🎤 Start Recording</button>
                )}
                {voiceMode && isRecording && (
                  <button className="btn btn-sm btn-danger" onClick={stopVoice}><span className="pulse-dot" /> Stop</button>
                )}
              </div>
            </div>
            <textarea
              className="textarea iv-textarea"
              placeholder={voiceMode ? 'Transcription will appear here as you speak...' : 'Type your answer here...'}
              value={currentAnswer}
              onChange={e => setCurrentAnswer(e.target.value)}
            />
            <div className="iv-answer-meta">
              <span>{currentAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
              {isRecording && <span style={{ color: 'var(--accent-red)' }}>🔴 Recording...</span>}
            </div>
          </div>

          <button
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '14px' }}
            disabled={evalLoading}
            onClick={handleSubmitAnswer}>
            {evalLoading
              ? <><span className="spinner" /> Evaluating with Gemini AI...</>
              : qIndex + 1 < questions.length ? `Submit & Next Question →` : `Submit & See Results 🎉`}
          </button>
        </div>

        {/* Face Detector */}
        <div className="iv-right">
          <FaceDetector onEmotion={handleEmotion} />
        </div>
      </div>
    </div>
  )
}
