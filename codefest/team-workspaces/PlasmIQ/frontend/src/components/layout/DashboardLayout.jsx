import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, History,
  Gift, MapPin, LogOut, Zap, MessageSquare, BookOpen
} from 'lucide-react'
import logo from '../../logo.png'
import { useAuth } from '../../context/AuthContext'
import AIConcierge from '../chat/AIConcierge'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/book', label: 'Book Appointment', icon: BookOpen },
  { to: '/dashboard/find-slot', label: 'Find Best Slot', icon: Zap },
  { to: '/dashboard/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/dashboard/history', label: 'History', icon: History },
  { to: '/dashboard/rewards', label: 'Rewards', icon: Gift },
  { to: '/centers', label: 'Centers Map', icon: MapPin },
]

export default function DashboardLayout({ children }) {
  const { donor, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = donor?.name
    ? donor.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'D'

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-800 border-r border-slate-700 shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-700">
          <img src={logo} alt="PlasmIQ" className="h-8 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Points badge */}
        <div className="mx-3 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <div className="text-xs text-slate-400 mb-0.5">Your Points</div>
          <div className="text-xl font-bold text-amber-400">{(donor?.points || 0).toLocaleString()}</div>
        </div>

        {/* Profile + Logout */}
        <div className="px-3 pb-4 border-t border-slate-700 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate">{donor?.name}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors text-sm w-full px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Mobile topbar */}
          <div className="md:hidden sticky top-0 z-40 bg-slate-800 border-b border-slate-700 h-14 flex items-center justify-between px-4">
            <div className="flex items-center">
              <img src={logo} alt="PlasmIQ" className="h-7 w-auto" />
            </div>
            <div className="text-sm text-amber-400 font-semibold">{(donor?.points || 0).toLocaleString()} pts</div>
          </div>

          <main className="p-4 md:p-6 lg:p-8">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-800 border-t border-slate-700 flex items-center justify-around h-16 px-2 z-40">
            {navItems.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label.split(' ')[0]}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* AI Concierge sidebar — fixed right panel on lg+ */}
        <div className="hidden lg:flex flex-col w-80 bg-slate-800 border-l border-slate-700 shrink-0">
          <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-700">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-sm">PlasmIQ Assistant</span>
            <span className="ml-auto">
              <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse-slow" />
            </span>
          </div>
          <AIConcierge />
        </div>
      </div>
    </div>
  )
}
