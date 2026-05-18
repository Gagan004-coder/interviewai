import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiRegister, apiLogin, apiFacebookLogin } from '../services/api'
import FacebookLogin from '@greatsumini/react-facebook-login'
import './Auth.css'

const ROLES = [
  { key: 'user',    label: '👤 Candidate', desc: 'Practice interviews & analyze resumes' },
  { key: 'company', label: '🏢 Company',   desc: 'Assign secure interviews & view results' },
  { key: 'admin',   label: '🛡️ Admin',     desc: 'Manage users and platform' },
]

export default function Auth() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState('user')
  const [tab, setTab] = useState(params.get('tab') === 'register' ? 'register' : 'login')
  const [form, setForm] = useState({ name: '', email: '', password: '', company_name: '', adminSecret: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('iai_token')) {
      const u = JSON.parse(localStorage.getItem('iai_user') || '{}')
      navigate(u.role === 'company' ? '/company' : u.role === 'admin' ? '/admin' : '/app')
    }
  }, [navigate])

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (tab === 'register') {
        if (!form.name || !form.email || !form.password) throw new Error('All fields required.')
        if (form.password.length < 6) throw new Error('Password must be 6+ characters.')
        if (role === 'admin') {
          const { apiAdminRegister } = await import('../services/api')
          await apiAdminRegister(form.name, form.email, form.password, form.adminSecret)
        } else {
          await apiRegister(form.name, form.email, form.password, role,
            role === 'company' ? { company_name: form.company_name } : {})
        }
      } else {
        if (!form.email || !form.password) throw new Error('Email and password required.')
        await apiLogin(form.email, form.password)
      }
      const u = JSON.parse(localStorage.getItem('iai_user') || '{}')
      navigate(u.role === 'company' ? '/company' : u.role === 'admin' ? '/admin' : '/app')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function handleFacebookSuccess(response) {
    if (!response.accessToken) return
    setLoading(true); setError('')
    try {
      await apiFacebookLogin(response.accessToken, role)
      const u = JSON.parse(localStorage.getItem('iai_user') || '{}')
      navigate(u.role === 'company' ? '/company' : u.role === 'admin' ? '/admin' : '/app')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb" />
      <div className="auth-card" style={{maxWidth: 460}}>
        <div className="auth-logo">🧠 InterviewAI</div>
        <p className="auth-tagline">Your AI-Powered Interview Platform</p>

        {/* Role selector */}
        <div className="role-tabs">
          {ROLES.map(r => (
            <button key={r.key} className={`role-tab ${role === r.key ? 'active' : ''}`}
              onClick={() => { setRole(r.key); setError('') }}>
              {r.label}
            </button>
          ))}
        </div>
        <p className="role-desc">{ROLES.find(r => r.key === role)?.desc}</p>

        {/* Login / Register tabs */}
        <div className="auth-tabs" style={{marginTop: 12}}>
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Register</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">{role === 'company' ? 'Contact Person Name' : 'Full Name'}</label>
              <input className="input" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} />
            </div>
          )}
          {tab === 'register' && role === 'company' && (
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="input" name="company_name" placeholder="Acme Corp" value={form.company_name} onChange={handleChange} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} />
          </div>
          {tab === 'register' && role === 'admin' && (
            <div className="form-group">
              <label className="form-label">Admin Secret Code</label>
              <input className="input" name="adminSecret" type="password" placeholder="Admin access code" value={form.adminSecret} onChange={handleChange} />
            </div>
          )}

          {error && <div className="form-error" style={{padding:'10px 14px',background:'rgba(239,68,68,0.1)',borderRadius:'8px',border:'1px solid rgba(239,68,68,0.25)'}}>{error}</div>}

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{justifyContent:'center',marginTop:'8px'}}>
            {loading ? <span className="spinner" /> : tab === 'login' ? `→ Login as ${ROLES.find(r=>r.key===role)?.label}` : '🚀 Create Account'}
          </button>

          {role !== 'admin' && (
            <>
              <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-muted)', fontSize: '14px', position: 'relative' }}>
                <hr style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid var(--border-color)', margin: 0, zIndex: 1 }} />
                <span style={{ position: 'relative', background: 'var(--card-bg)', padding: '0 8px', zIndex: 2 }}>OR</span>
              </div>
              <FacebookLogin
                appId="2401909360220774"
                scope="public_profile"
                onSuccess={handleFacebookSuccess}
                onFail={(error) => setError('Facebook login cancelled or failed.')}
                className="btn w-full"
                style={{ justifyContent: 'center', background: '#1877F2', color: 'white', border: 'none' }}
              >
                <span style={{ fontSize: '18px', marginRight: '8px' }}>f</span> {tab === 'login' ? 'Continue with Facebook' : 'Sign up with Facebook'}
              </FacebookLogin>
            </>
          )}
        </form>

        {role === 'user' && (
          <div className="auth-demo">
            <span>Demo? </span>
            <button onClick={async () => {
              try {
                await apiLogin('demo@interviewai.dev', 'demo123456').catch(() =>
                  apiRegister('Demo User', 'demo@interviewai.dev', 'demo123456', 'user'))
                navigate('/app')
              } catch (err) { setError(err.message) }
            }} className="auth-demo-btn">Use demo account →</button>
          </div>
        )}
      </div>
    </div>
  )
}
