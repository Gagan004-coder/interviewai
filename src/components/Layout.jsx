import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './Layout.css'

export default function Layout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const user = JSON.parse(localStorage.getItem('iai_user') || '{}')

  let nav = []
  if (user.role === 'admin') {
    nav = [
      { to: '/admin', label: 'Admin Dashboard', icon: '🛡️', end: true },
      { to: '/app/settings', label: 'Settings', icon: '⚙️' }
    ]
  } else if (user.role === 'company') {
    nav = [
      { to: '/company', label: 'Company Portal', icon: '🏢', end: true },
      { to: '/company/secure-interview?domain=Full%20Stack', label: 'Test Secure Mode', icon: '🔒' },
      { to: '/app/settings', label: 'Settings', icon: '⚙️' }
    ]
  } else {
    nav = [
      { to: '/app', label: 'Dashboard', icon: '⚡', end: true },
      { to: '/app/resume', label: 'Resume Analyzer', icon: '📄' },
      { to: '/app/interview', label: 'Mock Interview', icon: '🎤' },
      { to: '/app/report', label: 'Reports', icon: '📊' },
      { to: '/app/settings', label: 'Settings', icon: '⚙️' },
    ]
  }

  function logout() {
    localStorage.removeItem('iai_user')
    navigate('/auth')
  }

  return (
    <div className={`layout ${collapsed ? 'layout--collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🧠</span>
            {!collapsed && <span className="logo-text">InterviewAI</span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
            {!collapsed && (
              <div className="user-details">
                <div className="user-name">{user.name || 'User'}</div>
                <div className="user-email">{user.email || ''}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">🚪</button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
