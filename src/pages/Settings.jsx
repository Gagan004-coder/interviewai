import { useState, useEffect } from 'react'
import { apiClearInterviews, apiGetInterviews } from '../services/api'
import './Settings.css'

export default function Settings() {
  const [interviews, setInterviews] = useState([])
  const user = JSON.parse(localStorage.getItem('iai_user') || '{}')

  useEffect(() => {
    apiGetInterviews().then(setInterviews).catch(() => {})
  }, [])

  async function clearData() {
    if (!window.confirm('Clear all interview history? This cannot be undone.')) return
    try {
      await apiClearInterviews()
      setInterviews([])
      alert('Interview history cleared from database.')
    } catch (err) { alert('Failed: ' + err.message) }
  }

  return (
    <div className="settings-page">
      <h1 className="page-title">⚙️ Settings</h1>
      <p className="page-subtitle">Manage your account and preferences</p>

      {/* Account */}
      <div className="settings-card">
        <div className="sc-header">
          <div className="sc-icon">👤</div>
          <div>
            <div className="sc-title">Account</div>
            <div className="sc-sub">Your profile and interview history</div>
          </div>
        </div>
        <div className="sc-body">
          <div className="model-grid">
            <div className="model-item"><span className="model-label">Name</span><span className="model-val">{user.name || '—'}</span></div>
            <div className="model-item"><span className="model-label">Email</span><span className="model-val">{user.email || '—'}</span></div>
            <div className="model-item"><span className="model-label">Role</span>
              <span className="model-val" style={{color: user.role==='admin'?'var(--accent-red)':user.role==='company'?'var(--accent-orange)':'var(--accent-green)'}}>
                {user.role==='admin'?'🛡️ Admin':user.role==='company'?'🏢 Company':'👤 Candidate'}
              </span>
            </div>
            <div className="model-item"><span className="model-label">Joined</span><span className="model-val">{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '—'}</span></div>
            <div className="model-item"><span className="model-label">Interviews</span><span className="model-val">{interviews.length}</span></div>
          </div>
          {user.role === 'user' && (
            <button className="btn btn-danger" style={{ marginTop: 16 }} onClick={clearData}>
              🗑 Clear Interview History
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
