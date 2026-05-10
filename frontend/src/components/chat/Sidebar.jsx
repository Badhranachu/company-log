import { useMemo, useRef, useState } from 'react'
import { FiBellOff, FiMapPin, FiMessageCircle, FiMoreVertical, FiPlus, FiSearch, FiUsers } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import toast from 'react-hot-toast'

function ChatContextMenu({ chat, onClose }) {
  const pinChat = useChatStore((s) => s.pinChat)
  const ref = useRef(null)

  const handlePin = async () => {
    onClose()
    try {
      const result = await pinChat(chat.id)
      toast.success(result.is_pinned ? 'Chat pinned' : 'Chat unpinned')
    } catch { toast.error('Could not pin chat') }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute right-2 top-8 z-50 w-40 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handlePin}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <FiMapPin size={13} className={chat.is_pinned ? 'text-wa-600' : ''} />
        {chat.is_pinned ? 'Unpin chat' : 'Pin chat'}
      </button>
    </motion.div>
  )
}

export default function Sidebar({ onCreate }) {
  const [search, setSearch] = useState('')
  const [menuChatId, setMenuChatId] = useState(null)
  const chatboxes = useChatStore((s) => s.chatboxes)
  const setActiveChat = useChatStore((s) => s.setActiveChat)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = chatboxes.filter((c) => `${c.title} ${c.description}`.toLowerCase().includes(q))
    // Pinned chats float to the top
    return [...list.filter((c) => c.is_pinned), ...list.filter((c) => !c.is_pinned)]
  }, [chatboxes, search])

  return (
    <aside className="w-full max-w-sm border-r border-white/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col relative">
      <div className="p-4 border-b border-white/40">
        <div className="rounded-xl px-3 py-2 bg-slate-100/90 dark:bg-slate-800 flex items-center gap-2">
          <FiSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chat boxes" className="bg-transparent outline-none w-full" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((chat) => {
          const isDM = chat.chat_type === 'direct'
          const avatarSrc = chat.group_avatar_url || `https://placehold.co/40x40/4ade80/ffffff?text=${encodeURIComponent((chat.title || 'G').slice(0, 1).toUpperCase())}`
          const menuOpen = menuChatId === chat.id
          return (
            <motion.div
              key={chat.id}
              whileHover={{ x: 3 }}
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
                  <div className="text-right shrink-0">
                    {chat.last_message_at && <p className="text-[10px] opacity-60">{new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                    <div className="flex justify-end items-center gap-1 mt-1">
                      {chat.is_starred && <span className="text-amber-500">★</span>}
                      {chat.unread_count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-wa-600 text-white">{chat.unread_count}</span>}
                      {chat.is_muted && <FiBellOff className="text-xs opacity-60" />}
                    </div>
                  </div>
                </div>
              </button>
              {/* 3-dot menu button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuChatId(menuOpen ? null : chat.id) }}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition"
                style={{ opacity: menuOpen ? 1 : undefined }}
              >
                <FiMoreVertical size={14} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <ChatContextMenu chat={chat} onClose={() => setMenuChatId(null)} />
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
      {/* Close menu on outside click */}
      {menuChatId && <div className="fixed inset-0 z-40" onClick={() => setMenuChatId(null)} />}
      <button onClick={onCreate} className="absolute bottom-6 right-6 bg-wa-600 hover:bg-wa-700 text-white rounded-full p-4 shadow-lg"><FiPlus size={20} /></button>
    </aside>
  )
}
