import React from 'react'
import { Loader2 } from 'lucide-react'

export const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Loader2 size={size} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
)

export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-48">
    <div className="flex flex-col items-center gap-3">
      <Spinner size={32} />
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</span>
    </div>
  </div>
)

export const StatCard: React.FC<{
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  color?: string
}> = ({ label, value, icon, trend, color }) => (
  <div className="glass glass-hover rounded-2xl p-5 animate-in">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value?.toLocaleString()}</p>
        {trend && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{trend}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: color ? `${color}15` : 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: color || 'var(--accent-primary)' }}>
        {icon}
      </div>
    </div>
  </div>
)

export const ProgressBar: React.FC<{ value: number; max: number; label?: string }> = ({ value, max, label }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc?: string; action?: React.ReactNode }> = ({
  icon, title, desc, action
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4 text-slate-600">
      {icon}
    </div>
    <h3 className="text-white font-medium mb-1">{title}</h3>
    {desc && <p className="text-slate-500 text-sm max-w-xs">{desc}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)
