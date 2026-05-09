import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function AddUserPage() {
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })

  if (user?.role !== 'owner') return <div className="p-6">Owner access only.</div>

  const submit = async (e) => {
    e.preventDefault()
    await api.post('/users/', form)
    toast.success('User created')
    setForm({ name: '', email: '', password: '', role: 'user' })
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Add User</h2>
      <form onSubmit={submit} className="max-w-xl bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3">
        <input required className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="w-full rounded-xl border px-3 py-2 bg-transparent" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="user">User</option>
          <option value="owner">Owner</option>
        </select>
        <button className="rounded-xl px-4 py-2 bg-wa-600 text-white">Create User</button>
      </form>
    </div>
  )
}
