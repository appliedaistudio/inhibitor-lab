import { useState, useEffect, useCallback } from 'react'
import {
  Droplets, Shield, Users, KeyRound, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, AlertTriangle, Copy, Check,
  Search, BarChart3, RefreshCw, Eye, EyeOff,
} from 'lucide-react'
import backend from '../api/backend'

const STORAGE_KEY = 'plasmiq_admin_key'

// ── helpers ──────────────────────────────────────────────────────────────────

function adminHeaders(key) {
  return { 'x-admin-key': key }
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function StatusBadge({ status }) {
  const map = {
    scheduled:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
    completed:  'bg-green-500/15 text-green-400 border-green-500/30',
    no_show:    'bg-red-500/15 text-red-400 border-red-500/30',
    cancelled:  'bg-slate-500/15 text-slate-400 border-slate-500/30',
    missed:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${map[status] || map.scheduled}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// ── Thank-you message modal ───────────────────────────────────────────────────

function ThankYouModal({ message, donor, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-800 border border-green-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <h2 className="font-bold text-lg text-green-400">Appointment Completed!</h2>
        </div>
        <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">
          Generated Thank-You Message for {donor}
        </p>
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap mb-4">
          {message}
        </div>
        <div className="flex gap-3">
          <button
            onClick={copy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Appointment row ───────────────────────────────────────────────────────────

function AppointmentRow({ appt, adminKey, onUpdated }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [thankYou, setThankYou] = useState(appt.thank_you_message || null)
  const [showMsg, setShowMsg] = useState(false)

  const canAct = !['completed', 'no_show', 'cancelled'].includes(appt.status)

  const act = async (action) => {
    setLoading(action)
    setError('')
    try {
      const res = await backend.post(
        `/api/admin/appointments/${appt.id}/${action}`,
        {},
        { headers: adminHeaders(adminKey) },
      )
      if (action === 'complete') {
        setThankYou(res.data.thank_you_message)
        setShowMsg(true)
      }
      onUpdated()
    } catch (e) {
      setError(e.response?.data?.detail || 'Action failed.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {showMsg && thankYou && (
        <ThankYouModal
          message={thankYou}
          donor={appt.donor_name || 'Donor'}
          onClose={() => setShowMsg(false)}
        />
      )}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{appt.center_name}</span>
              <StatusBadge status={appt.status} />
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{formatDate(appt.slot_time)}</div>
            {appt.center_address && (
              <div className="text-xs text-slate-500 mt-0.5 truncate">{appt.center_address}</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {thankYou && !showMsg && (
              <button
                onClick={() => setShowMsg(true)}
                className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-green-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> View Message
              </button>
            )}
            {canAct && (
              <>
                <button
                  disabled={!!loading}
                  onClick={() => act('complete')}
                  className="flex items-center gap-1.5 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === 'complete'
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Complete
                </button>
                <button
                  disabled={!!loading}
                  onClick={() => act('no-show')}
                  className="flex items-center gap-1.5 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === 'no-show'
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />}
                  No Show
                </button>
              </>
            )}
          </div>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    </>
  )
}

// ── Donor card ────────────────────────────────────────────────────────────────

function DonorCard({ donor, adminKey }) {
  const [open, setOpen] = useState(false)
  const [appts, setAppts] = useState([])
  const [loadingAppts, setLoadingAppts] = useState(false)
  const [tick, setTick] = useState(0)

  const fetchAppts = useCallback(async () => {
    setLoadingAppts(true)
    try {
      const res = await backend.get(`/api/admin/donors/${donor.id}/appointments`, {
        headers: adminHeaders(adminKey),
      })
      setAppts(res.data)
    } catch {
      // silently ignore
    } finally {
      setLoadingAppts(false)
    }
  }, [donor.id, adminKey])

  useEffect(() => {
    if (open) fetchAppts()
  }, [open, tick, fetchAppts])

  const initials = donor.name
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 text-left"
      >
        <div className="w-10 h-10 bg-blue-600/30 border border-blue-500/30 rounded-full flex items-center justify-center text-sm font-bold text-blue-300 shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{donor.name}</div>
          <div className="text-xs text-slate-400 truncate">{donor.email}</div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 shrink-0">
          {donor.age && <span>{donor.age} yrs</span>}
          <span className="text-amber-400 font-semibold">{donor.points.toLocaleString()} pts</span>
          <span>{donor.donation_count} donations</span>
          {donor.no_show_rate > 0 && (
            <span className="text-red-400">{(donor.no_show_rate * 100).toFixed(0)}% NS</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {/* Mobile stats row */}
      <div className="sm:hidden flex items-center gap-3 mt-2 text-xs text-slate-400 ml-14">
        {donor.age && <span>{donor.age} yrs</span>}
        <span className="text-amber-400 font-semibold">{donor.points.toLocaleString()} pts</span>
        <span>{donor.donation_count} donations</span>
      </div>

      {open && (
        <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Bookings
            </h4>
            <button
              onClick={() => setTick((t) => t + 1)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          {loadingAppts ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-700/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : appts.length === 0 ? (
            <p className="text-slate-500 text-sm">No appointments found.</p>
          ) : (
            <div className="space-y-2">
              {appts.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appt={{ ...a, donor_name: donor.name }}
                  adminKey={adminKey}
                  onUpdated={() => setTick((t) => t + 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Donors tab ────────────────────────────────────────────────────────────────

function DonorsTab({ adminKey, stats }) {
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    backend.get('/api/admin/donors', { headers: adminHeaders(adminKey) })
      .then((r) => setDonors(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [adminKey])

  const filtered = donors.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.email.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Donors', value: stats.total_donors, color: 'text-blue-400' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-amber-400' },
            { label: 'Completed', value: stats.completed, color: 'text-green-400' },
            { label: 'No Shows', value: stats.no_shows, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card !py-3">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search donors by name or email…"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
        />
      </div>

      {/* Donor list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-10 bg-slate-700 rounded-xl w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-slate-500 py-12">
          {query ? 'No donors match your search.' : 'No donors found.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DonorCard key={d.id} donor={d} adminKey={adminKey} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Account management tab ────────────────────────────────────────────────────

function AccountTab({ adminKey }) {
  const [donors, setDonors] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    backend.get('/api/admin/donors', { headers: adminHeaders(adminKey) })
      .then((r) => setDonors(r.data))
      .catch(() => {})
  }, [adminKey])

  const handleReset = async (e) => {
    e.preventDefault()
    if (!selectedId) return setError('Please select a donor.')
    if (newPwd.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    setError('')
    setResult(null)
    try {
      await backend.post(
        `/api/admin/donors/${selectedId}/reset-password`,
        { new_password: newPwd },
        { headers: adminHeaders(adminKey) },
      )
      setResult('Password reset successfully.')
      setNewPwd('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Reset failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="card space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-400" />
          Reset Donor Password
        </h3>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Select Donor</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
            >
              <option value="">— Choose a donor —</option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
          {result && (
            <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {result}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Reset Password
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          Coming Soon
        </h3>
        <p className="text-sm text-slate-500">Email change and account deactivation will be available in a future update.</p>
      </div>
    </div>
  )
}

// ── Admin login ───────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await backend.get('/api/admin/stats', { headers: adminHeaders(key) })
      sessionStorage.setItem(STORAGE_KEY, key)
      onLogin(key)
    } catch {
      setError('Invalid admin key. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Droplets className="w-7 h-7 text-blue-500" />
          <span className="text-xl font-bold">PlasmIQ</span>
          <span className="text-slate-500 text-sm ml-1">Admin</span>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-lg">Admin Access</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Admin Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Enter admin key"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !key}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Main admin page ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'donors', label: 'Donors', icon: Users },
  { id: 'account', label: 'Account Management', icon: KeyRound },
]

export default function Admin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(STORAGE_KEY) || '')
  const [tab, setTab] = useState('donors')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!adminKey) return
    backend.get('/api/admin/stats', { headers: adminHeaders(adminKey) })
      .then((r) => setStats(r.data))
      .catch(() => {})
  }, [adminKey])

  if (!adminKey) {
    return <AdminLogin onLogin={setAdminKey} />
  }

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setAdminKey('')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-slate-800 border-b border-slate-700 h-14 flex items-center px-4 md:px-6 gap-3">
        <Droplets className="w-5 h-5 text-blue-500 shrink-0" />
        <span className="font-bold">PlasmIQ</span>
        <Shield className="w-4 h-4 text-amber-400 ml-1 shrink-0" />
        <span className="text-slate-400 text-sm">Admin Panel</span>
        <div className="ml-auto flex items-center gap-3">
          {stats && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
              <BarChart3 className="w-3.5 h-3.5" />
              {stats.total_donors} donors
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 mb-6 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'donors' && <DonorsTab adminKey={adminKey} stats={stats} />}
        {tab === 'account' && <AccountTab adminKey={adminKey} />}
      </div>
    </div>
  )
}
