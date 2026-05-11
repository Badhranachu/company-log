import { useState } from 'react'
import { FiCheckCircle, FiCornerUpLeft, FiEdit2, FiCheck } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import AttachmentPreview from './AttachmentPreview'
import UserProfileModal from './UserProfileModal'

function DeliveryTicks({ msg, mine, userId, memberCount, isGroup }) {
  if (!mine) return null

  const seenByOthers = (msg.seen_by_ids || []).filter((id) => id !== userId)
  const isRead = isGroup
    ? seenByOthers.length >= Math.max(1, (memberCount || 1) - 1)
    : seenByOthers.length >= 1

  const isPending = !!msg.optimistic

  if (isPending) {
    return (
      <span className="inline-flex items-center opacity-50 ml-1">
        <FiCheck size={12} />
      </span>
    )
  }

  if (isRead) {
    return (
      <span className="inline-flex items-center text-blue-500 ml-1">
        <FiCheck size={12} className="-mr-1" />
        <FiCheck size={12} />
      </span>
    )
  }

  return (
    <span className="inline-flex items-center opacity-50 ml-1">
      <FiCheck size={12} className="-mr-1" />
      <FiCheck size={12} />
    </span>
  )
}

export function SystemBanner({ text }) {
  return (
    <div className="flex justify-center my-1">
      <span className="text-[11px] px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 text-slate-600 dark:text-slate-300">
        {text}
      </span>
    </div>
  )
}

export default function MessageBubble({ msg, mine, userId, memberCount, isGroup, onReply }) {
  const [profileId, setProfileId] = useState(null)
  const toggleTick = useChatStore((s) => s.toggleTick)
  const editMessage = useChatStore((s) => s.editMessage)
  const isOlderThanHour = Date.now() - new Date(msg.created_at).getTime() > 60 * 60 * 1000
  const isDeleted = !!msg.deleted_for_everyone

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[75%] ${mine ? 'ml-auto' : ''}`}>
      {!mine && msg.sender_name && (
        <button
          onClick={() => setProfileId(msg.sender)}
          className="text-[11px] font-semibold text-wa-600 mb-0.5 px-1 hover:underline"
        >
          {msg.sender_name}
        </button>
      )}
      <div className={`rounded-2xl px-3 py-2 ${mine ? 'bg-emerald-200 dark:bg-emerald-900' : 'bg-white dark:bg-slate-900'} shadow`}>
        {msg.reply_to && <p className="text-[10px] opacity-70 mb-1">Reply to #{msg.reply_to}</p>}
        {isDeleted ? (
          <p className="text-sm italic opacity-70">This message was deleted</p>
        ) : (
          <>
            {(msg.display_message || msg.message) ? <p className="text-sm whitespace-pre-wrap">{msg.display_message || msg.message}</p> : null}
            <AttachmentPreview msg={msg} mine={mine} />
          </>
        )}

        {msg.is_ticked && (
          <div className="flex items-center gap-1 mt-1 text-wa-700">
            <FiCheckCircle size={13} />
            <span className="text-[10px] font-medium">Ticked</span>
          </div>
        )}

        {/* Timestamp + action row */}
        <div className="text-[10px] opacity-60 mt-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-0.5">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {msg.edited_at ? ' (edited)' : ''}
            <DeliveryTicks msg={msg} mine={mine} userId={userId} memberCount={memberCount} isGroup={isGroup} />
          </span>
          <div className="flex items-center gap-2">
            {!isDeleted && <button onClick={onReply} title="Reply"><FiCornerUpLeft size={14} /></button>}
            {!isDeleted && mine && (
              <button
                onClick={() => toggleTick(msg.id)}
                title={msg.is_ticked ? 'Untick' : 'Tick'}
                className={`p-1 rounded-full transition ${msg.is_ticked ? 'text-wa-700 bg-wa-100 dark:bg-wa-900/30' : 'hover:text-wa-700'}`}
              >
                <FiCheckCircle size={16} />
              </button>
            )}
            {!isDeleted && mine && !isOlderThanHour && (
              <button
                onClick={() => {
                  const next = window.prompt('Edit message', msg.display_message || msg.message || '')
                  if (next !== null && next.trim()) editMessage(msg.id, next.trim())
                }}
                title="Edit"
              >
                <FiEdit2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
    {profileId && (
      <UserProfileModal
        userId={profileId}
        userName={msg.sender_name}
        onClose={() => setProfileId(null)}
      />
    )}
    </>
  )
}
