import { useEffect, useMemo, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'
import Sidebar from '../components/chat/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import NewChatModal from '../components/chat/NewChatModal'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'

export default function ChatPage() {
  const [showModal, setShowModal] = useState(false)
  const [dark, setDark] = useState(localStorage.getItem('dark') === '1')
  const user = useAuthStore((s) => s.user)
  const fetchChatboxes = useChatStore((s) => s.fetchChatboxes)
  const activeChat = useChatStore((s) => s.activeChat)
  const clearActiveChat = useChatStore((s) => s.clearActiveChat)

  useEffect(() => { fetchChatboxes() }, [fetchChatboxes])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark', dark ? '1' : '0')
  }, [dark])

  const roleLabel = useMemo(() => user?.role === 'owner' ? 'Owner' : 'User', [user])

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen flex bg-[#f0f2f5] dark:bg-slate-950">

      {/* Sidebar — full screen on mobile when no chat selected, hidden when chat is open on mobile */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:max-w-sm`}>
        <Sidebar onCreate={() => setShowModal(true)} />
      </div>

      {/* Chat area — hidden on mobile when no chat selected */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col relative min-w-0`}>
        {/* Top bar */}
        <div className="h-14 bg-white/90 dark:bg-slate-900 border-b px-4 flex items-center justify-between backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            {/* Back button on mobile */}
            {activeChat && (
              <button
                onClick={clearActiveChat}
                className="md:hidden p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xl leading-none"
                aria-label="Back"
              >
                ‹
              </button>
            )}
            <div>
              <p className="font-semibold text-sm leading-tight">{activeChat ? activeChat.title : user?.name}</p>
              <p className="text-xs opacity-60 leading-tight">{activeChat ? '' : roleLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setDark((x) => !x)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            {dark ? <FiSun /> : <FiMoon />}
          </button>
        </div>
        <ChatWindow />
      </div>

      <NewChatModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
