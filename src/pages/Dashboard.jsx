import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGetInterviews } from '../services/api'
import './Dashboard.css'

const DOMAINS = ['DevOps', 'Cloud Computing', 'AI / ML', 'Java', 'Python', 'Full Stack']
const DOMAIN_ICONS = { 'DevOps': '⚙️', 'Cloud Computing': '☁️', 'AI / ML': '🤖', 'Java': '☕', 'Python': '🐍', 'Full Stack': '🌐' }

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('iai_user') || '{}')
  const hasKey = !!localStorage.getItem('iai_groq_key')

  const [interviews, setInterviews] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    apiGetInterviews()
      .then(data => setInterviews(data))
      .catch(err => console.error('Failed to load interviews:', err))
      .finally(() => setLoadingData(false))
  }, [])

  const avgScore = interviews.length
    ? Math.round(interviews.reduce((a, b) => a + (b.overall || 0), 0) / interviews.length)
    : 0
  const bestDomain = interviews.length
    ? interviews.reduce((a, b) => (a.overall > b.overall ? a : b)).domain
    : '—'

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="page-title">Welcome back, {user.name?.split(' ')[0] || 'there'} 👋</h1>
          <p className="page-subtitle">Ready to practice? Pick a domain and start your AI interview.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app/interview')}>
          🎤 Start Interview
        </button>
      </div>

      {/* API Key warning */}
      {!hasKey && (
        <div className="dash-alert">
          <span>⚠️</span>
          <span>Add your <strong>Groq API key</strong> in Settings to enable AI question generation &amp; answer evaluation.</span>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/app/settings')}>Add Key →</button>
        </div>
      )}

      {/* Stats */}
      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-value">{loadingData ? '…' : interviews.length}</div>
          <div className="stat-label">Interviews Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loadingData ? '…' : (avgScore || '—')}</div>
          <div className="stat-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '24px' }}>{loadingData ? '…' : bestDomain}</div>
          <div className="stat-label">Best Domain</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loadingData ? '…' : interviews.filter(i => (i.overall || 0) >= 75).length}</div>
          <div className="stat-label">High Scores (75+)</div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="dash-section-title">Quick Start by Domain</div>
      <div className="domain-grid">
        {DOMAINS.map(d => (
          <button key={d} className="domain-card"
            onClick={() => navigate(`/app/interview?domain=${encodeURIComponent(d)}`)}>
            <span className="domain-card-icon">{DOMAIN_ICONS[d]}</span>
            <span className="domain-card-name">{d}</span>
            <span className="domain-card-arrow">→</span>
          </button>
        ))}
      </div>

      {/* Recent */}
      <div className="dash-section-title" style={{ marginTop: 36 }}>Recent Interviews</div>
      {loadingData ? (
        <div className="dash-empty"><div className="dash-empty-icon"><span className="spinner" /></div><div>Loading your interviews...</div></div>
      ) : interviews.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">🎯</div>
          <div>No interviews yet. Start your first one above!</div>
        </div>
      ) : (
        <div className="recent-list">
          {[...interviews].slice(0, 5).map((iv, i) => (
            <div key={iv.id || i} className="recent-item">
              <span className="recent-icon">{DOMAIN_ICONS[iv.domain] || '🎤'}</span>
              <div className="recent-info">
                <div className="recent-domain">{iv.domain}</div>
                <div className="recent-date">{new Date(iv.date).toLocaleDateString()}</div>
              </div>
              <div className="recent-score" style={{ color: iv.overall >= 75 ? 'var(--accent-green)' : iv.overall >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
                {iv.overall ?? '—'}%
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('/app/report', { state: { interview: iv } })}>
                View →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
