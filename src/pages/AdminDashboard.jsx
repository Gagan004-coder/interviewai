import { useState, useEffect } from 'react'
import { apiAdminGetUsers, apiAdminGetStats, apiAdminUpdateRole } from '../services/api'
import './Dashboard.css'

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    apiAdminGetStats().then(setStats).catch(()=>{})
    apiAdminGetUsers().then(setUsers).catch(()=>{})
  }

  async function updateRole(id, role) {
    if (!window.confirm(`Change role to ${role}?`)) return
    try {
      await apiAdminUpdateRole(id, role)
      loadData()
    } catch(e) { alert(e.message) }
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h1 className="page-title">🛡️ Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and user management</p>
        </div>
      </div>

      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-value">{stats?.users || '…'}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.companies || '…'}</div>
          <div className="stat-label">Companies</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.interviews || '…'}</div>
          <div className="stat-label">Total Interviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.avg_score || '…'}%</div>
          <div className="stat-label">Avg Global Score</div>
        </div>
      </div>

      <div className="dash-section-title" style={{marginTop: 36}}>User Management</div>
      <div className="stat-card" style={{alignItems: 'stretch', padding: 0, overflow: 'hidden'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
          <thead>
            <tr style={{background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--glass-border)'}}>
              <th style={{padding: 12}}>Name</th>
              <th style={{padding: 12}}>Email</th>
              <th style={{padding: 12}}>Role</th>
              <th style={{padding: 12}}>Joined</th>
              <th style={{padding: 12}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{borderBottom: '1px solid var(--glass-border)'}}>
                <td style={{padding: 12}}>{u.name}</td>
                <td style={{padding: 12}}>{u.email}</td>
                <td style={{padding: 12}}>
                  <span className={`badge ${u.role==='admin'?'badge-red':u.role==='company'?'badge-orange':'badge-green'}`}>
                    {u.role}
                  </span>
                </td>
                <td style={{padding: 12}}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{padding: 12}}>
                  <select className="input" style={{padding: '4px 8px'}} value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                    <option value="user">User</option>
                    <option value="company">Company</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
