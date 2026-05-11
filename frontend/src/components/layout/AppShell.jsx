import { FiLogOut, FiMessageSquare, FiPlusCircle, FiSettings, FiUser, FiUsers } from 'react-icons/fi'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'

const navItems = [
  { to: '/', label: 'Chats', icon: FiMessageSquare },
  { to: '/add-user', label: 'Add User', icon: FiPlusCircle, ownerOnly: true },
  { to: '/users', label: 'Users List', icon: FiUsers, ownerOnly: true },
  { to: '/profile', label: 'Profile', icon: FiUser },
  { to: '/settings', label: 'Settings', icon: FiSettings },
]

export default function AppShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const activeChat = useChatStore((s) => s.activeChat)

  const doLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter((item) => !item.ownerOnly || user?.role === 'owner')
  const hideBottomNav = !!activeChat

  return (
    <div className="min-h-[100dvh] bg-slate-100 dark:bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="w-64 bg-white/90 dark:bg-slate-900 border-r backdrop-blur-xl p-4 hidden md:flex md:flex-col">
        <h1 className="text-xl font-semibold mb-6">Company Log</h1>
        <nav className="space-y-2 flex-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl transition ${isActive ? 'bg-wa-100 text-wa-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`
                }
              >
                <Icon /> {item.label}
              </NavLink>
            )
          })}
        </nav>
        <button
          onClick={doLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition mt-2"
        >
          <FiLogOut /> Logout
        </button>
      </aside>

      {/* Main content */}
      <main className={`flex-1 min-w-0 overflow-hidden ${hideBottomNav ? '' : 'pb-16'} md:pb-0`}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — hidden when inside a chat */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t flex z-40 transition-transform duration-200 ${hideBottomNav ? 'translate-y-full' : 'translate-y-0'}`}>
        {visibleItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition ${isActive ? 'text-wa-700' : 'text-slate-500 dark:text-slate-400'}`
              }
            >
              <Icon size={20} />
              {item.label}
            </NavLink>
          )
        })}
        <button
          onClick={doLogout}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] text-slate-500 dark:text-slate-400"
        >
          <FiLogOut size={20} />
          Logout
        </button>
      </nav>
    </div>
  )
}
