import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChatStore } from '../../store/chatStore'
import { FiArrowLeft, FiX, FiUsers, FiMessageCircle, FiSearch } from 'react-icons/fi'

export default function NewChatModal({ open, onClose }) {
  const createChatbox = useChatStore((s) => s.createChatbox)
  const searchUsers = useChatStore((s) => s.searchUsers)
  const startDirectMessage = useChatStore((s) => s.startDirectMessage)
  const users = useChatStore((s) => s.users)

  const [tab, setTab] = useState('group')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility_type, setVisibility] = useState('chat_enabled')
  const [groupImage, setGroupImage] = useState(null)
  const [userQuery, setUserQuery] = useState('')

  if (!open) return null

  const submitGroup = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('visibility_type', visibility_type)
    fd.append('chat_type', 'group')
    if (groupImage) fd.append('group_avatar', groupImage)
    await createChatbox(fd)
    toast.success('Group created')
    setTitle('')
    setDescription('')
    setGroupImage(null)
    onClose()
  }

  const handleDMUser = async (user) => {
    onClose()
    try {
      await startDirectMessage(user.id)
    } catch {
      toast.error('Could not start conversation')
    }
  }

  const handleSearch = async (q) => {
    setUserQuery(q)
    await searchUsers(q)
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800"><FiArrowLeft /></button>
            <h2 className="text-lg font-semibold">New Chat</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800"><FiX /></button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab('group')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${tab === 'group' ? 'bg-white dark:bg-slate-700 shadow' : 'opacity-60 hover:opacity-80'}`}
          >
            <FiUsers size={15} /> Group
          </button>
          <button
            type="button"
            onClick={() => { setTab('dm'); handleSearch('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${tab === 'dm' ? 'bg-white dark:bg-slate-700 shadow' : 'opacity-60 hover:opacity-80'}`}
          >
            <FiMessageCircle size={15} /> Direct Message
          </button>
        </div>

        {tab === 'group' && (
          <form onSubmit={submitGroup} className="space-y-3">
            <input required className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Group name" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <label className="block w-full rounded-xl border px-3 py-2 text-sm cursor-pointer">
              {groupImage ? `Image: ${groupImage.name}` : 'Upload group image (optional)'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setGroupImage(e.target.files?.[0] || null)} />
            </label>
            <select className="w-full rounded-xl border px-3 py-2 bg-transparent" value={visibility_type} onChange={(e) => setVisibility(e.target.value)}>
              <option value="view_only">View Only</option>
              <option value="chat_enabled">Chat Enabled</option>
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800">Cancel</button>
              <button className="px-3 py-2 rounded-xl bg-wa-600 text-white">Create Group</button>
            </div>
          </form>
        )}

        {tab === 'dm' && (
          <div className="space-y-3">
            <div className="rounded-xl border px-3 py-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800">
              <FiSearch size={14} className="opacity-50" />
              <input
                value={userQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-transparent outline-none w-full text-sm"
                placeholder="Search users by name or email..."
                autoFocus
              />
            </div>
            <div className="space-y-1 max-h-60 overflow-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleDMUser(u)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <img
                    src={u.profile_picture_url || `https://placehold.co/36x36/4ade80/ffffff?text=${encodeURIComponent((u.name || '?').slice(0, 1).toUpperCase())}`}
                    alt={u.name}
                    className="w-9 h-9 rounded-full object-cover border border-white/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs opacity-60 truncate">{u.email}</p>
                  </div>
                </button>
              ))}
              {users.length === 0 && userQuery && (
                <p className="text-sm opacity-60 text-center py-4">No users found</p>
              )}
              {users.length === 0 && !userQuery && (
                <p className="text-sm opacity-60 text-center py-4">Type a name or email to search</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
