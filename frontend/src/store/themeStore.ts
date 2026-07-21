import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light' | 'system'
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'red' | 'teal' | 'indigo'

interface ThemeState {
  theme: ThemeMode
  accentColor: AccentColor
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemeMode) => void
  setAccentColor: (color: AccentColor) => void
  applyTheme: () => void
}

const accentColorMap: Record<AccentColor, { primary: string; dark: string; light: string }> = {
  green: { primary: '#25D366', dark: '#128C7E', light: '#DCF8C6' },
  blue: { primary: '#3B82F6', dark: '#1D4ED8', light: '#DBEAFE' },
  purple: { primary: '#8B5CF6', dark: '#6D28D9', light: '#EDE9FE' },
  orange: { primary: '#F97316', dark: '#EA580C', light: '#FED7AA' },
  pink: { primary: '#EC4899', dark: '#DB2777', light: '#FCE7F3' },
  red: { primary: '#EF4444', dark: '#B91C1C', light: '#FEE2E2' },
  teal: { primary: '#14B8A6', dark: '#0F766E', light: '#CCFBF1' },
  indigo: { primary: '#6366F1', dark: '#4338CA', light: '#E0E7FF' },
}

export const getAccentColors = () => accentColorMap

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      accentColor: 'green',
      resolvedTheme: 'dark',

      setTheme: (theme) => {
        set({ theme })
        get().applyTheme()
      },

      setAccentColor: (accentColor) => {
        set({ accentColor })
        get().applyTheme()
      },

      applyTheme: () => {
        const { theme } = get()
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
        
        set({ resolvedTheme: resolved })

        const root = document.documentElement
        // Remove both classes first
        root.classList.remove('dark', 'light')
        // Add the resolved class
        root.classList.add(resolved)

        // Apply accent color CSS variables
        const accent = get().accentColor
        const colors = accentColorMap[accent]
        root.style.setProperty('--accent-primary', colors.primary)
        root.style.setProperty('--accent-dark', colors.dark)
        root.style.setProperty('--accent-light', colors.light)
        
        // Update meta theme-color
        const meta = document.querySelector('meta[name="theme-color"]')
        if (meta) {
          meta.setAttribute('content', resolved === 'dark' ? '#0a0a0f' : '#f8fafc')
        }
      },
    }),
    {
      name: 'theme-store',
      partialize: (s) => ({ theme: s.theme, accentColor: s.accentColor }),
    }
  )
)