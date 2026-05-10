import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import PageActions from '../components/layout/PageActions'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    username_alias: user?.username_alias || '',
    phone_number: user?.phone_number || '',
    bio: user?.bio || '',
    status_message: user?.status_message || '',
    department: user?.department || '',
    profile_picture: null,
    banner_image: null,
  })

  const save = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, v)
    })
    const { data } = await api.patch('/auth/update_profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    setUser(data)
    toast.success('Profile updated')
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl">
      <PageActions title="Profile" />
      <form onSubmit={save} className="overflow-hidden rounded-3xl border border-white/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-glass">
        <div className="h-40 bg-gradient-to-r from-emerald-500/60 to-cyan-500/60 relative">
          {user?.banner_image_url && <img src={user.banner_image_url} alt="banner" className="h-full w-full object-cover" />}
          <label className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-black/40 text-white cursor-pointer">Change Banner<input type="file" className="hidden" accept="image/*" onChange={(e) => setForm({ ...form, banner_image: e.target.files?.[0] || null })} /></label>
          <div className="absolute -bottom-10 left-6">
            <label className="cursor-pointer block">
              <img src={user?.profile_picture_url || 'https://placehold.co/96x96?text=U'} alt="avatar" className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-xl" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => setForm({ ...form, profile_picture: e.target.files?.[0] || null })} />
            </label>
          </div>
        </div>
        <div className="pt-14 p-6 grid md:grid-cols-2 gap-3">
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Username" value={form.username_alias} onChange={(e) => setForm({ ...form, username_alias: e.target.value })} />
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Status message" value={form.status_message} onChange={(e) => setForm({ ...form, status_message: e.target.value })} />
          <textarea className="md:col-span-2 w-full rounded-xl border px-3 py-2 bg-transparent" rows={3} placeholder="Bio/About" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <div className="md:col-span-2 text-xs opacity-70">
            <span>Role: {user?.role}</span> | <span>Online: {user?.is_online ? 'Yes' : 'No'}</span> | <span>Last seen: {user?.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : 'N/A'}</span>
          </div>
          <button className="md:col-span-2 rounded-xl px-4 py-3 bg-wa-600 text-white hover:bg-wa-700 transition">Save Profile</button>
        </div>
      </form>
    </div>
  )
}
