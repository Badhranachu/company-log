import { useMemo, useState } from 'react'
import { FiBellOff, FiClock, FiPlus, FiSearch, FiUsers, FiMessageCircle } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'

export default function Sidebar({ onCreate }) {
  const [search, setSearch] = useState('')
  const chatboxes = useChatStore((s) => s.chatboxes)
  const setActiveChat = useChatStore((s) => s.setActiveChat)
  const filtered = useMemo(() => chatboxes.filter((c) => `${c.title} ${c.description}`.toLowerCase().includes(search.toLowerCase())), [chatboxes, search])

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
          return (
            <motion.button key={chat.id} whileHover={{ x: 3 }} onClick={() => setActiveChat(chat)} className="w-full text-left px-4 py-3 border-b border-white/40 hover:bg-slate-50/70 dark:hover:bg-slate-800/70">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={avatarSrc}
                      alt={chat.title}
                      className="w-10 h-10 rounded-full object-cover border border-white/40"
                    />
                    {isDM ? (
                      <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5">
                        <FiMessageCircle size={9} />
                      </span>
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 bg-wa-600 text-white rounded-full p-0.5">
                        <FiUsers size={9} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold truncate">{chat.title}</p>
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
                    {chat.is_pinned && <FiClock className="text-xs opacity-60" />}
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
      <button onClick={onCreate} className="absolute bottom-6 right-6 bg-wa-600 hover:bg-wa-700 text-white rounded-full p-4 shadow-lg"><FiPlus size={20} /></button>
    </aside>
  )
}
