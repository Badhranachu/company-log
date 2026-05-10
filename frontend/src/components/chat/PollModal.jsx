import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiX } from 'react-icons/fi'

export default function PollModal({ open, onClose, onSubmit }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  if (!open) return null

  const addOption = () => setOptions((s) => [...s, ''])
  const setOption = (idx, value) => setOptions((s) => s.map((x, i) => (i === idx ? value : x)))

  const submit = (e) => {
    e.preventDefault()
    const clean = options.map((x) => x.trim()).filter(Boolean)
    if (!question.trim() || clean.length < 2) return
    onSubmit({ question: question.trim(), options: clean })
    setQuestion('')
    setOptions(['', ''])
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/45 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.form onSubmit={submit} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-950 text-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10"><FiArrowLeft /></button>
              <h3 className="text-xl font-semibold">Create Poll</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10"><FiX /></button>
          </div>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" className="w-full rounded-xl border border-white/20 bg-transparent px-3 py-2" />
          {options.map((o, i) => (
            <input key={i} value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="w-full rounded-xl border border-white/20 bg-transparent px-3 py-2" />
          ))}
          <button type="button" onClick={addOption} className="text-sm text-emerald-300">+ Add option</button>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-800">Cancel</button>
            <button className="px-3 py-2 rounded-xl bg-emerald-600">Send Poll</button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  )
}
