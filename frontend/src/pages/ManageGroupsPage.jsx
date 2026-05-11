import { useEffect, useState } from 'react'
import { FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { useChatStore } from '../store/chatStore'
import toast from 'react-hot-toast'

export default function ManageGroupsPage() {
  const fetchDeletedGroups = useChatStore((s) => s.fetchDeletedGroups)
  const restoreGroup = useChatStore((s) => s.restoreGroup)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchDeletedGroups()
      setGroups(data)
    } catch {
      toast.error('Could not load deleted groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRestore = async (group) => {
    setRestoring(group.id)
    try {
      await restoreGroup(group.id)
      setGroups((g) => g.filter((x) => x.id !== group.id))
      toast.success(`"${group.title}" restored`)
    } catch {
      toast.error('Could not restore group')
    } finally {
      setRestoring(null)
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Manage Groups</h1>
          <p className="text-sm opacity-60 mt-0.5">Deleted groups — restore to make them visible again</p>
        </div>
        <button onClick={load} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Refresh">
          <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 opacity-50">
          <FiTrash2 size={40} className="mx-auto mb-3" />
          <p className="text-sm">No deleted groups</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-base font-semibold shrink-0">
                {(group.title || 'G').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{group.title}</p>
                <p className="text-xs opacity-50">Deleted {formatDate(group.deleted_at)} · {group.member_count ?? 0} members</p>
              </div>
              <button
                onClick={() => handleRestore(group)}
                disabled={restoring === group.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wa-600 hover:bg-wa-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                <FiRefreshCw size={13} className={restoring === group.id ? 'animate-spin' : ''} />
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
