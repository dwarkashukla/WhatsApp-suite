import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useSocketStore } from './store/socketStore'
import { useThemeStore } from './store/themeStore'
import { Sidebar } from './components/Sidebar'
import { LoginPage } from './pages/auth/Login'
import { RegisterPage } from './pages/auth/Register'
import { DashboardPage } from './pages/dashboard/Dashboard'
import { AccountsPage } from './pages/accounts/Accounts'
import { ContactsPage } from './pages/contacts/Contacts'
import { TemplatesPage } from './pages/templates/Templates'
import { BroadcastPage } from './pages/broadcast/Broadcast'
import { LogsPage } from './pages/logs/Logs'
import { SettingsPage } from './pages/settings/Settings'

// Protect routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <main className="pl-64 pr-8 py-8 min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

const App: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore()
  const { connect, disconnect } = useSocketStore()
  const { applyTheme } = useThemeStore()

  // Initialize theme on mount
  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  // Listen for system color scheme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [applyTheme])

  useEffect(() => {
    if (isAuthenticated && user) {
      connect(user._id)
    } else {
      disconnect()
    }
  }, [isAuthenticated, user, connect, disconnect])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" replace />}
        />

        {/* App routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <TemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/broadcast"
          element={
            <ProtectedRoute>
              <BroadcastPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <LogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
