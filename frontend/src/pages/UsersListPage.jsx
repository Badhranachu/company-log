import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import PageActions from '../components/layout/PageActions'

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'banned', label: 'Banned' },
]

export default function UsersListPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('active')
  const [selected, setSelected] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [suspendMinutes, setSuspendMinutes] = useState(1)

  const load = async (search = '') => {
    const { data } = await api.get('/users/', { params: { search, page_size: 200 } })
    const list = data.results || data
    setUsers(list)
    if (selected) {
      const next = list.find((u) => u.id === selected.id)
      setSelected(next || null)
    }
  }

  useEffect(() => {
    if (currentUser?.role === 'owner') load()
  }, [currentUser])

  if (currentUser?.role !== 'owner') return <div className="p-6">Owner access only.</div>

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    const searched = q ? users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)) : users
    if (tab === 'banned') return searched.filter((u) => u.is_banned)
    if (tab === 'suspended') return searched.filter((u) => u.is_suspended)
    return searched.filter((u) => !u.is_banned && !u.is_suspended)
  }, [users, query, tab])

  const act = async (fn, okMsg) => {
    if (!selected) return
    await fn()
    toast.success(okMsg)
    await load(query)
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <PageActions title="Users List" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          load(e.target.value)
        }}
        className="w-full max-w-2xl rounded-xl border px-3 py-2 bg-white dark:bg-slate-900"
        placeholder="Search user by name or email"
      />

      <div className="flex gap-2 overflow-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${tab === t.key ? 'bg-wa-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border p-3 max-h-[65vh] overflow-auto">
          <p className="text-sm font-medium mb-2">User list</p>
          <div className="space-y-2">
            {filtered.map((u) => (
              <button key={u.id} onClick={() => setSelected(u)} className={`w-full text-left rounded-xl border px-3 py-2 ${selected?.id === u.id ? 'border-wa-600 bg-wa-50 dark:bg-slate-800' : ''}`}>
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs opacity-70">{u.email} � {u.role}</p>
                <p className="text-[11px] opacity-60">{u.is_banned ? 'Banned' : u.is_suspended ? `Suspended until ${new Date(u.suspended_until).toLocaleString()}` : 'Active'}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border p-4 space-y-3">
          <p className="text-sm font-medium">Manage user</p>
          {!selected ? (
            <p className="text-sm opacity-60">Select a user from the list</p>
          ) : (
            <>
              <div>
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs opacity-70">{selected.email}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">Change password</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1 rounded-xl border px-3 py-2 bg-transparent" placeholder="New password" />
                  <button onClick={() => act(() => api.post(`/users/${selected.id}/reset_password/`, { new_password: newPassword }), 'Password changed')} className="px-3 py-2 rounded-xl bg-amber-500 text-white">Change</button>
                </div>
              </div>

              {/* Suspend — only show if not already banned */}
              {!selected.is_banned && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Suspend user</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl border px-3 py-2 bg-transparent">
                      <input
                        type="number"
                        min={1}
                        value={suspendMinutes}
                        onChange={(e) => setSuspendMinutes(Number(e.target.value))}
                        className="w-16 bg-transparent outline-none"
                      />
                      <span className="text-xs opacity-60">days</span>
                    </div>
                    <button
                      onClick={() => act(() => api.post(`/users/${selected.id}/suspend/`, { minutes: suspendMinutes * 24 * 60 }), 'User suspended')}
                      className="px-3 py-2 rounded-xl bg-slate-700 text-white"
                    >
                      Suspend
                    </button>
                    {selected.is_suspended && (
                      <button
                        onClick={() => act(() => api.post(`/users/${selected.id}/unsuspend/`), 'User unsuspended')}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
                      >
                        Unsuspend
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {!selected.is_banned && !selected.is_suspended && (
                  <button onClick={() => act(() => api.post(`/users/${selected.id}/ban/`), 'User banned')} className="px-3 py-2 rounded-xl bg-rose-700 text-white">Ban lifetime</button>
                )}
                {selected.is_banned && (
                  <button onClick={() => act(() => api.post(`/users/${selected.id}/unban/`), 'User unbanned')} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Unban</button>
                )}
                <button onClick={() => act(() => api.delete(`/users/${selected.id}/`), 'User deleted')} className="px-3 py-2 rounded-xl bg-rose-600 text-white">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
