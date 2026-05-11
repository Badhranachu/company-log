import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const wasLoggedIn = !!sessionStorage.getItem('access')
      sessionStorage.removeItem('access')
      sessionStorage.removeItem('refresh')
      sessionStorage.removeItem('user')
      if (wasLoggedIn) window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
