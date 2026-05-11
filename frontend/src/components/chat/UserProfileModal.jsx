import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiPhone, FiBriefcase, FiX, FiMail, FiUser } from 'react-icons/fi'
import api from '../../lib/api'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'

export default function UserProfileModal({ userId, userName, onClose }) {
  const [user, setUser] = useState(null)
  const currentUser = useAuthStore((s) => s.user)
  const startDirectMessage = useChatStore((s) => s.startDirectMessage)

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}/`).then(({ data }) => setUser(data)).catch(() => {})
  }, [userId])

  if (!userId) return null

  const avatar = user?.profile_picture_url ||
    `https://placehold.co/120x120/4ade80/ffffff?text=${encodeURIComponent((userName || '?').slice(0, 1).toUpperCase())}`

  const handleDM = async () => {
    onClose()
    await startDirectMessage(userId)
  }

  const isSelf = currentUser?.id === userId

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Banner */}
          <div className="relative bg-gradient-to-br from-emerald-400 to-teal-600 h-24 flex items-end justify-center">
            <img
              src={avatar}
              alt={userName}
              className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg translate-y-10"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 text-white"
            >
              <FiX size={15} />
            </button>
          </div>

          {/* Info */}
          <div className="pt-12 pb-2 px-5 text-center">
            <h2 className="text-lg font-bold">{user?.name || userName}</h2>

            {user?.bio && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{user.bio}</p>}
            {user?.status_message && <p className="text-xs italic text-slate-400 mt-1">"{user.status_message}"</p>}
          </div>

          {/* Details */}
          <div className="px-5 pb-4 space-y-2">
            {user?.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <FiMail size={14} className="opacity-60 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user?.username_alias && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <FiUser size={14} className="opacity-60 shrink-0" />
                <span>@{user.username_alias}</span>
              </div>
            )}
            {user?.department && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <FiBriefcase size={14} className="opacity-60 shrink-0" />
                <span>{user.department}</span>
              </div>
            )}
            {user?.phone_number && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <FiPhone size={14} className="opacity-60 shrink-0" />
                <span>{user.phone_number}</span>
              </div>
            )}
          </div>

          {/* DM button */}
          {!isSelf && (
            <div className="px-5 pb-5">
              <button
                onClick={handleDM}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-wa-600 hover:bg-wa-700 text-white text-sm font-medium transition"
              >
                <FiMessageCircle size={16} />
                Send Message
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
