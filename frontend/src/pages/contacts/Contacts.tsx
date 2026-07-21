import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Upload, Download, Trash2, Tag, Users, Edit3, Check, X } from 'lucide-react'
import { contactsApi } from '../../api'
import { Header } from '../../components/Header'
import { Modal } from '../../components/Modal'
import { PageLoader, EmptyState } from '../../components/UI'
import { Badge } from '../../components/Badge'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import type { Contact } from '../../types'

export const ContactsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', phone: '', tags: '', notes: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search, activeTag],
    queryFn: () => contactsApi.list({ page, limit: 50, search, tag: activeTag }).then((r) => r.data),
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => contactsApi.tags().then((r) => r.data.tags),
  })

  const createMutation = useMutation({
    mutationFn: (d: object) => contactsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setShowAdd(false)
      setForm({ name: '', phone: '', tags: '', notes: '' })
      toast.success('Contact added')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => contactsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setEditing(null)
      toast.success('Contact updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact deleted')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: () => contactsApi.bulkDelete(selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setSelected([])
      toast.success(`${selected.length} contacts deleted`)
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => contactsApi.import(file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`Imported ${res.data.imported} contacts (${res.data.skipped} skipped)`)
    },
  })

  const handleExport = async () => {
    const res = await contactsApi.export()
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url; a.download = 'contacts.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Contacts exported')
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    e.target.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) }
    if (editing) updateMutation.mutate({ id: editing._id, data: payload })
    else createMutation.mutate(payload)
  }

  const openEdit = (c: Contact) => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone, tags: c.tags.join(', '), notes: c.notes })
    setShowAdd(true)
  }

  const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  const toggleAll = () => setSelected(contacts.length === selected.length ? [] : contacts.map((c) => c._id))

  const contacts: Contact[] = data?.contacts || []
  const tags: string[] = tagsData || []

  return (
    <div className="animate-in">
      <Header title="Contacts" subtitle={`${data?.total || 0} total contacts`}
        actions={
          <div className="flex gap-2">
            {selected.length > 0 && (
              <button onClick={() => bulkDeleteMutation.mutate()} className="btn-danger text-xs">
                <Trash2 size={14} />Delete {selected.length}
              </button>
            )}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-xs" id="import-csv-btn">
              <Upload size={15} />{importMutation.isPending ? 'Importing...' : 'Import CSV'}
            </button>
            <button onClick={handleExport} className="btn-ghost text-xs" id="export-csv-btn">
              <Download size={15} />Export
            </button>
            <button onClick={() => { setEditing(null); setForm({ name: '', phone: '', tags: '', notes: '' }); setShowAdd(true) }}
              className="btn-primary text-sm" id="add-contact-btn">
              <Plus size={16} />Add Contact
            </button>
          </div>
        } />

      {/* Search + Tag filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input id="contact-search" className="input pl-9" placeholder="Search by name or phone..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTag('')}
            className={`text-xs px-3 py-2 rounded-xl transition-all ${!activeTag ? 'btn-primary' : 'btn-ghost'}`}>
            All
          </button>
          {tags.map((tag) => (
            <button key={tag} onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
              className={`text-xs px-3 py-2 rounded-xl transition-all ${tag === activeTag ? 'btn-primary' : 'btn-ghost'}`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <PageLoader /> : contacts.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="No contacts found"
          desc={search ? 'Try a different search term' : 'Import a CSV or add contacts manually'}
          action={<button onClick={() => { setEditing(null); setShowAdd(true) }} className="btn-primary"><Plus size={16} />Add Contact</button>} />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox" checked={selected.length === contacts.length && contacts.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th>Name</th>
                <th>Phone</th>
                <th>Tags</th>
                <th>Last Message</th>
                <th>Added</th>
                <th className="w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c._id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(c._id)}
                      onChange={() => toggleSelect(c._id)} className="rounded" />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                        {(c.name || c.phone).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{c.name || '—'}</span>
                    </div>
                  </td>
                  <td className="text-slate-300 font-mono text-xs">{c.phone}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <Badge key={tag} variant="purple" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="text-slate-400 text-xs max-w-32 truncate">{c.lastMessage || '—'}</td>
                  <td className="text-slate-500 text-xs">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(c._id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm transition-all ${p === page ? 'btn-primary' : 'btn-ghost'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <Modal title={editing ? 'Edit Contact' : 'Add Contact'} onClose={() => { setShowAdd(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Name</label>
                <input className="input" placeholder="John Doe"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Phone *</label>
                <input className="input" placeholder="919876543210" required
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!!editing} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Tags (comma separated)</label>
              <input className="input" placeholder="customers, vip, leads"
                value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Notes</label>
              <textarea className="input resize-none" rows={2} placeholder="Optional notes"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowAdd(false); setEditing(null) }} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Save changes' : 'Add Contact'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
