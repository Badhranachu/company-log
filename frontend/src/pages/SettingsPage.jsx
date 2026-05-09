export default function SettingsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Settings</h2>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-2">
        <p className="text-sm">Realtime is enabled via WebSocket and auto-connected per chat.</p>
        <p className="text-sm">File uploads support image, video, PDF, docs, zip with validation.</p>
        <p className="text-sm">Dark mode available in chats header.</p>
      </div>
    </div>
  )
}
