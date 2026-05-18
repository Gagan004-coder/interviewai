import { useNavigate } from 'react-router-dom'
import './LandingPage.css'
import GeminiLogo from '../components/GeminiLogo'

const FEATURES = [
  { icon: '🎤', title: 'AI Mock Interview', desc: 'Domain-specific questions generated live by Gemini for DevOps, Cloud, AI/ML, Java, Python & Full Stack.' },
  { icon: '📄', title: 'Resume Analyzer', desc: 'Upload your PDF resume. Get ATS score, skill extraction, missing skills & Gemini-powered improvement tips.' },
  { icon: '🗣️', title: 'Voice Analysis', desc: 'Detects confidence, fluency, speaking speed (WPM) and filler words using your browser\'s speech API.' },
  { icon: '😊', title: 'Emotion Detection', desc: 'Real-time facial emotion detection via your webcam — tracks confidence, nervousness & eye contact.' },
  { icon: '🤖', title: 'AI Answer Evaluation', desc: 'Gemini AI evaluates your answers on relevance, technical depth, grammar and overall confidence.' },
  { icon: '📊', title: 'Performance Report', desc: 'Full score breakdown with radar charts, emotion timeline, weak areas and a personalized action plan.' },
]

const DOMAINS = ['DevOps', 'Cloud Computing', 'AI / ML', 'Java', 'Python', 'Full Stack']

export default function LandingPage() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('iai_user')

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="land-nav">
        <div className="land-nav-logo">🧠 InterviewAI</div>
        <div className="land-nav-actions">
          {isLoggedIn
            ? <button className="btn btn-primary" onClick={() => navigate('/app')}>Go to Dashboard →</button>
            : <>
                <button className="btn btn-secondary" onClick={() => navigate('/auth')}>Login</button>
                <button className="btn btn-primary" onClick={() => navigate('/auth?tab=register')}>Get Started Free →</button>
              </>
          }
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg-orb orb1" />
        <div className="hero-bg-orb orb2" />
        <div className="hero-bg-orb orb3" />
        <div className="hero-content">
          <span className="hero-pill"><GeminiLogo style={{ marginRight: '8px' }} /> Powered by Gemini Flash</span>
          <h1 className="hero-title">
            Ace Every Interview<br />
            <span className="gradient-text">with AI-Powered Practice</span>
          </h1>
          <p className="hero-desc">
            Conduct realistic mock interviews with live AI questions, voice & emotion analysis,<br />
            resume ATS scoring, and detailed performance reports — all in your browser.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate(isLoggedIn ? '/app/interview' : '/auth')}>
              🎤 Start Mock Interview
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate(isLoggedIn ? '/app/resume' : '/auth')}>
              📄 Analyze My Resume
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span className="hero-stat-val">6</span><span className="hero-stat-lab">Domains</span></div>
            <div className="hero-stat-div" />
            <div className="hero-stat"><span className="hero-stat-val">AI</span><span className="hero-stat-lab">Gemini Powered</span></div>
            <div className="hero-stat-div" />
            <div className="hero-stat"><span className="hero-stat-val">100%</span><span className="hero-stat-lab">Browser-Based</span></div>
          </div>
        </div>
      </section>

      {/* ── Domains ── */}
      <section className="section">
        <h2 className="section-title">Interview <span className="gradient-text">Domains</span></h2>
        <p className="section-sub">Gemini AI generates fresh, unique questions every time</p>
        <div className="domains-grid">
          {DOMAINS.map((d, i) => (
            <div className="domain-chip" key={i}
              onClick={() => navigate(isLoggedIn ? `/app/interview?domain=${encodeURIComponent(d)}` : '/auth')}>
              {d} →
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section">
        <h2 className="section-title">Everything You Need to <span className="gradient-text">Get Hired</span></h2>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-title">Ready to Land Your Dream Job?</h2>
          <p className="cta-sub">Practice smarter with AI-generated questions & real-time feedback</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth')}>
            🚀 Start for Free — No Credit Card Needed
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="land-footer">
        <span>🧠 InterviewAI</span>
        <span>Built with Gemini + React + face-api.js</span>
      </footer>
    </div>
  )
}
