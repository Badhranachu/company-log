import { useState } from 'react'
import { FiCheckCircle, FiCornerUpLeft, FiEdit2, FiMapPin, FiTrash2, FiX } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import AttachmentPreview from './AttachmentPreview'

export default function MessageBubble({ msg, mine, onReply }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const toggleTick = useChatStore((s) => s.toggleTick)
  const togglePin = useChatStore((s) => s.togglePin)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const editMessage = useChatStore((s) => s.editMessage)
  const isOlderThanHour = Date.now() - new Date(msg.created_at).getTime() > 60 * 60 * 1000
  const canDeleteForEveryone = mine && !isOlderThanHour

  const handleDelete = (scope) => {
    setDeleteOpen(false)
    deleteMessage(msg.id, scope)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[75%] ${mine ? 'ml-auto' : ''}`}>
      <div className={`rounded-2xl px-3 py-2 ${mine ? 'bg-emerald-200 dark:bg-emerald-900' : 'bg-white dark:bg-slate-900'} shadow`}>
        {msg.reply_to && <p className="text-[10px] opacity-70 mb-1">Reply to #{msg.reply_to}</p>}
        {msg.message ? <p className="text-sm whitespace-pre-wrap">{msg.message}</p> : null}
        <AttachmentPreview msg={msg} />

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
                <button
                  onClick={() => handleDelete('me')}
                  className="text-[11px] px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Delete for me
                </button>
                {canDeleteForEveryone && (
                  <button
                    onClick={() => handleDelete('everyone')}
                    className="text-[11px] px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60"
                  >
                    Delete for everyone
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
          <span>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {msg.edited_at ? ' (edited)' : ''}
          </span>
          {!deleteOpen && (
            <div className="flex items-center gap-2">
              {msg.is_ticked && <FiCheckCircle className="text-wa-700" />}
              {msg.is_pinned && <FiMapPin className="text-amber-500" />}
              <button onClick={onReply} title="Reply"><FiCornerUpLeft /></button>
              {mine && <button onClick={() => toggleTick(msg.id)} title="Tick"><FiCheckCircle /></button>}
              <button onClick={() => togglePin(msg.id)} title="Pin"><FiMapPin /></button>
              {mine && !isOlderThanHour && (
                <button
                  onClick={() => {
                    const next = window.prompt('Edit message', msg.message)
                    if (next !== null && next.trim()) editMessage(msg.id, next.trim())
                  }}
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
              )}
              <button onClick={() => setDeleteOpen(true)} title="Delete"><FiTrash2 /></button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
