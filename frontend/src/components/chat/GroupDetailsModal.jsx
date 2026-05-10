import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiUsers, FiMessageCircle } from 'react-icons/fi'
import api from '../../lib/api'
import { useChatStore } from '../../store/chatStore'

export default function GroupDetailsModal({ open, onClose, chat, onStartDM }) {
  const [members, setMembers] = useState([])
  const startDirectMessage = useChatStore((s) => s.startDirectMessage)

  useEffect(() => {
    if (!open || !chat) return
    api.get(`/chatboxes/${chat.id}/members/`).then(({ data }) => setMembers(data)).catch(() => {})
  }, [open, chat])

  if (!open || !chat) return null

  const isDM = chat.chat_type === 'direct'
  const avatarSrc = chat.group_avatar_url || `https://placehold.co/120x120/4ade80/ffffff?text=${encodeURIComponent((chat.title || 'G').slice(0, 1).toUpperCase())}`

  const handleDM = async (memberId) => {
    onClose()
    await startDirectMessage(memberId)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.97 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Banner / Avatar area */}
          <div className="relative bg-gradient-to-br from-emerald-400 to-teal-600 h-28 flex items-end justify-center pb-0">
            <img
              src={avatarSrc}
              alt={chat.title}
              className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg translate-y-10"
            />
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white z-10">
            <FiX size={16} />
          </button>

          <div className="pt-12 pb-4 px-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{chat.title}</h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isDM ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                {isDM ? 'Direct Message' : 'Group'}
              </span>
            </div>
            {chat.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{chat.description}</p>}
          </div>

          {/* Members */}
          <div className="px-4 pb-5">
            <div className="flex items-center gap-2 mb-3">
              <FiUsers size={14} className="opacity-60" />
              <p className="text-sm font-semibold opacity-70">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={m.profile_picture || `https://placehold.co/32x32/4ade80/ffffff?text=${encodeURIComponent((m.name || '?').slice(0, 1).toUpperCase())}`}
                      alt={m.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      {m.is_admin && <p className="text-[10px] text-wa-600 font-semibold">Admin</p>}
                    </div>
                  </div>
                  {!isDM && (
                    <button
                      onClick={() => handleDM(m.id)}
                      title="Send direct message"
                      className="p-1.5 rounded-full hover:bg-wa-100 dark:hover:bg-wa-900/30 text-wa-600 shrink-0"
                    >
                      <FiMessageCircle size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
