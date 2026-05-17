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

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteDomain, setInviteDomain] = useState('Full Stack')
  const [inviteLink, setInviteLink] = useState('')

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
        <button className="btn btn-primary" onClick={() => { setInviteLink(''); setInviteModalOpen(true); }}>
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

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'}}>
          <div className="glass-card" style={{padding: 32, width: '100%', maxWidth: 460, position: 'relative'}}>
            <button style={{position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18}} onClick={() => setInviteModalOpen(false)}>✕</button>
            <h2 style={{marginBottom: 8}}>Invite Candidate</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: 24, fontSize: 14}}>Generate a secure interview link to send to your candidate.</p>
            
            <div className="form-group" style={{marginBottom: 20}}>
              <label className="form-label">Interview Domain</label>
              <select className="select" value={inviteDomain} onChange={(e) => { setInviteDomain(e.target.value); setInviteLink(''); }}>
                <option value="Full Stack">Full Stack</option>
                <option value="Frontend">Frontend (React)</option>
                <option value="Backend">Backend (Node/Python)</option>
                <option value="DevOps">DevOps</option>
                <option value="Data Science">Data Science</option>
              </select>
            </div>

            {inviteLink ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                <div style={{padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', border: '1px solid var(--glass-border)', color: 'var(--accent-cyan)'}}>
                  {inviteLink}
                </div>
                <button className="btn btn-primary w-full" style={{justifyContent: 'center'}} onClick={() => {
                  navigator.clipboard.writeText(inviteLink)
                  alert('Link copied to clipboard! You can now send it to the candidate.')
                  setInviteModalOpen(false)
                }}>📋 Copy to Clipboard</button>
              </div>
            ) : (
              <button className="btn btn-primary w-full" style={{justifyContent: 'center'}} onClick={() => setInviteLink(`${window.location.origin}/company/secure-interview?domain=${encodeURIComponent(inviteDomain)}`)}>
                🔗 Generate Link
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
