const BASE = '/api'

export function getToken() { return localStorage.getItem('iai_token') }
export function getUserRole() {
  try { return JSON.parse(localStorage.getItem('iai_user') || '{}').role || 'user' } catch { return 'user' }
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('iai_token'); localStorage.removeItem('iai_user')
      window.location.href = '/auth'
    }
    throw new Error(data.error || `Request failed: ${res.status}`)
  }
  return data
}

// Auth
export async function apiRegister(name, email, password, role = 'user', extra = {}) {
  const data = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role, ...extra }) })
  localStorage.setItem('iai_token', data.token)
  localStorage.setItem('iai_user', JSON.stringify(data.user))
  return data
}
export async function apiLogin(email, password) {
  const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  localStorage.setItem('iai_token', data.token)
  localStorage.setItem('iai_user', JSON.stringify(data.user))
  return data
}
export async function apiAdminRegister(name, email, password, adminSecret) {
  const data = await request('/auth/admin/register', { method: 'POST', body: JSON.stringify({ name, email, password, adminSecret }) })
  localStorage.setItem('iai_token', data.token)
  localStorage.setItem('iai_user', JSON.stringify(data.user))
  return data
}
export async function apiFacebookLogin(accessToken, role = 'user') {
  const data = await request('/auth/facebook', { method: 'POST', body: JSON.stringify({ accessToken, role }) })
  localStorage.setItem('iai_token', data.token)
  localStorage.setItem('iai_user', JSON.stringify(data.user))
  return data
}

// Interviews
export async function apiGetInterviews() { return request('/interviews') }
export async function apiSaveInterview(interview) {
  return request('/interviews', { method: 'POST', body: JSON.stringify(interview) })
}
export async function apiClearInterviews() { return request('/interviews', { method: 'DELETE' }) }

// Company
export async function apiGetCandidates() { return request('/company/candidates') }
export async function apiGetCandidateInterviews(id) { return request(`/company/candidate/${id}`) }

// Admin
export async function apiAdminGetUsers() { return request('/admin/users') }
export async function apiAdminUpdateRole(id, role) {
  return request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
}
export async function apiAdminGetStats() { return request('/admin/stats') }

// Health
export async function apiHealth() { return request('/health') }
