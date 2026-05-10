import { FiArrowLeft, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

export default function PageActions({ title }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800" aria-label="Back"><FiArrowLeft /></button>
        <h2 className="text-2xl md:text-3xl font-semibold truncate">{title}</h2>
      </div>
      <button onClick={() => navigate('/')} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800" aria-label="Close"><FiX /></button>
    </div>
  )
}
