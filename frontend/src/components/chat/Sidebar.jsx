import { useMemo, useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'

export default function Sidebar({ onCreate }) {
  const [search, setSearch] = useState('')
  const chatboxes = useChatStore((s) => s.chatboxes)
  const setActiveChat = useChatStore((s) => s.setActiveChat)
  const filtered = useMemo(() => chatboxes.filter((c) => `${c.title} ${c.description}`.toLowerCase().includes(search.toLowerCase())), [chatboxes, search])

  return (
    <aside className="w-full max-w-sm border-r bg-white dark:bg-slate-900 flex flex-col relative">
      <div className="p-4 border-b">
        <div className="rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 flex items-center gap-2">
          <FiSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chat boxes" className="bg-transparent outline-none w-full" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((chat) => (
          <motion.button key={chat.id} whileHover={{ x: 3 }} onClick={() => setActiveChat(chat)} className="w-full text-left px-4 py-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/70">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{chat.title}</p>
              {chat.is_starred && <span className="text-amber-500">?</span>}
            </div>
            <p className="text-xs opacity-70 line-clamp-1">{chat.description}</p>
          </motion.button>
        ))}
      </div>
      <button onClick={onCreate} className="absolute bottom-6 right-6 bg-wa-600 hover:bg-wa-700 text-white rounded-full p-4 shadow-lg"><FiPlus size={20} /></button>
    </aside>
  )
}
