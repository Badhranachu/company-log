import { useState } from 'react'
import { FiCheck, FiChevronRight, FiLock, FiMail } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import PageActions from '../components/layout/PageActions'

function OtpInput({ value, onChange }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      placeholder="Enter 6-digit OTP"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400 tracking-widest text-center text-lg font-semibold"
    />
  )
}

function Section({ icon: Icon, title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
      >
        <span className="p-2 rounded-xl bg-wa-50 dark:bg-wa-900/30 text-wa-600"><Icon size={16} /></span>
        <span className="flex-1 font-medium text-sm">{title}</span>
        <FiChevronRight size={16} className={`opacity-40 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800">{children}</div>}
    </div>
  )
}

function ChangeEmail() {
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(1) // 1=enter email, 2=enter otp
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Enter a valid email'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/request_email_change/', { new_email: newEmail })
      toast.success(data.detail)
      setStep(2)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const verify = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify_email_change/', { otp })
      toast.success(data.detail)
      setUser({ ...user, email: data.email })
      setStep(1); setNewEmail(''); setOtp('')
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs opacity-60">Current email: <strong>{user?.email}</strong></p>
      {step === 1 ? (
        <>
          <input
            type="email"
            placeholder="New email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400"
          />
          <button
            onClick={sendOtp}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-wa-600 hover:bg-wa-700 text-white text-sm font-medium transition disabled:opacity-60"
          >
            {loading ? 'Sending OTP…' : 'Send OTP to new email'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-wa-700 dark:text-wa-400 bg-wa-50 dark:bg-wa-900/20 rounded-xl px-3 py-2">
            OTP sent to <strong>{newEmail}</strong>. Enter it below to confirm.
          </p>
          <OtpInput value={otp} onChange={setOtp} />
          <div className="flex gap-2">
            <button
              onClick={() => { setStep(1); setOtp('') }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >Back</button>
            <button
              onClick={verify}
              disabled={loading || otp.length !== 6}
              className="flex-1 py-2.5 rounded-xl bg-wa-600 hover:bg-wa-700 text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <FiCheck size={14} />
              {loading ? 'Verifying…' : 'Confirm'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ChangePassword() {
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(1) // 1=request otp, 2=enter otp+new pw
  const [otp, setOtp] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/request_password_otp/')
      toast.success(data.detail)
      setStep(2)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const changePassword = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/change_password/', { otp, new_password: newPw })
      toast.success(data.detail)
      setStep(1); setOtp(''); setNewPw(''); setConfirmPw('')
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to change password')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 pt-2">
      {step === 1 ? (
        <>
          <p className="text-xs opacity-60">An OTP will be sent to <strong>{user?.email}</strong> to verify it's you.</p>
          <button
            onClick={sendOtp}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-wa-600 hover:bg-wa-700 text-white text-sm font-medium transition disabled:opacity-60"
          >
            {loading ? 'Sending OTP…' : 'Send OTP to my email'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-wa-700 dark:text-wa-400 bg-wa-50 dark:bg-wa-900/20 rounded-xl px-3 py-2">
            OTP sent to <strong>{user?.email}</strong>. Enter it along with your new password.
          </p>
          <OtpInput value={otp} onChange={setOtp} />
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-transparent text-sm outline-none focus:ring-2 focus:ring-wa-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setStep(1); setOtp('') }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >Back</button>
            <button
              onClick={changePassword}
              disabled={loading || otp.length !== 6}
              className="flex-1 py-2.5 rounded-xl bg-wa-600 hover:bg-wa-700 text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <FiLock size={14} />
              {loading ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="p-3 md:p-6 max-w-lg">
      <PageActions title="Settings" />
      <div className="space-y-3">
        <Section icon={FiMail} title="Change Email">
          <ChangeEmail />
        </Section>
        <Section icon={FiLock} title="Change Password">
          <ChangePassword />
        </Section>
      </div>
    </div>
  )
}
