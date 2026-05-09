import { FiCheckCircle, FiCornerUpLeft, FiEdit2, FiMapPin, FiTrash2 } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import AttachmentPreview from './AttachmentPreview'

export default function MessageBubble({ msg, mine, onReply }) {
  const toggleTick = useChatStore((s) => s.toggleTick)
  const togglePin = useChatStore((s) => s.togglePin)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const editMessage = useChatStore((s) => s.editMessage)
  const isOlderThanHour = Date.now() - new Date(msg.created_at).getTime() > 60 * 60 * 1000

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[75%] ${mine ? 'ml-auto' : ''}`}>
      <div className={`rounded-2xl px-3 py-2 ${mine ? 'bg-emerald-200 dark:bg-emerald-900' : 'bg-white dark:bg-slate-900'} shadow`}>
        {msg.reply_to && <p className="text-[10px] opacity-70 mb-1">Reply to #{msg.reply_to}</p>}
        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
        <AttachmentPreview msg={msg} />
        <div className="text-[10px] opacity-60 mt-1 flex items-center justify-between gap-2">
          <span>{new Date(msg.created_at).toLocaleTimeString()} {msg.edited_at ? '(edited)' : ''}</span>
          <div className="flex items-center gap-2">
            {msg.is_ticked && <FiCheckCircle className="text-wa-700" />}
            {msg.is_pinned && <FiMapPin className="text-amber-500" />}
            <button onClick={onReply}><FiCornerUpLeft /></button>
            {mine && <button onClick={() => toggleTick(msg.id)}><FiCheckCircle /></button>}
            <button onClick={() => togglePin(msg.id)}><FiMapPin /></button>
            {mine && !isOlderThanHour && <button onClick={() => {
              const next = window.prompt('Edit message', msg.message)
              if (next !== null && next.trim()) editMessage(msg.id, next.trim())
            }}><FiEdit2 /></button>}
            {mine && !isOlderThanHour && <button onClick={() => deleteMessage(msg.id)}><FiTrash2 /></button>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
