import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Trash2, Edit3, Copy, Bold, Italic, Strikethrough } from 'lucide-react'
import { templatesApi } from '../../api'
import { Header } from '../../components/Header'
import { Modal } from '../../components/Modal'
import { PageLoader, EmptyState } from '../../components/UI'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import type { Template } from '../../types'

// Simple WhatsApp format preview
const previewWA = (text: string) =>
  text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~(.*?)~/g, '<del>$1</del>')
    .replace(/\n/g, '<br />')

export const TemplatesPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [form, setForm] = useState({ title: '', message: '', mediaUrl: '' })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data.templates),
  })

  const createMutation = useMutation({
    mutationFn: (d: object) => templatesApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setShowForm(false)
      resetForm()
      toast.success('Template created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => templatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setShowForm(false)
      resetForm()
      toast.success('Template updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: templatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted')
    },
  })

  const resetForm = () => {
    setForm({ title: '', message: '', mediaUrl: '' })
    setEditing(null)
  }

  const openEdit = (t: Template) => {
    setEditing(t)
    setForm({ title: t.title, message: t.message, mediaUrl: t.mediaUrl || '' })
    setShowForm(true)
  }

  const insertFormat = (tag: string) => {
    setForm((f) => ({ ...f, message: f.message + tag }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) updateMutation.mutate({ id: editing._id, data: form })
    else createMutation.mutate(form)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  const templates: Template[] = data || []

  return (
    <div className="animate-in">
      <Header title="Message Templates" subtitle={`${templates.length} template(s)`}
        actions={
          <button id="add-template-btn" onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">
            <Plus size={17} />New Template
          </button>
        } />

      {isLoading ? <PageLoader /> : templates.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="No templates yet"
          desc="Create reusable message templates with WhatsApp formatting"
          action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} />Create Template</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t._id} className="glass glass-hover rounded-2xl p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(37,211,102,0.12)' }}>
                    <FileText size={16} className="text-wa-green" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{t.title}</h3>
                    <p className="text-xs text-slate-500">{t.usageCount} uses</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => copyToClipboard(t.message)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Copy size={13} />
                  </button>
                  <button onClick={() => openEdit(t)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(t._id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Message preview */}
              <div className="flex-1 bg-white/3 rounded-xl p-3 mb-3">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4"
                  dangerouslySetInnerHTML={{ __html: previewWA(t.message) }} />
              </div>

              {t.mediaUrl && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>📎 Media attached</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                Created {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Template' : 'New Template'} onClose={() => { setShowForm(false); resetForm() }} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Template title</label>
              <input className="input" placeholder="e.g. Diwali Offer 2024" required
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-slate-400">Message</label>
                <div className="flex gap-1">
                  {[['*text*', <Bold size={13} />, 'Bold'], ['_text_', <Italic size={13} />, 'Italic'], ['~text~', <Strikethrough size={13} />, 'Strike']].map(([tag, icon, tip]) => (
                    <button key={tag as string} type="button" title={tip as string}
                      onClick={() => insertFormat(tag as string)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                      {icon as React.ReactNode}
                    </button>
                  ))}
                </div>
              </div>
              <textarea className="input resize-none font-mono text-xs" rows={5} required
                placeholder="Type your message here... Supports *bold*, _italic_, ~strikethrough~"
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {form.message && (
                <div className="mt-2 p-3 rounded-xl bg-white/3">
                  <p className="text-xs text-slate-500 mb-1">Preview:</p>
                  <p className="text-xs text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewWA(form.message) }} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Media URL (optional)</label>
              <input className="input" placeholder="https://example.com/image.jpg"
                value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} />
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Save changes' : 'Create Template'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
