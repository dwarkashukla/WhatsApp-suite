import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Radio, Trash2, StopCircle, Eye, Send, XCircle, Clock } from 'lucide-react'
import { broadcastsApi, templatesApi, contactsApi } from '../../api'
import { useSocketStore } from '../../store/socketStore'
import { Header } from '../../components/Header'
import { Modal } from '../../components/Modal'
import { StatusBadge } from '../../components/Badge'
import { PageLoader, EmptyState, ProgressBar } from '../../components/UI'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Broadcast, BroadcastProgress, Template } from '../../types'

interface LiveProgress {
  broadcastId: string
  sent: number
  failed: number
  total: number
  current: number
  contact: { phone: string; name: string }
  status: 'sent' | 'failed'
}

export const BroadcastPage: React.FC = () => {
  const [showNew, setShowNew] = useState(false)
  const [liveProgress, setLiveProgress] = useState<Record<string, LiveProgress>>({})
  const [viewBroadcast, setViewBroadcast] = useState<Broadcast | null>(null)
  const [form, setForm] = useState({
    title: '', message: '', recipientType: 'all', tag: '', phones: '',
    minDelay: '5000', maxDelay: '20000', mediaUrl: '', useRoundRobin: true,
  })
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { socket } = useSocketStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => broadcastsApi.list().then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data.templates),
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => contactsApi.tags().then((r) => r.data.tags),
  })

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => broadcastsApi.create(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      setShowNew(false)
      resetForm()
      toast.success('Broadcast started! 🚀')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to start broadcast'
      toast.error(msg)
    },
  })

  const stopMutation = useMutation({
    mutationFn: broadcastsApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      toast.success('Broadcast stop requested')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: broadcastsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      toast.success('Broadcast deleted')
    },
  })

  // Listen for real-time progress
  useEffect(() => {
    if (!socket) return

    socket.on('broadcast:progress', (data: LiveProgress) => {
      setLiveProgress((prev) => ({ ...prev, [data.broadcastId]: data }))
      queryClient.setQueryData<{ broadcasts: Broadcast[] }>(['broadcasts'], (old) => {
        if (!old) return old
        return {
          ...old,
          broadcasts: old.broadcasts.map((b) =>
            b._id === data.broadcastId
              ? { ...b, sent: data.sent, failed: data.failed, status: 'running' }
              : b
          ),
        }
      })
    })

    socket.on('broadcast:done', (data: { broadcastId: string; sent: number; failed: number; status: string }) => {
      setLiveProgress((prev) => { const n = { ...prev }; delete n[data.broadcastId]; return n })
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      if (data.sent === 0 && data.failed > 0) {
        toast.error(`Broadcast failed for all ${data.failed} recipients. Check Logs for details.`)
      } else {
        toast.success(`Broadcast completed! Sent: ${data.sent}, Failed: ${data.failed}`)
      }
    })

    socket.on('broadcast:stopped', () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    })

    socket.on('broadcast:error', (data: { broadcastId: string; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      toast.error(data.message || 'Broadcast error')
    })

    return () => {
      socket.off('broadcast:progress')
      socket.off('broadcast:done')
      socket.off('broadcast:stopped')
      socket.off('broadcast:error')
    }
  }, [socket, queryClient])

  const resetForm = () => {
    setForm({ title: '', message: '', recipientType: 'all', tag: '', phones: '', minDelay: '5000', maxDelay: '20000', mediaUrl: '', useRoundRobin: true })
    setMediaFile(null)
    setSelectedTemplate('')
  }

  const handleTemplateLoad = (id: string) => {
    setSelectedTemplate(id)
    const tmpl = (templatesData as Template[] || []).find((t) => t._id === id)
    if (tmpl) {
      setForm((f) => ({ ...f, message: tmpl.message, mediaUrl: tmpl.mediaUrl || '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
    if (mediaFile) fd.append('media', mediaFile)
    createMutation.mutate(fd)
  }

  const broadcasts: Broadcast[] = data?.broadcasts || []
  const templates: Template[] = templatesData || []
  const tags: string[] = tagsData || []

  const statusColor = { running: '#25D366', completed: '#25D366', failed: '#ef4444', stopped: '#f59e0b', pending: '#3b82f6' }

  return (
    <div className="animate-in">
      <Header title="Broadcast" subtitle={`${broadcasts.length} campaign(s)`}
        actions={
          <button id="new-broadcast-btn" onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={17} />New Broadcast
          </button>
        } />

      {/* Live running broadcasts */}
      {Object.keys(liveProgress).length > 0 && (
        <div className="mb-6 space-y-3">
          {Object.values(liveProgress).map((prog) => {
            const bc = broadcasts.find((b) => b._id === prog.broadcastId)
            return (
              <div key={prog.broadcastId} className="glass rounded-2xl p-5 border border-wa-green/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="status-dot connected" />
                    <span className="text-white font-semibold text-sm">{bc?.title || 'Running broadcast'}</span>
                    <span className="badge badge-green text-xs">LIVE</span>
                  </div>
                  <button onClick={() => stopMutation.mutate(prog.broadcastId)} className="btn-danger text-xs py-1.5">
                    <StopCircle size={14} />Stop
                  </button>
                </div>
                <ProgressBar value={prog.sent + prog.failed} max={prog.total}
                  label={`${prog.sent + prog.failed} / ${prog.total} processed`} />
                <div className="flex gap-4 mt-3 text-xs text-slate-400">
                  <span className="text-wa-green">✓ {prog.sent} sent</span>
                  <span className="text-red-400">✗ {prog.failed} failed</span>
                  <span>→ {prog.contact.phone}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isLoading ? <PageLoader /> : broadcasts.length === 0 ? (
        <EmptyState icon={<Radio size={32} />} title="No broadcasts yet"
          desc="Create your first broadcast to send bulk messages with round-robin load balancing"
          action={<button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={16} />New Broadcast</button>} />
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b._id} className="glass glass-hover rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">{b.title}</h3>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-slate-400 mb-3 line-clamp-1">{b.message}</p>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1"><Send size={12} className="text-wa-green" />{b.sent} sent</span>
                    <span className="flex items-center gap-1"><XCircle size={12} className="text-red-400" />{b.failed} failed</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{b.total} total</span>
                    {b.startedAt && (
                      <span>{format(new Date(b.startedAt), 'dd MMM, hh:mm a')}</span>
                    )}
                  </div>

                  <ProgressBar value={b.sent + b.failed} max={b.total} />
                </div>

                <div className="flex gap-2 ml-4">
                  <button onClick={() => broadcastsApi.get(b._id).then((r) => setViewBroadcast(r.data.broadcast))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Eye size={15} />
                  </button>
                  {b.status === 'running' && (
                    <button onClick={() => stopMutation.mutate(b._id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all">
                      <StopCircle size={15} />
                    </button>
                  )}
                  {!['running', 'pending'].includes(b.status) && (
                    <button onClick={() => deleteMutation.mutate(b._id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Broadcast Modal */}
      {showNew && (
        <Modal title="New Broadcast" onClose={() => { setShowNew(false); resetForm() }} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Title *</label>
              <input className="input" placeholder="e.g. Diwali Offer 2024" required
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Message *</label>
              <textarea className="input resize-none font-mono text-xs" rows={5} required
                placeholder="Type your message here...&#10;Supports WhatsApp formatting: *bold*, _italic_, ~strikethrough~"
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>

            {/* Media */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Attach File (image/video/document)</label>
              <div className="flex gap-3">
                <div className="flex-1 border border-dashed border-white/15 rounded-xl flex items-center justify-center p-4 cursor-pointer hover:border-wa-green/40 transition-colors"
                  onClick={() => fileRef.current?.click()}>
                  <span className="text-xs text-slate-500">
                    {mediaFile ? `📎 ${mediaFile.name}` : '↑ Click to attach file (optional)'}
                  </span>
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1">Or paste an image URL:</p>
              <input className="input mt-1" placeholder="https://... (if no file attached)"
                value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} />
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Recipients</label>
              <select className="input" value={form.recipientType}
                onChange={(e) => setForm({ ...form, recipientType: e.target.value })}>
                <option value="all">All Contacts</option>
                <option value="tag">By Tag</option>
                <option value="custom">Custom (paste phones)</option>
              </select>
              {form.recipientType === 'tag' && (
                <select className="input mt-2" value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                  <option value="">Select a tag...</option>
                  {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {form.recipientType === 'custom' && (
                <textarea className="input mt-2 font-mono text-xs resize-none" rows={4}
                  placeholder="One phone number per line:&#10;919876543210&#10;918765432109"
                  value={form.phones} onChange={(e) => setForm({ ...form, phones: e.target.value })} />
              )}
            </div>

            {/* Delays - in minutes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Min Delay (minutes)</label>
                <input type="number" className="input" min="1" max="720" step="1"
                  value={Math.round(Number(form.minDelay) / 60000)}
                  onChange={(e) => setForm({ ...form, minDelay: String(Number(e.target.value) * 60000) })} />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Max Delay (minutes)</label>
                <input type="number" className="input" min="1" max="720" step="1"
                  value={Math.round(Number(form.maxDelay) / 60000)}
                  onChange={(e) => setForm({ ...form, maxDelay: String(Number(e.target.value) * 60000) })} />
              </div>
            </div>

            {/* Load template */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Or Load from Template</label>
              <select className="input" value={selectedTemplate} onChange={(e) => handleTemplateLoad(e.target.value)}>
                <option value="">Select template...</option>
                {templates.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
              </select>
            </div>

            {/* Round robin info */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-wa-green/5 border border-wa-green/15">
              <input type="checkbox" className="mt-0.5" checked={form.useRoundRobin}
                onChange={(e) => setForm({ ...form, useRoundRobin: e.target.checked })} />
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-wa-green font-medium">Round-robin load balancing</span> — Messages will be distributed across all active WhatsApp accounts to reduce ban risk. 1 active account will share the workload.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowNew(false); resetForm() }} className="btn-ghost">Cancel</button>
              <button type="submit" id="create-broadcast-btn" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Starting...' : <><Radio size={16} />Create Broadcast</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Broadcast Detail Modal */}
      {viewBroadcast && (
        <Modal title="Broadcast Details" onClose={() => setViewBroadcast(null)} size="lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">{viewBroadcast.title}</h3>
              <StatusBadge status={viewBroadcast.status} />
            </div>
            <ProgressBar value={viewBroadcast.sent + viewBroadcast.failed} max={viewBroadcast.total}
              label={`${viewBroadcast.sent} sent · ${viewBroadcast.failed} failed · ${viewBroadcast.total} total`} />
            <div className="glass rounded-xl p-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2 font-medium">CONTACT-WISE PROGRESS</p>
              {viewBroadcast.recipients?.slice(0, 50).map((r, i) => (
                <div key={i} className="flex flex-col gap-0.5 py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-mono">{r.phone}{r.name ? ` · ${r.name}` : ''}</span>
                    <span className={`text-xs font-medium ${r.status === 'sent' ? 'text-wa-green' : r.status === 'failed' ? 'text-red-400' : 'text-slate-500'}`}>
                      {r.status}
                    </span>
                  </div>
                  {r.status === 'failed' && r.error && (
                    <span className="text-[10px] text-red-400/80 truncate" title={r.error}>{r.error}</span>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setViewBroadcast(null)} className="btn-ghost w-full justify-center">Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
