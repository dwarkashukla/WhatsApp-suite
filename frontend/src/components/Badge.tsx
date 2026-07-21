import React from 'react'
import { clsx } from 'clsx'

type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray'

const variantClass: Record<Variant, string> = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  blue: 'badge-blue',
  purple: 'badge-purple',
  gray: 'bg-white/5 text-slate-400',
}

interface Props {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

export const Badge: React.FC<Props> = ({ children, variant = 'gray', className }) => (
  <span className={clsx('badge', variantClass[variant], className)}>{children}</span>
)

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; variant: Variant }> = {
    connected: { label: 'Connected', variant: 'green' },
    disconnected: { label: 'Disconnected', variant: 'red' },
    pending: { label: 'Pending', variant: 'yellow' },
    qr_ready: { label: 'Scan QR', variant: 'blue' },
    banned: { label: 'Banned', variant: 'red' },
    error: { label: 'Error', variant: 'red' },
    running: { label: 'Running', variant: 'green' },
    completed: { label: 'Completed', variant: 'green' },
    failed: { label: 'Failed', variant: 'red' },
    stopped: { label: 'Stopped', variant: 'yellow' },
    sent: { label: 'Sent', variant: 'green' },
    info: { label: 'Info', variant: 'blue' },
    warn: { label: 'Warn', variant: 'yellow' },
    success: { label: 'Success', variant: 'green' },
  }
  const config = map[status] || { label: status, variant: 'gray' as Variant }
  return (
    <span className="flex items-center gap-1.5">
      <span className={`status-dot ${status}`} />
      <Badge variant={config.variant}>{config.label}</Badge>
    </span>
  )
}
