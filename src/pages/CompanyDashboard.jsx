import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGetCandidates, apiGetCandidateInterviews } from '../services/api'
import './Dashboard.css'

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [candidateInterviews, setCandidateInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  const user = JSON.parse(localStorage.getItem('iai_user') || '{}')

  useEffect(() => {
    apiGetCandidates().then(setCandidates).finally(() => setLoading(false))
  }, [])

  async function loadCandidate(c) {
    setSelectedCandidate(c)
    const ivs = await apiGetCandidateInterviews(c.id)
    setCandidateInterviews(ivs)
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Company Portal</h1>
          <p className="page-subtitle">Manage candidate assessments for {user.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('Invite Candidate feature coming soon!')}>
          ✉️ Invite Candidate
        </button>
      </div>

      <div className="domain-grid" style={{gridTemplateColumns: '1fr 1fr', gap: 24}}>
        
        {/* Candidates List */}
        <div className="stat-card" style={{alignItems: 'stretch'}}>
          <h3 style={{marginBottom: 16}}>Candidates</h3>
          {loading ? <div className="spinner" /> : candidates.length === 0 ? <p className="text-muted">No candidates found.</p> : (
            <div className="recent-list">
              {candidates.map(c => (
                <div key={c.id} className={`recent-item ${selectedCandidate?.id === c.id ? 'active' : ''}`}
                     style={{cursor: 'pointer'}} onClick={() => loadCandidate(c)}>
                  <div className="recent-icon">👤</div>
                  <div className="recent-info">
                    <div className="recent-domain">{c.name}</div>
                    <div className="recent-date">{c.email}</div>
                  </div>
                  <div className="recent-score">{c.avg_score || '—'}% avg</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details View */}
        <div className="stat-card" style={{alignItems: 'stretch'}}>
          <h3 style={{marginBottom: 16}}>Assessment Results</h3>
          {!selectedCandidate ? <p className="text-muted">Select a candidate to view results.</p> : (
            <div>
              <div style={{marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--glass-border)'}}>
                <strong>{selectedCandidate.name}</strong> has completed {candidateInterviews.length} interviews.
              </div>
              <div className="recent-list">
                {candidateInterviews.map(iv => (
                  <div key={iv.id} className="recent-item">
                    <span className="recent-icon">{iv.proctoring?.secureMode ? '🔒' : '🎤'}</span>
                    <div className="recent-info">
                      <div className="recent-domain">{iv.domain} {iv.proctoring?.secureMode && <span style={{color:'var(--accent-orange)',fontSize:10}}>SECURE</span>}</div>
                      <div className="recent-date">{new Date(iv.date).toLocaleDateString()}</div>
                    </div>
                    <div className="recent-score" style={{color: iv.overall >= 75 ? 'var(--accent-green)' : 'var(--accent-orange)'}}>
                      {iv.overall}%
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate('/app/report', { state: { interview: iv, readOnly: true } })}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
