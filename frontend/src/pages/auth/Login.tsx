import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MessageSquare, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export const LoginPage: React.FC = () => {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Background orbs */}
      <div className="fixed top-20 left-10 w-64 h-64 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent-primary), transparent)' }} />
      <div className="fixed bottom-20 right-10 w-48 h-48 rounded-full opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent-dark), transparent)' }} />

      <div className="w-full max-w-md animate-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-dark))', boxShadow: '0 16px 40px color-mix(in srgb, var(--accent-primary) 30%, transparent)' }}>
            <MessageSquare size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>WA Suite</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Multi-session WhatsApp management</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email address</label>
              <input id="email" type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="login-btn" type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Signing in...</span>
              ) : (
                <><ArrowRight size={18} />Sign in</>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
