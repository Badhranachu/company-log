import { create } from 'zustand'
import toast from 'react-hot-toast'
import api, { API_BASE_URL } from '../lib/api'

function resolveWsBase() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  try {
    const u = new URL(API_BASE_URL)
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${u.host}`
  } catch {
    return 'ws://localhost:8000'
  }
}

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
  socketStatus: 'disconnected',
  users: [],
  clearActiveChat: () => set({ activeChat: null, messages: [], page: 1, hasMore: true }),
  async fetchChatboxes(q = '') {
    const { data } = await api.get('/chatboxes/', { params: { search: q } })
    set({ chatboxes: data.results || data })
  },
  async createChatbox(payload) {
    await api.post('/chatboxes/', payload, {
      headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    })
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
    const token = sessionStorage.getItem('access')
    const wsUrl = resolveWsBase() + `/ws/chat/${chatboxId}/?token=${token}`
    const socket = new WebSocket(wsUrl)
    socket.onopen = () => set({ socketStatus: 'connected' })
    socket.onclose = () => {
      set({ socketStatus: 'disconnected' })
      setTimeout(() => {
        if (get().activeChat?.id === chatboxId) get().connectSocket(chatboxId)
      }, 1500)
    }
    socket.onerror = () => set({ socketStatus: 'error' })
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
      if (packet.type === 'delete') {
        const { message_id } = packet.payload
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === message_id
              ? { ...m, deleted_for_everyone: true, display_message: 'This message was deleted', message: '', attachment: null, attachment_url: null }
              : m
          ),
        }))
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
    const user = JSON.parse(sessionStorage.getItem('user') || 'null')
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
    const user = JSON.parse(sessionStorage.getItem('user') || 'null')
    const clientId = `file-${Date.now()}`
    const localUrl = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    const guessedType = file.type.startsWith('image/') ? 'image'
      : isVideo ? 'video'
      : file.type.startsWith('audio/') ? 'other'
      : 'document'

    const optimistic = {
      id: clientId, client_id: clientId, chatbox: active.id,
      sender: user?.id, sender_name: user?.name, message: message || '',
      attachment_url: localUrl, attachment_type: guessedType,
      created_at: new Date().toISOString(), optimistic: true, seen_by_ids: [],
    }
    set((s) => ({ messages: [...s.messages, optimistic] }))

    try {
      if (isVideo && file.size > 5 * 1024 * 1024) {
        // Chunked upload for videos > 5 MB
        const CHUNK = 2 * 1024 * 1024 // 2 MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK)
        const uploadId = `${Date.now()}-${file.name}`
        let lastData = null
        for (let i = 0; i < totalChunks; i++) {
          const blob = file.slice(i * CHUNK, (i + 1) * CHUNK)
          const chunkFile = new File([blob], file.name, { type: file.type })
          const fd = new FormData()
          fd.append('chatbox', active.id)
          fd.append('message', i === 0 ? message : '')
          fd.append('attachment', chunkFile)
          fd.append('upload_id', uploadId)
          fd.append('chunk_index', i)
          fd.append('total_chunks', totalChunks)
          const { data } = await api.post('/messages/', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const chunkPct = e.total ? e.loaded / e.total : 1
              const overall = Math.round(((i + chunkPct) / totalChunks) * 100)
              set({ uploadProgress: overall })
            },
          })
          if (data.id) lastData = data
        }
        if (lastData) {
          set((s) => ({ messages: s.messages.map((m) => m.client_id === clientId ? lastData : m), uploadProgress: 0 }))
        }
      } else {
        const formData = new FormData()
        formData.append('chatbox', active.id)
        formData.append('message', message)
        formData.append('attachment', file)
        const { data } = await api.post('/messages/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            set({ uploadProgress: e.total ? Math.round((e.loaded * 100) / e.total) : 0 })
          },
        })
        set((s) => ({ messages: s.messages.map((m) => m.client_id === clientId ? data : m), uploadProgress: 0 }))
      }
      toast.success('File uploaded')
    } catch (e) {
      set((s) => ({ messages: s.messages.filter((m) => m.client_id !== clientId), uploadProgress: 0 }))
      toast.error(e?.response?.data?.detail || 'File upload failed')
    }
  },
  async updateGroupSettings(chatboxId, payload) {
    await api.patch(`/chatboxes/${chatboxId}/`, payload, {
      headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    })
    await get().fetchChatboxes()
  },
  async searchUsers(query = '') {
    const { data } = await api.get('/users/', { params: { search: query, page_size: 20 } })
    set({ users: data.results || data })
  },
  async addMember(chatboxId, userId, canChat = true) {
    const { data } = await api.post(`/chatboxes/${chatboxId}/add_member/`, { user: userId, can_chat: canChat })
    return data
  },
  async promoteAdmin(chatboxId, memberId) {
    await api.post(`/chatboxes/${chatboxId}/promote_admin/`, { member_id: memberId })
  },
  async demoteAdmin(chatboxId, memberId) {
    await api.post(`/chatboxes/${chatboxId}/demote_admin/`, { member_id: memberId })
  },
  async transferOwnership(chatboxId, memberId) {
    await api.post(`/chatboxes/${chatboxId}/transfer_ownership/`, { member_id: memberId })
    await get().fetchChatboxes()
  },
  async toggleTick(messageId) {
    const { data } = await api.post(`/messages/${messageId}/toggle_tick/`)
    set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? { ...m, is_ticked: data.is_ticked } : m) }))
  },
  async togglePin(messageId) {
    const { data } = await api.post(`/messages/${messageId}/toggle_pin/`)
    set((s) => ({ messages: s.messages.map((m) => m.id === messageId ? { ...m, is_pinned: data.is_pinned } : m) }))
  },
  async deleteMessage(messageId, scope = 'everyone') {
    try {
      await api.delete(`/messages/${messageId}/?scope=${scope}`)
      if (scope === 'everyone') {
        // Keep visible but mark deleted so "This message was deleted" shows to everyone
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? { ...m, deleted_for_everyone: true, display_message: 'This message was deleted', message: '', attachment: null, attachment_url: null }
              : m
          ),
        }))
        // Broadcast to other members via WebSocket
        const socket = get().socket
        if (socket?.readyState === 1) socket.send(JSON.stringify({ type: 'delete', message_id: messageId }))
      } else {
        // "Delete for me" — remove only from the current user's local view
        set((s) => ({ messages: s.messages.filter((m) => m.id !== messageId) }))
      }
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
  },
  async pinChat(chatboxId) {
    const { data } = await api.post(`/chatboxes/${chatboxId}/pin_chat/`)
    set((s) => ({
      chatboxes: s.chatboxes.map((c) => c.id === chatboxId ? { ...c, is_pinned: data.is_pinned } : c)
    }))
    return data
  },
  async startDirectMessage(userId) {
    const { data } = await api.post('/chatboxes/direct_message/', { user_id: userId })
    const existing = get().chatboxes.find((c) => c.id === data.id)
    if (!existing) {
      set((s) => ({ chatboxes: [data, ...s.chatboxes] }))
    }
    await get().setActiveChat(data)
  },
}))
