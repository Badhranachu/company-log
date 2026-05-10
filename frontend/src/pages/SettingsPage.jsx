import PageActions from '../components/layout/PageActions'

export default function SettingsPage() {
  return (
    <div className="p-3 md:p-6">
      <PageActions title="Settings" />
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-2">
        <p className="text-sm">Realtime is enabled via WebSocket and auto-connected per chat.</p>
        <p className="text-sm">File uploads support image, video, PDF, docs, zip with validation.</p>
        <p className="text-sm">Dark mode available in chats header.</p>
      </div>
    </div>
  )
}
