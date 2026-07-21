import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ScrollText, Filter } from 'lucide-react'
import { logsApi } from '../../api'
import { Header } from '../../components/Header'
import { StatusBadge } from '../../components/Badge'
import { PageLoader, EmptyState } from '../../components/UI'
import { format } from 'date-fns'
import type { LogEntry } from '../../types'

const LEVEL_COLORS: Record<string, string> = {
  success: 'text-wa-green',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

export const LogsPage: React.FC = () => {
  const [level, setLevel] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, level, search],
    queryFn: () => logsApi.list({ page, limit: 100, level, event: search }).then((r) => r.data),
    refetchInterval: 10_000,
  })

  const logs: LogEntry[] = data?.logs || []

  return (
    <div className="animate-in">
      <Header title="Activity Logs" subtitle="Real-time system events and audit trail" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search events..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2">
          {['', 'info', 'success', 'warn', 'error'].map((l) => (
            <button key={l} onClick={() => { setLevel(l); setPage(1) }}
              className={`text-xs px-3 py-2 rounded-xl transition-all capitalize ${l === level ? 'btn-primary' : 'btn-ghost'}`}>
              {l || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={32} />} title="No logs found" desc="Activity will appear here as you use the platform" />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Event</th>
                <th>Details</th>
                <th>Session</th>
                <th>Phone</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <span className={`text-xs font-semibold uppercase ${LEVEL_COLORS[log.level] || 'text-slate-400'}`}>
                      {log.level}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-mono text-slate-300">
                      {log.event.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="max-w-xs">
                    <span className="text-xs text-slate-400 line-clamp-1">{log.details}</span>
                  </td>
                  <td>
                    {log.sessionId && (
                      <span className="text-xs font-mono text-slate-500">{log.sessionId.slice(0, 8)}...</span>
                    )}
                  </td>
                  <td>
                    {log.phone && <span className="text-xs font-mono text-slate-400">{log.phone}</span>}
                  </td>
                  <td>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'dd MMM HH:mm:ss')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  )
}
