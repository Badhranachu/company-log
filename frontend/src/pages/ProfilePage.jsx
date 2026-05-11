import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import PageActions from '../components/layout/PageActions'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [form, setForm] = useState({
    username_alias: user?.username_alias || '',
    phone_number: user?.phone_number || '',
    bio: user?.bio || '',
    department: user?.department || '',
  })
  const [profilePic, setProfilePic] = useState(null)
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v) })
      if (profilePic) fd.append('profile_picture', profilePic)
      if (banner) fd.append('banner_image', banner)
      const { data } = await api.patch('/auth/update_profile/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUser(data)
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const avatarSrc = profilePic
    ? URL.createObjectURL(profilePic)
    : user?.profile_picture_url || `https://placehold.co/96x96/4ade80/ffffff?text=${encodeURIComponent((user?.name || 'U').slice(0, 1).toUpperCase())}`

  const bannerSrc = banner ? URL.createObjectURL(banner) : user?.banner_image_url

  return (
    <div className="p-3 md:p-6 max-w-2xl">
      <PageActions title="Profile" />
      <form onSubmit={save} className="overflow-hidden rounded-3xl border border-white/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm">
        {/* Banner */}
        <div className="h-36 bg-gradient-to-r from-emerald-400/70 to-cyan-400/70 relative">
          {bannerSrc && <img src={bannerSrc} alt="banner" className="h-full w-full object-cover" />}
          <label className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-black/40 text-white cursor-pointer hover:bg-black/60 transition">
            Change Banner
            <input type="file" className="hidden" accept="image/*" onChange={(e) => setBanner(e.target.files?.[0] || null)} />
          </label>
          {/* Avatar */}
          <div className="absolute -bottom-10 left-5">
            <label className="cursor-pointer block relative group">
              <img src={avatarSrc} alt="avatar" className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg" />
              <span className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">Change</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => setProfilePic(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        {/* Fields */}
        <div className="pt-14 px-5 pb-5 space-y-3">
          {/* Read-only info */}
          <div className="text-sm bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-2.5 space-y-0.5">
            <p className="font-semibold">{user?.name}</p>
            <p className="opacity-60 text-xs">{user?.email} · {user?.role === 'owner' ? 'Admin' : 'User'}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400"
              placeholder="Username / Alias"
              value={form.username_alias}
              onChange={(e) => setForm({ ...form, username_alias: e.target.value })}
            />
            <input
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400"
              placeholder="Phone number"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
            <input
              className="md:col-span-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400"
              placeholder="Department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
            <textarea
              className="md:col-span-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400 resize-none"
              rows={3}
              placeholder="Bio / About"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl px-4 py-3 bg-wa-600 hover:bg-wa-700 text-white font-medium transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
