import { motion, AnimatePresence } from 'framer-motion'
import { FiCamera, FiFileText, FiImage, FiMic, FiPlusCircle, FiSmile, FiUsers, FiCalendar } from 'react-icons/fi'

const ITEMS = [
  { key: 'media', label: 'Photos & Videos', icon: FiImage, accept: 'image/*,video/*' },
  { key: 'doc', label: 'Document', icon: FiFileText, accept: '.pdf,.doc,.docx,.txt,.zip' },
  { key: 'audio', label: 'Audio', icon: FiMic, accept: 'audio/*' },
  { key: 'camera', label: 'Camera', icon: FiCamera, accept: 'image/*', capture: 'environment' },
  { key: 'contact', label: 'Contact', icon: FiUsers, disabled: true },
  { key: 'poll', label: 'Poll', icon: FiPlusCircle, action: 'poll' },
  { key: 'event', label: 'Event', icon: FiCalendar, disabled: true },
  { key: 'sticker', label: 'Sticker', icon: FiSmile, disabled: true },
]

export default function AttachmentMenu({ open, onPick, onAction }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          className="absolute bottom-16 left-0 w-56 rounded-2xl border border-white/40 bg-slate-900/90 backdrop-blur-xl p-2 shadow-2xl"
        >
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <label
                key={item.key}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition ${item.disabled ? 'text-slate-400 bg-white/[0.03] cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer text-white'}`}
                onClick={() => {
                  if (item.action && onAction) onAction(item.action)
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon />
                  <span>{item.label}</span>
                </div>
                {item.disabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">Soon</span>}
                {!item.disabled && (
                  <input
                    type="file"
                    className="hidden"
                    accept={item.accept}
                    capture={item.capture}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onPick(f)
                    }}
                  />
                )}
              </label>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
