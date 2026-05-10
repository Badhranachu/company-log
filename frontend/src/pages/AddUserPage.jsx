import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import PageActions from '../components/layout/PageActions'

export default function AddUserPage() {
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  if (user?.role !== 'owner') return <div className="p-6">Owner access only.</div>

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await api.post('/users/', form)
      toast.success('User created successfully')
      setForm({ name: '', email: '', password: '', role: 'user' })
    } catch (err) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        // Map field-level errors from DRF
        const fieldErrors = {}
        Object.entries(data).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val.join(' ') : String(val)
        })
        setErrors(fieldErrors)
        const first = Object.values(fieldErrors)[0]
        if (first) toast.error(first)
      } else {
        toast.error('Failed to create user. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const field = (name, placeholder, type = 'text') => (
    <div className="space-y-1">
      <input
        required
        type={type}
        className={`w-full rounded-xl border px-3 py-2 bg-transparent ${errors[name] ? 'border-red-400' : ''}`}
        placeholder={placeholder}
        value={form[name]}
        onChange={(e) => { setForm({ ...form, [name]: e.target.value }); setErrors({ ...errors, [name]: '' }) }}
      />
      {errors[name] && <p className="text-xs text-red-500 px-1">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="p-3 md:p-6">
      <PageActions title="Add User" />
      <form onSubmit={submit} className="max-w-xl bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3">
        {field('name', 'Full name')}
        {field('email', 'Email address', 'email')}
        <div className="space-y-1">
          <input
            required
            type="password"
            className={`w-full rounded-xl border px-3 py-2 bg-transparent ${errors.password ? 'border-red-400' : ''}`}
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }) }}
          />
          {errors.password
            ? <p className="text-xs text-red-500 px-1">{errors.password}</p>
            : <p className="text-xs opacity-50 px-1">Minimum 8 characters</p>
          }
        </div>
        <select
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="user">User</option>
          <option value="owner">Owner</option>
        </select>
        {errors.non_field_errors && <p className="text-xs text-red-500">{errors.non_field_errors}</p>}
        <button
          disabled={loading}
          className="rounded-xl px-4 py-2 bg-wa-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  )
}
