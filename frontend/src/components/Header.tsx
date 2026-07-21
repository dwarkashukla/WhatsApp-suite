import React from 'react'
import { Bell } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface Props {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export const Header: React.FC<Props> = ({ title, subtitle, actions }) => {
  const { user } = useAuthStore()

  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="w-9 h-9 rounded-xl glass flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <Bell size={17} />
        </button>
      </div>
    </header>
  )
}
