import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import { FiArrowLeft, FiX, FiUserCheck, FiMoreVertical, FiShield, FiShieldOff, FiUserMinus } from 'react-icons/fi'

function MemberMenu({ member, chatOwnerId, currentUserId, chatId, onRefresh }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isCurrentUser = member.id === currentUserId
  const isGroupOwner = member.id === chatOwnerId
  const canManage = currentUserId === chatOwnerId

  if (!canManage || isCurrentUser || isGroupOwner) return null

  const remove = async () => {
    setOpen(false)
    if (!window.confirm(`Remove ${member.name} from the group?`)) return
    try {
      await api.post(`/chatboxes/${chatId}/remove_member/`, { user_id: member.id })
      toast.success(`${member.name} removed`)
      onRefresh()
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <FiMoreVertical size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden"
          >
            <button type="button" onClick={remove} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <FiUserMinus size={13} /> Remove from group
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function GroupSettingsModal({ open, onClose, chat, canManage }) {
  const currentUser = useAuthStore((s) => s.user)
  const updateGroupSettings = useChatStore((s) => s.updateGroupSettings)
  const searchUsers = useChatStore((s) => s.searchUsers)
  const addMember = useChatStore((s) => s.addMember)
  const users = useChatStore((s) => s.users)

  const [form, setForm] = useState(() => ({
    title: chat?.title || '',
    description: chat?.description || '',
    edit_mode: chat?.edit_mode || 'admins',
    can_members_edit_name: !!chat?.can_members_edit_name,
    can_members_edit_description: !!chat?.can_members_edit_description,
    can_members_edit_media: !!chat?.can_members_edit_media,
    group_avatar: null,
    group_banner: null,
  }))
  const [userQuery, setUserQuery] = useState('')
  const [addingId, setAddingId] = useState(null)
  const [addedIds, setAddedIds] = useState([])
  const [avatarPreview, setAvatarPreview] = useState(chat?.group_avatar_url || '')
  const [bannerPreview, setBannerPreview] = useState(chat?.group_banner_url || '')
  const [mediaTab, setMediaTab] = useState('images')
  const [images, setImages] = useState([])
  const [files, setFiles] = useState([])
  const [links, setLinks] = useState([])
  const [members, setMembers] = useState([])

  const loadMembers = async () => {
    if (!chat) return
    try {
      const { data } = await api.get(`/chatboxes/${chat.id}/members/`)
      setMembers(data)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!chat) return
    setForm({
      title: chat.title || '',
      description: chat.description || '',
      edit_mode: chat.edit_mode || 'admins',
      can_members_edit_name: !!chat.can_members_edit_name,
      can_members_edit_description: !!chat.can_members_edit_description,
      can_members_edit_media: !!chat.can_members_edit_media,
      group_avatar: null,
      group_banner: null,
    })
    setAvatarPreview(chat.group_avatar_url || '')
    setBannerPreview(chat.group_banner_url || '')
  }, [chat])

  useEffect(() => {
    if (!open || !chat) return
    loadMembers()
    const loadMedia = async () => {
      const { data } = await api.get('/messages/', { params: { chatbox: chat.id, page_size: 300 } })
      const rows = data.results || data
      const img = [], fil = [], lnk = []
      const linkRegex = /(https?:\/\/[^\s]+)/g
      rows.forEach((m) => {
        if (m.attachment_url) {
          if (m.attachment_type === 'image' || m.attachment_type === 'video') img.push(m)
          else fil.push(m)
        }
        const found = (m.display_message || m.message || '').match(linkRegex) || []
        found.forEach((url) => lnk.push({ id: `${m.id}-${url}`, url }))
      })
      setImages(img); setFiles(fil); setLinks(lnk)
    }
    loadMedia()
  }, [open, chat])

  if (!open || !chat) return null

  const currentMembership = members.find((m) => m.id === currentUser?.id)

  const save = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v) })
    await updateGroupSettings(chat.id, fd)
    onClose()
  }

  const doSearch = async (q) => {
    setUserQuery(q)
    if (q.trim()) await searchUsers(q)
  }

  const doAddMember = async (uid) => {
    setAddingId(uid)
    try {
      const result = await addMember(chat.id, uid, true)
      if (result?.already_member) {
        toast('Already a member of this group', { icon: 'ℹ️' })
      } else {
        toast.success('Member added successfully')
        setAddedIds((prev) => [...prev, uid])
        loadMembers()
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add member')
    } finally {
      setAddingId(null)
    }
  }

  const roleBadge = (m) => {
    if (m.id === chat.created_by) return <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">Group Owner</span>
    return null
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.form initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-5 space-y-4" onSubmit={save}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800"><FiArrowLeft /></button>
              <h3 className="text-xl font-semibold">Group Settings</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800"><FiX /></button>
          </div>
          {!canManage && <p className="text-xs text-amber-600">Read-only: only admin/owner can save.</p>}
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Group name" disabled={!canManage} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Description" disabled={!canManage} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs rounded-xl border px-3 py-2 cursor-pointer">
              Group image
              <input type="file" className="hidden" accept="image/*" disabled={!canManage}
                onChange={(e) => { const f = e.target.files?.[0] || null; setForm({ ...form, group_avatar: f }); setAvatarPreview(f ? URL.createObjectURL(f) : (chat?.group_avatar_url || '')) }} />
            </label>
            <label className="text-xs rounded-xl border px-3 py-2 cursor-pointer">
              Group banner
              <input type="file" className="hidden" accept="image/*" disabled={!canManage}
                onChange={(e) => { const f = e.target.files?.[0] || null; setForm({ ...form, group_banner: f }); setBannerPreview(f ? URL.createObjectURL(f) : (chat?.group_banner_url || '')) }} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border p-2">
              <p className="text-[11px] opacity-70 mb-1">Image preview</p>
              <div className="h-20 flex items-center">
                {avatarPreview ? <img src={avatarPreview} alt="avatar" className="w-16 h-16 rounded-full object-cover border" /> : <span className="text-xs opacity-60">No image</span>}
              </div>
            </div>
            <div className="rounded-xl border p-2">
              <p className="text-[11px] opacity-70 mb-1">Banner preview</p>
              <div className="h-20">
                {bannerPreview ? <img src={bannerPreview} alt="banner" className="w-full h-20 rounded-lg object-cover border" /> : <span className="text-xs opacity-60">No banner</span>}
              </div>
            </div>
          </div>
          <select value={form.edit_mode} onChange={(e) => setForm({ ...form, edit_mode: e.target.value })} className="w-full rounded-xl border px-3 py-2 bg-transparent" disabled={!canManage}>
            <option value="admins">Only Admins Can Edit</option>
            <option value="everyone">Everyone Can Edit</option>
            <option value="owner">No One Can Edit (Owner only)</option>
          </select>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <label><input type="checkbox" checked={form.can_members_edit_name} onChange={(e) => setForm({ ...form, can_members_edit_name: e.target.checked })} disabled={!canManage} /> Edit name</label>
            <label><input type="checkbox" checked={form.can_members_edit_description} onChange={(e) => setForm({ ...form, can_members_edit_description: e.target.checked })} disabled={!canManage} /> Edit description</label>
            <label><input type="checkbox" checked={form.can_members_edit_media} onChange={(e) => setForm({ ...form, can_members_edit_media: e.target.checked })} disabled={!canManage} /> Edit media</label>
          </div>

          {/* Members list with 3-dot menu */}
          <div className="rounded-xl border p-3 space-y-2">
            <p className="text-sm font-medium">{members.length} Member{members.length !== 1 ? 's' : ''}</p>
            <div className="max-h-44 overflow-auto space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <img
                    src={m.profile_picture || `https://placehold.co/32x32/4ade80/ffffff?text=${encodeURIComponent((m.name || '?').slice(0, 1).toUpperCase())}`}
                    alt={m.name}
                    className="w-8 h-8 rounded-full object-cover border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      {roleBadge(m)}
                    </div>
                    <p className="text-xs opacity-60 truncate">{m.email}</p>
                  </div>
                  <MemberMenu
                    member={m}
                    chatOwnerId={chat.created_by}
                    currentUserId={currentUser?.id}
                    chatId={chat.id}
                    onRefresh={loadMembers}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Add users (admin/owner only) */}
          {canManage && (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-sm font-medium">Add users to group</p>
              <input value={userQuery} onChange={(e) => doSearch(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm" placeholder="Search by name, email or phone number" />
              <div className="max-h-36 overflow-auto space-y-1">
                {users.length === 0 && userQuery && <p className="text-xs opacity-60 py-2 text-center">No users found</p>}
                {users.map((u) => {
                  const alreadyAdded = addedIds.includes(u.id)
                  const isAdding = addingId === u.id
                  return (
                    <div key={u.id} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{u.name}</p>
                        <p className="text-xs opacity-70 truncate">{u.email}{u.phone_number ? ` · ${u.phone_number}` : ''}</p>
                      </div>
                      {alreadyAdded ? (
                        <span className="flex items-center gap-1 text-xs text-wa-600 px-2 py-1"><FiUserCheck size={13} /> Added</span>
                      ) : (
                        <button type="button" disabled={isAdding} onClick={() => doAddMember(u.id)} className="text-xs px-2 py-1 rounded bg-wa-600 text-white disabled:opacity-60">
                          {isAdding ? '...' : 'Add'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Group media */}
          <div className="rounded-xl border p-3 space-y-2">
            <p className="text-sm font-medium">Group media</p>
            <div className="flex gap-2">
              {['images', 'files', 'links'].map((t) => (
                <button key={t} type="button" onClick={() => setMediaTab(t)} className={`px-2 py-1 rounded-lg text-xs capitalize ${mediaTab === t ? 'bg-wa-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>{t}</button>
              ))}
            </div>
            {mediaTab === 'images' && (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-auto">
                {images.map((m) => <img key={m.id} src={m.attachment_url} alt="" className="w-full h-16 object-cover rounded-md border" />)}
                {images.length === 0 && <p className="text-xs opacity-60 col-span-4">No images/videos found</p>}
              </div>
            )}
            {mediaTab === 'files' && (
              <div className="space-y-1 max-h-40 overflow-auto">
                {files.map((m) => <a key={m.id} href={m.attachment_url} target="_blank" rel="noreferrer" className="block text-xs underline truncate">{m.attachment_type} — {m.attachment_url}</a>)}
                {files.length === 0 && <p className="text-xs opacity-60">No files found</p>}
              </div>
            )}
            {mediaTab === 'links' && (
              <div className="space-y-1 max-h-40 overflow-auto">
                {links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="block text-xs underline truncate">{l.url}</a>)}
                {links.length === 0 && <p className="text-xs opacity-60">No links found</p>}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800">Close</button>
            <button disabled={!canManage} className="px-3 py-2 rounded-xl bg-wa-600 text-white disabled:opacity-40">Save</button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  )
}
