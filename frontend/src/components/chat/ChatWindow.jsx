import { useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiMic, FiMoon, FiPlus, FiSend, FiSettings, FiSun, FiTrash2 } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import MessageBubble, { SystemBanner } from './MessageBubble'
import AttachmentMenu from './AttachmentMenu'
import GroupSettingsModal from './GroupSettingsModal'
import GroupDetailsModal from './GroupDetailsModal'
import PollModal from './PollModal'

export default function ChatWindow({ onBack, dark, onToggleDark }) {
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
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [pollOpen, setPollOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [waveBars, setWaveBars] = useState(Array.from({ length: 24 }, () => 6))
  const [newMsgCount, setNewMsgCount] = useState(0)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)
  const cancelRef = useRef(false)
  const listRef = useRef(null)
  const bottomRef = useRef(null)

  // Instantly jump to bottom when switching chats
  useEffect(() => {
    setNewMsgCount(0)
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [activeChat])

  // Track new messages; scroll if near bottom or own message
  useEffect(() => {
    if (messages.length === 0) return
    const list = listRef.current
    const isNearBottom = list ? list.scrollHeight - list.scrollTop - list.clientHeight < 120 : true
    const lastMsg = messages[messages.length - 1]
    const isOwn = lastMsg?.sender === user?.id || lastMsg?.optimistic
    if (isNearBottom || isOwn) {
      setNewMsgCount(0)
      bottomRef.current?.scrollIntoView({ behavior: isOwn ? 'smooth' : 'instant' })
    } else {
      setNewMsgCount((n) => n + 1)
    }
    if (lastMsg?.id && typeof lastMsg.id === 'number') markSeen(lastMsg.id)
  }, [messages, markSeen, user?.id])

  if (!activeChat) return (
    <div className="flex-1 flex flex-col">
      <div className="h-14 px-4 border-b border-white/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-end">
        <button onClick={onToggleDark} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
          {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
      </div>
      <div className="flex-1 grid place-items-center text-slate-400 text-sm">Select a chat to start</div>
    </div>
  )
  const canManageGroup = user?.role === 'owner' || activeChat.created_by === user?.id
  const memberCount = activeChat.member_count || 0
  const avatarSrc = activeChat.group_avatar_url || `https://placehold.co/40x40/4ade80/ffffff?text=${encodeURIComponent((activeChat.title || 'G').slice(0, 1).toUpperCase())}`

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
  const onPickAttachment = async (file) => {
    setAttachMenuOpen(false)
    await sendFile(file, text)
    setText('')
  }
  const onMenuAction = (action) => {
    if (action === 'poll') {
      setAttachMenuOpen(false)
      setPollOpen(true)
    }
  }
  const sendPoll = ({ question, options }) => {
    const payload = `📊 Poll: ${question}\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
    sendMessage(payload)
  }
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      cancelRef.current = false
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (cancelRef.current) return
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        await sendFile(file, '')
      }
      recorder.start()
      setRecording(true)
      setRecordSecs(0)
      timerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const slice = Math.floor(data.length / 24) || 1
        const bars = Array.from({ length: 24 }, (_, i) => {
          const seg = data.slice(i * slice, (i + 1) * slice)
          const avg = seg.reduce((a, b) => a + b, 0) / (seg.length || 1)
          return Math.max(4, Math.min(26, Math.round(avg / 8)))
        })
        setWaveBars(bars)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // no mic permission
    }
  }
  const stopRecording = async (send = true) => {
    if (!recorderRef.current) return
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setWaveBars(Array.from({ length: 24 }, () => 6))
    if (audioCtxRef.current) {
      await audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
    setRecording(false)
    cancelRef.current = !send
    recorderRef.current.stop()
  }

  const onScroll = () => {
    if (!listRef.current || !hasMore) return
    if (listRef.current.scrollTop < 40) fetchMessages(page + 1)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.1),transparent_35%),url('https://www.transparenttextures.com/patterns/soft-circle-scales.png')]">
      {/* Single header — back + avatar + title + dark toggle + settings */}
      <div className="h-14 px-3 border-b border-white/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex items-center gap-2 shrink-0">
        {/* Back button (mobile only) */}
        <button
          onClick={onBack}
          className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          <FiArrowLeft size={18} />
        </button>

        {/* Avatar + title — tappable to open details */}
        <button
          onClick={() => setDetailsOpen(true)}
          className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition"
        >
          <img
            src={avatarSrc}
            alt={activeChat.title}
            className="w-9 h-9 rounded-full object-cover border border-white/40 shrink-0"
          />
          <div className="text-left min-w-0">
            <p className="font-semibold text-sm truncate">{activeChat.title}</p>
            <p className="text-[11px] opacity-50">
              {activeChat.chat_type === 'direct' ? 'Direct Message' : `${memberCount} member${memberCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </button>

        {/* Dark mode toggle */}
        <button onClick={onToggleDark} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
          {dark ? <FiSun size={17} /> : <FiMoon size={17} />}
        </button>
        {/* Settings */}
        <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-full hover:bg-white/60 shrink-0">
          <FiSettings size={17} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <div
          ref={listRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto p-4 space-y-2"
        >
          {hasMore && <p className="text-xs text-center opacity-60">Scroll up to load older messages</p>}
          {messages.map((msg) =>
            msg.is_system ? (
              <SystemBanner key={msg.id} text={msg.message || msg.display_message} />
            ) : (
              <MessageBubble
                key={msg.id}
                msg={msg}
                mine={msg.sender === user?.id}
                userId={user?.id}
                memberCount={memberCount}
                isGroup={activeChat.chat_type !== 'direct'}
                onReply={() => setReplyTo(msg.id)}
              />
            )
          )}
          <div ref={bottomRef} />
        </div>

        {/* Floating new messages badge */}
        {newMsgCount > 0 && (
          <button
            onClick={() => { setNewMsgCount(0); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-wa-600 text-white text-xs font-semibold shadow-lg z-10"
          >
            ↓ {newMsgCount} new message{newMsgCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 py-2">
        {typingUsers.length > 0 && <p className="text-xs mb-1 text-wa-700">Someone is typing...</p>}
        {replyTo && <p className="text-xs mb-1">Replying to message #{replyTo} <button className="underline" onClick={() => setReplyTo(null)}>cancel</button></p>}
        {uploadProgress > 0 && <div className="h-1 bg-slate-200 rounded-full mb-2"><div className="h-1 bg-wa-600 rounded-full" style={{ width: `${uploadProgress}%` }} /></div>}
        <form onSubmit={submit} className="bg-white/90 dark:bg-slate-900 rounded-2xl p-2 shadow-glass flex items-center gap-2 relative">
          <button type="button" onClick={() => setAttachMenuOpen((v) => !v)} className="p-2 rounded-full bg-wa-600 text-white"><FiPlus /></button>
          <AttachmentMenu open={attachMenuOpen} onPick={onPickAttachment} onAction={onMenuAction} />
          <label className="hidden"><input type="file" className="hidden" onChange={onFile} /></label>
          {recording ? (
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="flex-1 flex items-end gap-[2px] overflow-hidden h-7">
                {waveBars.map((h, i) => (
                  <span key={i} className="w-[3px] shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all" style={{ height: `${h}px` }} />
                ))}
              </div>
              <span className="text-xs text-rose-500 shrink-0 tabular-nums">
                {String(Math.floor(recordSecs / 60)).padStart(2, '0')}:{String(recordSecs % 60).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <input value={text} onChange={(e) => { setText(e.target.value); sendTyping() }} className="flex-1 px-3 py-2 bg-transparent outline-none min-w-0" placeholder="Type a message" />
          )}
          {recording ? (
            <>
              <button type="button" onClick={() => stopRecording(false)} className="shrink-0 p-2 rounded-full bg-slate-200 text-slate-700"><FiTrash2 /></button>
              <button type="button" onClick={() => stopRecording(true)} className="shrink-0 p-2 rounded-full bg-wa-600 text-white"><FiSend /></button>
            </>
          ) : text.trim() ? (
            <button className="shrink-0 p-2 rounded-full bg-wa-600 text-white"><FiSend /></button>
          ) : (
            <button type="button" onClick={startRecording} className="shrink-0 p-2 rounded-full bg-wa-600 text-white"><FiMic /></button>
          )}
        </form>
      </motion.div>
      <GroupSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} chat={activeChat} canManage={canManageGroup} />
      <GroupDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} chat={activeChat} />
      <PollModal open={pollOpen} onClose={() => setPollOpen(false)} onSubmit={sendPoll} />
    </div>
  )
}
