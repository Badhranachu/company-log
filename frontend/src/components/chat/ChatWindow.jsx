import { useEffect, useRef, useState } from 'react'
import { FiPaperclip, FiSend } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import MessageBubble from './MessageBubble'

export default function ChatWindow() {
  const user = useAuthStore((s) => s.user)
  const activeChat = useChatStore((s) => s.activeChat)
  const messages = useChatStore((s) => s.messages)
  const typingUsers = useChatStore((s) => s.typingUsers)
  const hasMore = useChatStore((s) => s.hasMore)
  const page = useChatStore((s) => s.page)
  const uploadProgress = useChatStore((s) => s.uploadProgress)
  const fetchMessages = useChatStore((s) => s.fetchMessages)
  const sendTyping = useChatStore((s) => s.sendTyping)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const sendFile = useChatStore((s) => s.sendFile)
  const markSeen = useChatStore((s) => s.markSeen)

  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    const last = messages[messages.length - 1]
    if (last?.id && typeof last.id === 'number') markSeen(last.id)
  }, [messages, activeChat, markSeen])

  if (!activeChat) return <div className="flex-1 grid place-items-center text-slate-500">Select a chat box to start</div>

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    sendMessage(text.trim(), replyTo)
    setText('')
    setReplyTo(null)
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await sendFile(file, text)
    setText('')
  }

  const onScroll = () => {
    if (!listRef.current || !hasMore) return
    if (listRef.current.scrollTop < 40) fetchMessages(page + 1)
  }

  return (
    <div className="flex-1 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/soft-circle-scales.png')]">
      <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
        {hasMore && <p className="text-xs text-center opacity-60">Scroll up to load older messages</p>}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} mine={msg.sender === user?.id} onReply={() => setReplyTo(msg.id)} />)}
      </div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 py-2">
        {typingUsers.length > 0 && <p className="text-xs mb-1 text-wa-700">Someone is typing...</p>}
        {replyTo && <p className="text-xs mb-1">Replying to message #{replyTo} <button className="underline" onClick={() => setReplyTo(null)}>cancel</button></p>}
        {uploadProgress > 0 && <div className="h-1 bg-slate-200 rounded-full mb-2"><div className="h-1 bg-wa-600 rounded-full" style={{ width: `${uploadProgress}%` }} /></div>}
        <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-glass flex items-center gap-2">
          <label className="p-2 cursor-pointer"><FiPaperclip /><input type="file" className="hidden" onChange={onFile} /></label>
          <input value={text} onChange={(e) => { setText(e.target.value); sendTyping() }} className="flex-1 px-3 py-2 bg-transparent outline-none" placeholder="Type a message" />
          <button className="p-2 rounded-full bg-wa-600 text-white"><FiSend /></button>
        </form>
      </motion.div>
    </div>
  )
}
