import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import ResumeAnalyzer from './pages/ResumeAnalyzer'
import Interview from './pages/Interview'
import Report from './pages/Report'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import CompanyDashboard from './pages/CompanyDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SecureInterview from './pages/SecureInterview'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('iai_token')
  return token ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="resume" element={<ResumeAnalyzer />} />
          <Route path="interview" element={<Interview />} />
          <Route path="report" element={<Report />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/company" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<CompanyDashboard />} />
          <Route path="secure-interview" element={<SecureInterview />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
