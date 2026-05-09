import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })

  const save = async (e) => {
    e.preventDefault()
    const { data } = await api.patch('/auth/update_profile/', form)
    setUser(data)
    toast.success('Profile updated')
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Profile</h2>
      <form onSubmit={save} className="max-w-xl bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3">
        <input className="w-full rounded-xl border px-3 py-2 bg-transparent" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="w-full rounded-xl border px-3 py-2 bg-transparent" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <button className="rounded-xl px-4 py-2 bg-wa-600 text-white">Save</button>
      </form>
    </div>
  )
}
