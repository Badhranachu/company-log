import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function UsersListPage() {
  const user = useAuthStore((s) => s.user)
  const [users, setUsers] = useState([])
  const [newPassword, setNewPassword] = useState({})

  const load = async () => {
    const { data } = await api.get('/users/')
    setUsers(data.results || data)
  }

  useEffect(() => { if (user?.role === 'owner') load() }, [user])

  if (user?.role !== 'owner') return <div className="p-6">Owner access only.</div>

  const del = async (id) => {
    await api.delete(`/users/${id}/`)
    toast.success('Deleted user')
    load()
  }

  const reset = async (id) => {
    await api.post(`/users/${id}/reset_password/`, { new_password: newPassword[id] || 'Company123!' })
    toast.success('Password reset')
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Users List</h2>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <p className="font-semibold">{u.name}</p>
              <p className="text-xs opacity-70">{u.email} • {u.role}</p>
            </div>
            <div className="flex gap-2 items-center">
              <input placeholder="New password" className="rounded-xl border px-2 py-1 bg-transparent" value={newPassword[u.id] || ''} onChange={(e) => setNewPassword((s) => ({ ...s, [u.id]: e.target.value }))} />
              <button onClick={() => reset(u.id)} className="rounded-lg px-3 py-1 bg-amber-500 text-white">Reset</button>
              <button onClick={() => del(u.id)} className="rounded-lg px-3 py-1 bg-rose-600 text-white">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
