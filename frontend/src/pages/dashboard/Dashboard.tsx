import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Smartphone, Send, XCircle, Radio, Clock } from 'lucide-react'
import { statsApi } from '../../api'
import { Header } from '../../components/Header'
import { StatCard, PageLoader } from '../../components/UI'
import { StatusBadge } from '../../components/Badge'
import { formatDistanceToNow } from 'date-fns'
import type { DashboardStats, Broadcast, LogEntry } from '../../types'

export const DashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.get().then((r) => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return <PageLoader />

  const stats: DashboardStats = data?.stats || {}
  const recentBroadcasts: Broadcast[] = data?.recentBroadcasts || []
  const recentLogs: LogEntry[] = data?.recentLogs || []

  return (
    <div className="animate-in">
      <Header title="Dashboard" subtitle={`Overview of your WhatsApp operations`} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Contacts" value={stats.totalContacts || 0} icon={<Users size={20} />} />
        <StatCard label="Active Sessions" value={stats.activeSessions || 0}
          icon={<Smartphone size={20} />} color="#3b82f6" />
        <StatCard label="Messages Sent" value={stats.totalSent || 0}
          icon={<Send size={20} />} color="#8b5cf6"
          trend={`${stats.todaySent || 0} today`} />
        <StatCard label="Failed" value={stats.totalFailed || 0}
          icon={<XCircle size={20} />} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Broadcasts */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Radio size={18} className="text-wa-green" />
            <h2 className="font-semibold text-white">Recent Broadcasts</h2>
          </div>
          {recentBroadcasts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No broadcasts yet</p>
          ) : (
            <div className="space-y-3">
              {recentBroadcasts.map((b) => (
                <div key={b._id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{b.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {b.sent}/{b.total} sent · {b.failed} failed
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Logs */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-wa-green" />
            <h2 className="font-semibold text-white">Activity Log</h2>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log._id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/3 transition-colors">
                  <span className={`status-dot mt-1.5 flex-shrink-0 ${log.level}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white">{log.event.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500 truncate">{log.details}</p>
                  </div>
                  <span className="text-xs text-slate-600 flex-shrink-0">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
