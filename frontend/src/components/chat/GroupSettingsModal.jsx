import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useChatStore } from '../../store/chatStore'
import api from '../../lib/api'
import { FiArrowLeft, FiX, FiUserCheck } from 'react-icons/fi'

export default function GroupSettingsModal({ open, onClose, chat, canManage }) {
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
    const loadMedia = async () => {
      if (!open || !chat) return
      const { data } = await api.get('/messages/', { params: { chatbox: chat.id, page_size: 300 } })
      const rows = data.results || data
      const img = []
      const fil = []
      const lnk = []
      const linkRegex = /(https?:\/\/[^\s]+)/g
      rows.forEach((m) => {
        if (m.attachment_url) {
          if (m.attachment_type === 'image' || m.attachment_type === 'video') img.push(m)
          else fil.push(m)
        }
        const found = (m.display_message || m.message || '').match(linkRegex) || []
        found.forEach((url) => lnk.push({ id: `${m.id}-${url}`, url }))
      })
      setImages(img)
      setFiles(fil)
      setLinks(lnk)
    }
    loadMedia()
  }, [open, chat])

  if (!open || !chat) return null

  const save = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, v)
    })
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
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add member'
      toast.error(msg)
    } finally {
      setAddingId(null)
    }
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
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setForm({ ...form, group_avatar: file })
                  setAvatarPreview(file ? URL.createObjectURL(file) : (chat?.group_avatar_url || ''))
                }}
                disabled={!canManage}
              />
            </label>
            <label className="text-xs rounded-xl border px-3 py-2 cursor-pointer">
              Group banner
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setForm({ ...form, group_banner: file })
                  setBannerPreview(file ? URL.createObjectURL(file) : (chat?.group_banner_url || ''))
                }}
                disabled={!canManage}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border p-2">
              <p className="text-[11px] opacity-70 mb-1">Image preview</p>
              <div className="h-20 flex items-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Group avatar preview" className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <span className="text-xs opacity-60">No image selected</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border p-2">
              <p className="text-[11px] opacity-70 mb-1">Banner preview</p>
              <div className="h-20">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Group banner preview" className="w-full h-20 rounded-lg object-cover border" />
                ) : (
                  <span className="text-xs opacity-60">No banner selected</span>
                )}
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
          {canManage && (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-sm font-medium">Add users to group</p>
              <input
                value={userQuery}
                onChange={(e) => doSearch(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
                placeholder="Search by name, email or phone number"
              />
              <div className="max-h-36 overflow-auto space-y-1">
                {users.length === 0 && userQuery && (
                  <p className="text-xs opacity-60 py-2 text-center">No users found</p>
                )}
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
                        <span className="flex items-center gap-1 text-xs text-wa-600 px-2 py-1">
                          <FiUserCheck size={13} /> Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isAdding}
                          onClick={() => doAddMember(u.id)}
                          className="text-xs px-2 py-1 rounded bg-wa-600 text-white disabled:opacity-60"
                        >
                          {isAdding ? '...' : 'Add'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="rounded-xl border p-3 space-y-2">
            <p className="text-sm font-medium">Group media</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMediaTab('images')} className={`px-2 py-1 rounded-lg text-xs ${mediaTab === 'images' ? 'bg-wa-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>Images</button>
              <button type="button" onClick={() => setMediaTab('files')} className={`px-2 py-1 rounded-lg text-xs ${mediaTab === 'files' ? 'bg-wa-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>Files</button>
              <button type="button" onClick={() => setMediaTab('links')} className={`px-2 py-1 rounded-lg text-xs ${mediaTab === 'links' ? 'bg-wa-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>Links</button>
            </div>
            {mediaTab === 'images' && (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-auto">
                {images.map((m) => <img key={m.id} src={m.attachment_url} alt="" className="w-full h-16 object-cover rounded-md border" />)}
                {images.length === 0 && <p className="text-xs opacity-60 col-span-4">No images/videos found</p>}
              </div>
            )}
            {mediaTab === 'files' && (
              <div className="space-y-1 max-h-40 overflow-auto">
                {files.map((m) => <a key={m.id} href={m.attachment_url} target="_blank" rel="noreferrer" className="block text-xs underline truncate">{m.attachment_type} - {m.attachment_url}</a>)}
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
