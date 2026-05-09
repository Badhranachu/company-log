import { create } from 'zustand'
import toast from 'react-hot-toast'
import api from '../lib/api'

export const useChatStore = create((set, get) => ({
  chatboxes: [],
  messages: [],
  activeChat: null,
  socket: null,
  typingUsers: [],
  presence: {},
  page: 1,
  hasMore: true,
  uploadProgress: 0,
  clearActiveChat: () => set({ activeChat: null, messages: [], page: 1, hasMore: true }),
  async fetchChatboxes(q = '') {
    const { data } = await api.get('/chatboxes/', { params: { search: q } })
    set({ chatboxes: data.results || data })
  },
  async createChatbox(payload) {
    await api.post('/chatboxes/', payload)
    await get().fetchChatboxes()
  },
  async setActiveChat(chat) {
    set({ activeChat: chat, messages: [], page: 1, hasMore: true })
    await get().fetchMessages(1)
    get().connectSocket(chat.id)
  },
  async fetchMessages(page = 1) {
    const chat = get().activeChat
    if (!chat) return
    const { data } = await api.get('/messages/', { params: { chatbox: chat.id, page, page_size: 30 } })
    const next = data.results || data
    set((s) => ({
      messages: page === 1 ? next.reverse() : [...next.reverse(), ...s.messages],
      page,
      hasMore: Boolean(data.next),
    }))
  },
  connectSocket(chatboxId) {
    const oldSocket = get().socket
    if (oldSocket) oldSocket.close()
    const token = localStorage.getItem('access')
    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + `/ws/chat/${chatboxId}/?token=${token}`
    const socket = new WebSocket(wsUrl)
    socket.onmessage = (event) => {
      const packet = JSON.parse(event.data)
      if (packet.type === 'message') {
        const incoming = packet.payload
        set((s) => ({
          messages: s.messages.some((m) => m.id === incoming.id)
            ? s.messages
            : s.messages.map((m) => (incoming.client_id && m.client_id === incoming.client_id ? { ...incoming } : m)).concat(
                s.messages.some((m) => incoming.client_id && m.client_id === incoming.client_id) ? [] : [incoming]
              )
        }))
      }
      if (packet.type === 'typing') {
        const id = packet.payload.user_id
        set((s) => ({ typingUsers: Array.from(new Set([...s.typingUsers, id])) }))
        setTimeout(() => set((s) => ({ typingUsers: s.typingUsers.filter((x) => x !== id) })), 1200)
      }
      if (packet.type === 'presence') {
        const p = packet.payload
        set((s) => ({ presence: { ...s.presence, [p.user_id]: p.online } }))
      }
      if (packet.type === 'seen') {
        const { message_id, user_id } = packet.payload
        set((s) => ({ messages: s.messages.map((m) => m.id === message_id ? { ...m, seen_by_ids: Array.from(new Set([...(m.seen_by_ids || []), user_id])) } : m) }))
      }
    }
    set({ socket })
  },
  sendTyping() {
    const socket = get().socket
    if (socket?.readyState === 1) socket.send(JSON.stringify({ type: 'typing' }))
  },
  async sendMessage(message, replyTo = null) {
    const socket = get().socket
    const active = get().activeChat
    if (!active) return
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const clientId = `tmp-${Date.now()}`
    const optimistic = {
      id: clientId,
      client_id: clientId,
      sender: user?.id,
      sender_name: user?.name,
      message,
      created_at: new Date().toISOString(),
      is_ticked: false,
      is_pinned: false,
      reply_to: replyTo,
      optimistic: true,
      seen_by_ids: []
    }
    set((s) => ({ messages: [...s.messages, optimistic] }))
    if (socket?.readyState === 1) {
      socket.send(JSON.stringify({ type: 'message', message, reply_to: replyTo, client_id: clientId }))
      setTimeout(async () => {
        const stillPending = get().messages.some((m) => m.client_id === clientId)
        if (!stillPending) return
        try {
          const { data } = await api.post('/messages/', { chatbox: active.id, message, reply_to: replyTo })
          set((s) => ({ messages: s.messages.map((m) => (m.client_id === clientId ? data : m)) }))
        } catch {
          toast.error('Message failed to send')
          set((s) => ({ messages: s.messages.filter((m) => m.client_id !== clientId) }))
        }
      }, 1800)
    } else {
      try {
        const { data } = await api.post('/messages/', { chatbox: active.id, message, reply_to: replyTo })
        set((s) => ({ messages: s.messages.map((m) => (m.client_id === clientId ? data : m)) }))
      } catch {
        toast.error('Message failed to send')
        set((s) => ({ messages: s.messages.filter((m) => m.client_id !== clientId) }))
      }
    }
  },
  async sendFile(file, message = '') {
    const active = get().activeChat
    if (!active) return
    const formData = new FormData()
    formData.append('chatbox', active.id)
    formData.append('message', message)
    formData.append('attachment', file)
    const { data } = await api.post('/messages/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        const value = e.total ? Math.round((e.loaded * 100) / e.total) : 0
        set({ uploadProgress: value })
      }
    })
    set((s) => ({ messages: [...s.messages, data], uploadProgress: 0 }))
    toast.success('File uploaded')
  },
  async toggleTick(messageId) {
    const { data } = await api.post(`/messages/${messageId}/toggle_tick/`)
    set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? { ...m, is_ticked: data.is_ticked } : m) }))
  },
  async togglePin(messageId) {
    const { data } = await api.post(`/messages/${messageId}/toggle_pin/`)
    set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? { ...m, is_pinned: data.is_pinned } : m) }))
  },
  async deleteMessage(messageId) {
    try {
      await api.delete(`/messages/${messageId}/`)
      set((s) => ({ messages: s.messages.filter((m) => m.id !== messageId) }))
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Unable to delete this message')
    }
  },
  async editMessage(messageId, message) {
    try {
      const { data } = await api.patch(`/messages/${messageId}/`, { message })
      set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...data, edited_at: data.edited_at || new Date().toISOString() } : m)) }))
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Unable to edit this message')
    }
  },
  async markSeen(messageId) {
    const socket = get().socket
    await api.post(`/messages/${messageId}/seen/`)
    if (socket?.readyState === 1) socket.send(JSON.stringify({ type: 'seen', message_id: messageId }))
  }
}))
