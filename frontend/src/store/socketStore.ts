import { io, Socket } from 'socket.io-client'
import { create } from 'zustand'
import type { WASession } from '../types'

interface SocketState {
  socket: Socket | null
  connected: boolean
  connect: (userId: string) => void
  disconnect: () => void
}

export const useSocketStore = create<SocketState>()((set, get) => ({
  socket: null,
  connected: false,

  connect: (userId: string) => {
    if (get().socket?.connected) return

    const socket = io(import.meta.env.VITE_API_URL || '/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => {
      socket.emit('join', userId)
      set({ connected: true })
    })

    socket.on('disconnect', () => set({ connected: false }))

    set({ socket })
  },

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false })
  },
}))
