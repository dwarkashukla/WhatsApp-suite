import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Trash2, Smartphone, Wifi, WifiOff } from 'lucide-react'
import { sessionsApi } from '../../api'
import { useSocketStore } from '../../store/socketStore'
import { useAuthStore } from '../../store/authStore'
import { Header } from '../../components/Header'
import { Modal } from '../../components/Modal'
import { StatusBadge } from '../../components/Badge'
import { PageLoader, EmptyState } from '../../components/UI'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import type { WASession } from '../../types'

export const AccountsPage: React.FC = () => {
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [qrSession, setQrSession] = useState<WASession | null>(null)
  const { socket } = useSocketStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list().then((r) => r.data.sessions),
    refetchInterval: 10_000,
  })

  const createMutation = useMutation({
    mutationFn: (lbl: string) => sessionsApi.create(lbl),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setShowAdd(false)
      setLabel('')
      toast.success('Session created! Scan the QR code')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Account removed')
    },
  })

  const reconnectMutation = useMutation({
    mutationFn: sessionsApi.reconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Reconnecting...')
    },
  })

  // Listen for QR and connection events
  useEffect(() => {
    if (!socket) return

    socket.on('qr', ({ sessionId, qrDataUrl }: { sessionId: string; qrDataUrl: string }) => {
      queryClient.setQueryData<WASession[]>(['sessions'], (old) =>
        old?.map((s) => s.sessionId === sessionId ? { ...s, qrCode: qrDataUrl, status: 'qr_ready' } : s) || []
      )
      // Show QR modal for the session
      const session = (queryClient.getQueryData<WASession[]>(['sessions']) || []).find(s => s.sessionId === sessionId)
      if (session) setQrSession({ ...session, qrCode: qrDataUrl, status: 'qr_ready' })
    })

    socket.on('session:connected', ({ sessionId, phone }: { sessionId: string; phone: string }) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setQrSession(null)
      toast.success(`WhatsApp connected: ${phone}`)
    })

    socket.on('session:disconnected', ({ sessionId }: { sessionId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.error('Session disconnected')
    })

    return () => {
      socket.off('qr')
      socket.off('session:connected')
      socket.off('session:disconnected')
    }
  }, [socket, queryClient])

  const sessions: WASession[] = data || []

  return (
    <div className="animate-in">
      <Header title="WhatsApp Accounts" subtitle={`${sessions.length} account(s) managed`}
        actions={
          <button id="add-account-btn" onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={17} /> Add Account
          </button>
        } />

      {isLoading ? <PageLoader /> : sessions.length === 0 ? (
        <EmptyState icon={<Smartphone size={32} />} title="No accounts yet"
          desc="Connect your first WhatsApp account to get started"
          action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={17} />Add Account</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <div key={s._id} className="glass glass-hover rounded-2xl p-5">
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: s.status === 'connected' ? 'rgba(37,211,102,0.15)' : 'rgba(255,255,255,0.05)' }}>
                    {s.status === 'connected' ? <Wifi size={20} className="text-wa-green" /> : <WifiOff size={20} className="text-slate-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{s.label}</p>
                    <p className="text-xs text-slate-400">{s.phone || 'Not connected'}</p>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {/* QR Code */}
              {s.status === 'qr_ready' && s.qrCode && (
                <div className="mb-4 flex flex-col items-center">
                  <div className="p-3 bg-white rounded-xl">
                    <img src={s.qrCode} alt="QR Code" className="w-40 h-40" />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">Scan with WhatsApp on your phone</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/3 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{s.messagesSent}</p>
                  <p className="text-xs text-slate-500">Sent</p>
                </div>
                <div className="bg-white/3 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-red-400">{s.messagesFailed}</p>
                  <p className="text-xs text-slate-500">Failed</p>
                </div>
              </div>

              {s.lastSeen && (
                <p className="text-xs text-slate-500 mb-3">
                  Last seen {formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true })}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {s.status !== 'connected' && (
                  <button onClick={() => reconnectMutation.mutate(s._id)}
                    className="btn-ghost flex-1 text-xs justify-center py-2">
                    <RefreshCw size={14} />Reconnect
                  </button>
                )}
                <button onClick={() => deleteMutation.mutate(s._id)}
                  className="btn-danger text-xs py-2 px-3">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAdd && (
        <Modal title="Add WhatsApp Account" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Account label</label>
              <input id="account-label" className="input" placeholder="e.g. Marketing Account"
                value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <p className="text-xs text-slate-500">
              A QR code will appear on the card. Open WhatsApp on your phone → Linked Devices → Link a Device.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
              <button id="create-session-btn" onClick={() => createMutation.mutate(label || `Account ${Date.now()}`)}
                disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create & Get QR'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
