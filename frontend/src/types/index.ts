// ─── User ─────────────────────────────────────────────────────
export interface User {
  _id: string
  name: string
  email: string
  plan: 'free' | 'pro' | 'enterprise'
  settings: {
    theme: 'dark' | 'light'
    defaultMinDelay: number
    defaultMaxDelay: number
    autoRetry: boolean
    maxRetries: number
  }
  lastLogin?: string
  createdAt: string
}

// ─── Auth ─────────────────────────────────────────────────────
export interface AuthResponse {
  success: boolean
  accessToken: string
  refreshToken: string
  user: User
}

// ─── Session ──────────────────────────────────────────────────
export interface WASession {
  _id: string
  sessionId: string
  phone: string | null
  label: string
  status: 'pending' | 'qr_ready' | 'connected' | 'disconnected' | 'banned' | 'error'
  qrCode: string | null
  messagesSent: number
  messagesFailed: number
  lastSeen?: string
  createdAt: string
}

// ─── Contact ──────────────────────────────────────────────────
export interface Contact {
  _id: string
  name: string
  phone: string
  tags: string[]
  notes: string
  lastMessage: string
  lastMessageAt?: string
  isOptedOut: boolean
  createdAt: string
}

export interface ContactsResponse {
  success: boolean
  contacts: Contact[]
  total: number
  page: number
  pages: number
}

// ─── Template ─────────────────────────────────────────────────
export interface Template {
  _id: string
  title: string
  message: string
  mediaUrl: string | null
  mediaType: 'image' | 'video' | 'document' | null
  usageCount: number
  createdAt: string
}

// ─── Broadcast ────────────────────────────────────────────────
export interface BroadcastRecipient {
  phone: string
  name: string
  status: 'pending' | 'sent' | 'failed'
  sentAt?: string
  error?: string
  sessionId?: string
}

export interface Broadcast {
  _id: string
  title: string
  message: string
  mediaUrl: string | null
  mediaType: string | null
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped'
  total: number
  sent: number
  failed: number
  minDelay: number
  maxDelay: number
  useRoundRobin: boolean
  recipients?: BroadcastRecipient[]
  startedAt?: string
  completedAt?: string
  createdAt: string
}

// ─── Log ──────────────────────────────────────────────────────
export interface LogEntry {
  _id: string
  event: string
  level: 'info' | 'warn' | 'error' | 'success'
  details: string
  sessionId?: string
  phone?: string
  createdAt: string
}

// ─── Stats ────────────────────────────────────────────────────
export interface DashboardStats {
  totalContacts: number
  activeSessions: number
  totalSent: number
  totalFailed: number
  todaySent: number
}

// ─── API Response ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

// ─── Socket Events ────────────────────────────────────────────
export interface BroadcastProgress {
  broadcastId: string
  sent: number
  failed: number
  total: number
  current: number
  contact: { phone: string; name: string }
  status: 'sent' | 'failed'
}
