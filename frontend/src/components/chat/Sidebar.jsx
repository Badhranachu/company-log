import { useEffect, useMemo, useRef, useState } from 'react'
import { FiBellOff, FiMapPin, FiMessageCircle, FiMoon, FiMoreVertical, FiPlus, FiSearch, FiSun, FiTrash2, FiUsers } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import toast from 'react-hot-toast'

function ChatContextMenu({ chat, user, onClose }) {
  const pinChat = useChatStore((s) => s.pinChat)
  const deleteGroup = useChatStore((s) => s.deleteGroup)
  const chatboxes = useChatStore((s) => s.chatboxes)

  const handlePin = async () => {
    onClose()
    const pinnedCount = chatboxes.filter((c) => c.is_pinned).length
    if (!chat.is_pinned && pinnedCount >= 5) {
      toast.error('Maximum 5 chats can be pinned')
      return
    }
    const result = await pinChat(chat.id)
    if (result.is_pinned !== undefined) toast.success(result.is_pinned ? 'Chat pinned' : 'Chat unpinned')
  }

  const handleDelete = async () => {
    onClose()
    if (!window.confirm(`Delete "${chat.title}"? Members will lose access. Admin can restore it.`)) return
    try {
      await deleteGroup(chat.id)
      toast.success('Group deleted')
    } catch { toast.error('Could not delete group') }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute right-2 top-8 z-50 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handlePin}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <FiMapPin size={13} className={chat.is_pinned ? 'text-wa-600' : ''} />
        {chat.is_pinned ? 'Unpin chat' : 'Pin chat'}
      </button>
      {chat.created_by === user?.id && chat.chat_type !== 'direct' && (
        <button
          onClick={handleDelete}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <FiTrash2 size={13} />
          Delete group
        </button>
      )}
    </motion.div>
  )
}

export default function Sidebar({ onCreate, dark, onToggleDark, user }) {
  const [search, setSearch] = useState('')
  const [menuChatId, setMenuChatId] = useState(null)
  const chatboxes = useChatStore((s) => s.chatboxes)
  const setActiveChat = useChatStore((s) => s.setActiveChat)

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (msgDay.getTime() === todayStart.getTime())
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (msgDay.getTime() === yesterdayStart.getTime())
      return 'Yesterday'
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = chatboxes.filter((c) => `${c.title} ${c.description}`.toLowerCase().includes(q))
    // Pinned chats float to the top
    return [...list.filter((c) => c.is_pinned), ...list.filter((c) => !c.is_pinned)]
  }, [chatboxes, search])

  return (
    <aside className="w-full h-full md:max-w-sm border-r border-white/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col overflow-x-hidden">
      <div className="p-3 border-b border-white/40 space-y-2">
        {/* User info + dark mode toggle + new chat */}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Company Log</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleDark}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title={dark ? 'Day mode' : 'Night mode'}
            >
              {dark ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>
            <button
              onClick={onCreate}
              className="p-2 rounded-full bg-wa-600 hover:bg-wa-700 active:bg-wa-800 text-white transition"
              title="New Chat"
            >
              <FiPlus size={16} />
            </button>
          </div>
        </div>
        <div className="rounded-xl px-3 py-2 bg-slate-100/90 dark:bg-slate-800 flex items-center gap-2">
          <FiSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chat boxes" className="bg-transparent outline-none w-full" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((chat) => {
          const isDM = chat.chat_type === 'direct'
          const avatarSrc = chat.dm_avatar_url || chat.group_avatar_url || `https://placehold.co/40x40/4ade80/ffffff?text=${encodeURIComponent((chat.title || 'G').slice(0, 1).toUpperCase())}`
          const menuOpen = menuChatId === chat.id
          return (
            <motion.div
              key={chat.id}
              className="relative border-b border-white/40"
            >
              <button
                onClick={() => { setMenuChatId(null); setActiveChat(chat) }}
                className="w-full text-left px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="relative shrink-0">
                      <img src={avatarSrc} alt={chat.title} className="w-10 h-10 rounded-full object-cover border border-white/40" />
                      {isDM ? (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5"><FiMessageCircle size={9} /></span>
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-wa-600 text-white rounded-full p-0.5"><FiUsers size={9} /></span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold truncate">{chat.title}</p>
                        {chat.is_pinned && <FiMapPin size={10} className="text-wa-600 shrink-0" />}
                        <span className={`text-[9px] px-1 py-0.5 rounded font-medium shrink-0 ${isDM ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'}`}>
                          {isDM ? 'DM' : 'Group'}
                        </span>
                      </div>
                      <p className="text-xs opacity-70 line-clamp-1">{chat.last_message_preview || chat.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    {chat.last_message_at && (
                      <p className="text-[11px] opacity-60 whitespace-nowrap">{formatTime(chat.last_message_at)}</p>
                    )}
                    <div className="flex items-center gap-1">
                      {chat.is_muted && <FiBellOff size={11} className="opacity-50" />}
                      {chat.unread_count > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-wa-600 text-white text-[11px] font-semibold flex items-center justify-center">
                          {chat.unread_count > 99 ? '99+' : chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              {/* 3-dot menu button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuChatId(menuOpen ? null : chat.id) }}
                className="absolute top-2 right-3 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition opacity-60 hover:opacity-100"
              >
                <FiMoreVertical size={14} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <ChatContextMenu chat={chat} user={user} onClose={() => setMenuChatId(null)} />
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
      {/* Close menu on outside click */}
      {menuChatId && <div className="fixed inset-0 z-40" onClick={() => setMenuChatId(null)} />}
    </aside>
  )
}
