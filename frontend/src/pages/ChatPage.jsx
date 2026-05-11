import { useEffect, useState } from 'react'
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
  const connectNotifications = useChatStore((s) => s.connectNotifications)
  const activeChat = useChatStore((s) => s.activeChat)
  const clearActiveChat = useChatStore((s) => s.clearActiveChat)

  useEffect(() => {
    fetchChatboxes()
    connectNotifications()
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark', dark ? '1' : '0')
  }, [dark])

  return (
    <div className="h-[100dvh] md:h-screen flex bg-[#f0f2f5] dark:bg-slate-950 overflow-hidden">

      {/* Sidebar — full screen on mobile when no chat selected */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:max-w-sm h-full flex-col`}>
        <Sidebar
          onCreate={() => setShowModal(true)}
          dark={dark}
          onToggleDark={() => setDark((x) => !x)}
          user={user}
        />
      </div>

      {/* Chat area */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 h-full overflow-hidden`}>
        <ChatWindow onBack={clearActiveChat} dark={dark} onToggleDark={() => setDark((x) => !x)} />
      </div>

      <NewChatModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
