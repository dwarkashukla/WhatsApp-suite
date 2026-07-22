import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: attach token ────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor: handle 401 / errors ───────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        localStorage.setItem('access_token', data.accessToken)
        localStorage.setItem('refresh_token', data.refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    const msg = error.response?.data?.message || 'Something went wrong'
    if (error.response?.status !== 401) toast.error(msg)
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string }) => api.post('/auth/register', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  updateSettings: (data: object) => api.put('/auth/settings', data),
}

// ─── Sessions ─────────────────────────────────────────────────
export const sessionsApi = {
  list: () => api.get('/sessions'),
  create: (label: string) => api.post('/sessions', { label }),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  reconnect: (id: string) => api.post(`/sessions/${id}/reconnect`),
}

// ─── Contacts ─────────────────────────────────────────────────
export const contactsApi = {
  list: (params?: object) => api.get('/contacts', { params }),
  create: (data: object) => api.post('/contacts', data),
  update: (id: string, data: object) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  bulkDelete: (ids: string[]) => api.delete('/contacts/bulk', { data: { ids } }),
  tags: () => api.get('/contacts/tags'),
  import: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/contacts/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  export: () => api.get('/contacts/export', { responseType: 'blob' }),
}

// ─── Templates ────────────────────────────────────────────────
export const templatesApi = {
  list: () => api.get('/templates'),
  create: (data: object) => api.post('/templates', data),
  update: (id: string, data: object) => api.put(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
}

// ─── Broadcasts ───────────────────────────────────────────────
export const broadcastsApi = {
  list: (params?: object) => api.get('/broadcasts', { params }),
  get: (id: string) => api.get(`/broadcasts/${id}`),
  create: (data: FormData) => api.post('/broadcasts', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  stop: (id: string) => api.post(`/broadcasts/${id}/stop`),
  delete: (id: string) => api.delete(`/broadcasts/${id}`),
}

// ─── Logs ─────────────────────────────────────────────────────
export const logsApi = {
  list: (params?: object) => api.get('/logs', { params }),
}

// ─── Stats ────────────────────────────────────────────────────
export const statsApi = {
  get: () => api.get('/stats'),
}

export default api
