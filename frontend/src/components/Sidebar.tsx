import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone, Users, FileText, Radio,
  ScrollText, Settings, LogOut, MessageSquare, Wifi
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { clsx } from 'clsx'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Smartphone },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/templates', label: 'Templates', icon: FileText },
  { path: '/broadcast', label: 'Broadcast', icon: Radio },
  { path: '/logs', label: 'Logs', icon: ScrollText },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col py-6 px-3 z-40"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-dark))' }}>
          <MessageSquare size={18} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>WA Suite</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.plan?.toUpperCase()}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center gap-2 px-3 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-dark))' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
