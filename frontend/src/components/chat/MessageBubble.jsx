import { useState } from 'react'
import { FiCheckCircle, FiCornerUpLeft, FiEdit2, FiTrash2, FiX, FiCheck } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import AttachmentPreview from './AttachmentPreview'

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

export default function MessageBubble({ msg, mine, userId, memberCount, isGroup, onReply }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const toggleTick = useChatStore((s) => s.toggleTick)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const editMessage = useChatStore((s) => s.editMessage)
  const isOlderThanHour = Date.now() - new Date(msg.created_at).getTime() > 60 * 60 * 1000
  // Only the sender can delete for everyone, and only within 1 hour
  const canDeleteForEveryone = mine && !isOlderThanHour
  const isDeleted = !!msg.deleted_for_everyone

  const handleDelete = (scope) => {
    setDeleteOpen(false)
    deleteMessage(msg.id, scope)
  }

  // For incoming messages, immediately hide from my view on "Delete for me"
  const handleDeleteForMe = () => {
    setDeleteOpen(false)
    deleteMessage(msg.id, 'me')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[75%] ${mine ? 'ml-auto' : ''}`}>
      {/* Sender name for group messages from others */}
      {!mine && msg.sender_name && (
        <p className="text-[10px] font-semibold text-wa-600 mb-0.5 px-1">{msg.sender_name}</p>
      )}
      <div className={`rounded-2xl px-3 py-2 ${mine ? 'bg-emerald-200 dark:bg-emerald-900' : 'bg-white dark:bg-slate-900'} shadow`}>
        {msg.reply_to && <p className="text-[10px] opacity-70 mb-1">Reply to #{msg.reply_to}</p>}
        {isDeleted ? (
          <p className="text-sm italic opacity-70">This message was deleted</p>
        ) : (
          <>
            {msg.display_message ? <p className="text-sm whitespace-pre-wrap">{msg.display_message}</p> : null}
            <AttachmentPreview msg={msg} />
          </>
        )}

        {/* Ticked indicator shown to everyone */}
        {msg.is_ticked && (
          <div className="flex items-center gap-1 mt-1 text-wa-700">
            <FiCheckCircle size={13} />
            <span className="text-[10px] font-medium">Ticked</span>
          </div>
        )}

        {/* Delete options */}
        <AnimatePresence>
          {deleteOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex gap-2 flex-wrap">
                {mine ? (
                  <>
                    {canDeleteForEveryone && (
                      <button
                        onClick={() => handleDelete('everyone')}
                        className="text-[11px] px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60"
                      >
                        Delete for everyone
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete('me')}
                      className="text-[11px] px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                      Delete for me
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDeleteForMe}
                    className="text-[11px] px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    Hide from my view
                  </button>
                )}
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                >
                  <FiX size={10} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timestamp + action row */}
        <div className="text-[10px] opacity-60 mt-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-0.5">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {msg.edited_at ? ' (edited)' : ''}
            <DeliveryTicks msg={msg} mine={mine} userId={userId} memberCount={memberCount} isGroup={isGroup} />
          </span>
          {!deleteOpen && (
            <div className="flex items-center gap-2">
              {!isDeleted && <button onClick={onReply} title="Reply"><FiCornerUpLeft size={14} /></button>}
              {/* Tick button — only sender can toggle */}
              {!isDeleted && mine && (
                <button
                  onClick={() => toggleTick(msg.id)}
                  title={msg.is_ticked ? 'Untick' : 'Tick'}
                  className={`p-1 rounded-full transition ${msg.is_ticked ? 'text-wa-700 bg-wa-100 dark:bg-wa-900/30' : 'hover:text-wa-700'}`}
                >
                  <FiCheckCircle size={16} />
                </button>
              )}
              {/* Edit: only sender, within 1 hour */}
              {!isDeleted && mine && !isOlderThanHour && (
                <button
                  onClick={() => {
                    const next = window.prompt('Edit message', msg.display_message || '')
                    if (next !== null && next.trim()) editMessage(msg.id, next.trim())
                  }}
                  title="Edit"
                >
                  <FiEdit2 size={14} />
                </button>
              )}
              {/* Trash: sender sees delete options; others see "hide from my view" */}
              {!isDeleted && (
                <button onClick={() => setDeleteOpen(true)} title={mine ? 'Delete' : 'Hide'}>
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
