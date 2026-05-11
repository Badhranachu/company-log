import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiUsers, FiMessageCircle, FiBriefcase, FiPhone, FiMail, FiUser } from 'react-icons/fi'
import api from '../../lib/api'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'

function DMProfileView({ chat, onClose }) {
  const [profile, setProfile] = useState(null)
  const currentUser = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!chat) return
    api.get(`/chatboxes/${chat.id}/members/`).then(({ data }) => {
      const other = data.find((m) => m.id !== currentUser?.id)
      if (other) {
        api.get(`/users/${other.id}/`).then(({ data: u }) => setProfile(u)).catch(() => {})
      }
    }).catch(() => {})
  }, [chat, currentUser?.id])

  const initials = (profile?.name || '?').slice(0, 1).toUpperCase()
  const avatarSrc = profile?.profile_picture_url ||
    `https://placehold.co/120x120/4ade80/ffffff?text=${encodeURIComponent(initials)}`

  return (
    <motion.div
      initial={{ y: 16, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 16, opacity: 0, scale: 0.97 }}
      className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Banner */}
      <div className="relative h-28">
        {profile?.banner_image_url
          ? <img src={profile.banner_image_url} alt="banner" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600" />
        }
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 text-white z-10">
          <FiX size={15} />
        </button>
        <img
          src={avatarSrc}
          alt={profile?.name}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg"
        />
      </div>

      {/* Info */}
      <div className="pt-12 pb-2 px-5 text-center">
        <h2 className="text-lg font-bold">{profile?.name || '…'}</h2>
        {profile?.status_message && (
          <p className="text-xs italic text-slate-400 mt-1">"{profile.status_message}"</p>
        )}
        {profile?.bio && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{profile.bio}</p>
        )}
      </div>

      {/* Details */}
      <div className="px-5 pb-5 space-y-2">
        {profile?.email && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <FiMail size={14} className="opacity-60 shrink-0" />
            <span className="truncate">{profile.email}</span>
          </div>
        )}
        {profile?.username_alias && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <FiUser size={14} className="opacity-60 shrink-0" />
            <span>@{profile.username_alias}</span>
          </div>
        )}
        {profile?.department && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <FiBriefcase size={14} className="opacity-60 shrink-0" />
            <span>{profile.department}</span>
          </div>
        )}
        {profile?.phone_number && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <FiPhone size={14} className="opacity-60 shrink-0" />
            <span>{profile.phone_number}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function GroupView({ chat, onClose }) {
  const [members, setMembers] = useState([])
  const startDirectMessage = useChatStore((s) => s.startDirectMessage)

  useEffect(() => {
    if (!chat) return
    api.get(`/chatboxes/${chat.id}/members/`).then(({ data }) => setMembers(data)).catch(() => {})
  }, [chat])

  const avatarSrc = chat.group_avatar_url ||
    `https://placehold.co/120x120/4ade80/ffffff?text=${encodeURIComponent((chat.title || 'G').slice(0, 1).toUpperCase())}`

  const handleDM = async (memberId) => {
    onClose()
    await startDirectMessage(memberId)
  }

  return (
    <motion.div
      initial={{ y: 16, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 16, opacity: 0, scale: 0.97 }}
      className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Banner */}
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
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            Group
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
                  {m.id === chat.created_by && <p className="text-[10px] text-amber-600 font-semibold">Group Owner</p>}
                </div>
              </div>
              <button
                onClick={() => handleDM(m.id)}
                title="Send direct message"
                className="p-1.5 rounded-full hover:bg-wa-100 dark:hover:bg-wa-900/30 text-wa-600 shrink-0"
              >
                <FiMessageCircle size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function GroupDetailsModal({ open, onClose, chat }) {
  if (!open || !chat) return null
  const isDM = chat.chat_type === 'direct'

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {isDM
          ? <DMProfileView chat={chat} onClose={onClose} />
          : <GroupView chat={chat} onClose={onClose} />
        }
      </motion.div>
    </AnimatePresence>
  )
}
