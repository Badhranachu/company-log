import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch {
      toast.error('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-emerald-100 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <motion.form onSubmit={onSubmit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-white/90 dark:bg-slate-900 rounded-2xl shadow-glass p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Company Log</h1>
        <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full rounded-xl py-2 bg-wa-600 text-white hover:bg-wa-700 transition">{loading ? 'Logging in...' : 'Login'}</button>
      </motion.form>
    </div>
  )
}
