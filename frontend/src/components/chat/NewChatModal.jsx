import { useState } from 'react'
import toast from 'react-hot-toast'
import { useChatStore } from '../../store/chatStore'

export default function NewChatModal({ open, onClose }) {
  const createChatbox = useChatStore((s) => s.createChatbox)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility_type, setVisibility] = useState('chat_enabled')

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    await createChatbox({ title, description, visibility_type })
    toast.success('Chat box created')
    setTitle('')
    setDescription('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-3">
        <h2 className="text-lg font-semibold">Create Chat Box</h2>
        <input required className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="w-full rounded-xl border px-3 py-2 bg-transparent" value={visibility_type} onChange={(e) => setVisibility(e.target.value)}>
          <option value="view_only">View Only</option>
          <option value="chat_enabled">Chat Enabled</option>
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800">Cancel</button>
          <button className="px-3 py-2 rounded-xl bg-wa-600 text-white">Create</button>
        </div>
      </form>
    </div>
  )
}
