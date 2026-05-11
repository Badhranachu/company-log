import { create } from 'zustand'
import api from '../lib/api'

export const useAuthStore = create((set) => ({
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  loading: false,
  async login(email, password) {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      sessionStorage.setItem('access', data.access)
      sessionStorage.setItem('refresh', data.refresh)
      sessionStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },
  logout() {
    sessionStorage.removeItem('access')
    sessionStorage.removeItem('refresh')
    sessionStorage.removeItem('user')
    set({ user: null })
  },
  setUser(user) {
    sessionStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
}))
