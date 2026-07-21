import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Settings2, Shield, Clock, RefreshCw, Moon, Sun, Monitor, Save, Palette } from 'lucide-react'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore, getAccentColors, type ThemeMode, type AccentColor } from '../../store/themeStore'
import { Header } from '../../components/Header'
import toast from 'react-hot-toast'

const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  { value: 'light', label: 'Light', icon: <Sun size={16} /> },
  { value: 'system', label: 'System', icon: <Monitor size={16} /> },
]

const accentColorNames: Record<AccentColor, string> = {
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  orange: 'Orange',
  pink: 'Pink',
  red: 'Red',
  teal: 'Teal',
  indigo: 'Indigo',
}

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuthStore()
  const { theme, accentColor, setTheme, setAccentColor, resolvedTheme } = useThemeStore()
  const [settings, setSettings] = useState({
    defaultMinDelay: user?.settings?.defaultMinDelay ?? 5000,
    defaultMaxDelay: user?.settings?.defaultMaxDelay ?? 15000,
    autoRetry: user?.settings?.autoRetry ?? true,
    maxRetries: user?.settings?.maxRetries ?? 3,
  })

  const saveMutation = useMutation({
    mutationFn: () => authApi.updateSettings(settings),
    onSuccess: (res) => {
      updateUser(res.data.user)
      toast.success('Settings saved')
    },
  })

  const Section: React.FC<{ icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }> = ({
    icon, title, desc, children
  }) => (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--accent-primary)' }}>
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )

  return (
    <div className="animate-in">
      <Header title="Settings" subtitle="Configure your WhatsApp Suite preferences"
        actions={
          <button id="save-settings-btn" onClick={() => saveMutation.mutate()} className="btn-primary"
            disabled={saveMutation.isPending}>
            <Save size={16} />{saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-3xl">
        {/* Delay Settings */}
        <Section icon={<Clock size={18} />} title="Default Delays"
          desc="Applied to new broadcasts automatically">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Min Delay: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {settings.defaultMinDelay < 60000
                    ? `${(settings.defaultMinDelay / 1000).toFixed(0)}s`
                    : settings.defaultMinDelay < 3600000
                      ? `${(settings.defaultMinDelay / 60000).toFixed(0)}m`
                      : `${(settings.defaultMinDelay / 3600000).toFixed(1)}h`}
                </span>
              </label>
              <input type="range" min="60000" max="43200000" step="60000" className="w-full"
                style={{ accentColor: 'var(--accent-primary)' }}
                value={settings.defaultMinDelay}
                onChange={(e) => setSettings({ ...settings, defaultMinDelay: +e.target.value })} />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}><span>1 min</span><span>12 hrs</span></div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Max Delay: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {settings.defaultMaxDelay < 60000
                    ? `${(settings.defaultMaxDelay / 1000).toFixed(0)}s`
                    : settings.defaultMaxDelay < 3600000
                      ? `${(settings.defaultMaxDelay / 60000).toFixed(0)}m`
                      : `${(settings.defaultMaxDelay / 3600000).toFixed(1)}h`}
                </span>
              </label>
              <input type="range" min="60000" max="43200000" step="60000" className="w-full"
                style={{ accentColor: 'var(--accent-primary)' }}
                value={settings.defaultMaxDelay}
                onChange={(e) => setSettings({ ...settings, defaultMaxDelay: +e.target.value })} />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}><span>1 min</span><span>12 hrs</span></div>
            </div>
          </div>
        </Section>

        {/* Retry Settings */}
        <Section icon={<RefreshCw size={18} />} title="Auto Retry"
          desc="Automatically retry failed messages">
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-11 h-6 rounded-full transition-all relative ${settings.autoRetry ? 'bg-wa-green' : 'bg-slate-700'}`}
                style={{ background: settings.autoRetry ? 'var(--accent-primary)' : undefined }}
                onClick={() => setSettings({ ...settings, autoRetry: !settings.autoRetry })}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoRetry ? 'left-6' : 'left-1'}`} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Enable auto-retry on failure</span>
            </label>
            {settings.autoRetry && (
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Max retries: <span style={{ color: 'var(--text-primary)' }}>{settings.maxRetries}</span></label>
                <input type="range" min="1" max="5" step="1" className="w-full"
                  style={{ accentColor: 'var(--accent-primary)' }}
                  value={settings.maxRetries}
                  onChange={(e) => setSettings({ ...settings, maxRetries: +e.target.value })} />
              </div>
            )}
          </div>
        </Section>

        {/* Theme Mode */}
        <Section icon={<Moon size={18} />} title="Theme Mode" desc="Choose dark, light, or follow your system">
          <div className="flex gap-2">
            {themeOptions.map(({ value, label, icon }) => (
              <button key={value} onClick={() => setTheme(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium ${
                  theme === value
                    ? 'border-wa-green text-wa-green bg-wa-green/10'
                    : 'border-white/10 text-slate-400 hover:border-white/20'
                }`}
                style={{
                  borderColor: theme === value ? 'var(--accent-primary)' : 'var(--border-glass)',
                  color: theme === value ? 'var(--accent-primary)' : 'var(--text-muted)',
                  background: theme === value ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' : undefined,
                }}>
                {icon}
                {label}
              </button>
            ))}
          </div>
          {theme === 'system' && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Currently using: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{resolvedTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
            </p>
          )}
        </Section>

        {/* Accent Color */}
        <Section icon={<Palette size={18} />} title="Accent Color" desc="Customize the app's accent color">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2.5">
              {(Object.keys(getAccentColors()) as AccentColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className="accent-swatch"
                  style={{
                    backgroundColor: getAccentColors()[color].primary,
                    borderColor: accentColor === color ? 'var(--text-primary)' : 'transparent',
                    boxShadow: accentColor === color ? `0 0 12px ${getAccentColors()[color].primary}66` : undefined,
                  }}
                  title={accentColorNames[color]}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Selected: <span className="font-medium" style={{ color: 'var(--accent-primary)' }}>{accentColorNames[accentColor]}</span>
            </p>
          </div>
        </Section>

        {/* Account Info */}
        <Section icon={<Shield size={18} />} title="Account" desc="Your plan and account details">
          <div className="space-y-3">
            {[
              { label: 'Name', value: user?.name },
              { label: 'Email', value: user?.email },
              { label: 'Plan', value: user?.plan?.toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 last:border-0"
                style={{ borderBottom: '1px solid var(--table-border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
