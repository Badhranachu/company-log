import { create } from 'zustand'
import api from '../lib/api'

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  async login(email, password) {
    set({ loading: true })
    const { data } = await api.post('/auth/login/', { email, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ user: data.user, loading: false })
  },
  logout() {
    localStorage.clear()
    set({ user: null })
  },
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
}))
