import { Link } from 'react-router-dom'
import { Droplets, Zap, MapPin, Clock, TrendingUp, Shield, ChevronRight, Activity } from 'lucide-react'
import logo from '../logo.png'

const stats = [
  { label: 'Donations Today', value: '1,284', color: 'text-blue-400' },
  { label: 'Centers Open Now', value: '6', color: 'text-green-400' },
  { label: 'Avg Wait Time', value: '11 min', color: 'text-amber-400' },
  { label: 'Lives Impacted', value: '4.2M+', color: 'text-purple-400' },
]

const steps = [
  {
    icon: MapPin,
    title: 'Share Your Location',
    desc: 'PlasmIQ pulls real-time traffic, weather, and center wait times near you.',
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    icon: Zap,
    title: 'Get a Smart Score',
    desc: 'Our Friction Score ranks every center by travel time, wait time, and conditions — so you always pick the best slot.',
    color: 'bg-amber-500/20 text-amber-400',
  },
  {
    icon: Droplets,
    title: 'Donate & Earn Rewards',
    desc: 'Book in one tap, track your donation streak, and earn points redeemable for gift cards.',
    color: 'bg-green-500/20 text-green-400',
  },
]

const features = [
  { icon: Activity, title: 'Live Wait Times', desc: 'Real-time center capacity and queue data.' },
  { icon: Clock, title: 'Smart Scheduling', desc: 'AI picks the lowest-friction slot for your schedule.' },
  { icon: TrendingUp, title: 'Donation Streaks', desc: 'Track progress and hit milestone rewards.' },
  { icon: Shield, title: 'Health Pre-Screening', desc: 'Quick AI check-in before every appointment.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="PlasmIQ" className="h-8 w-auto" />
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-slate-400">
            <Link to="/centers" className="hover:text-white transition-colors">Find Centers</Link>
            <Link to="/auth/login" className="hover:text-white transition-colors">Log In</Link>
            <Link
              to="/admin"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
            <Link
              to="/auth/register"
              className="btn-primary !py-2 !px-4 text-sm"
            >
              Get Started
            </Link>
          </div>
          <div className="sm:hidden flex items-center gap-3">
            <Link to="/auth/login" className="text-sm text-slate-300 hover:text-white">Log In</Link>
            <Link to="/auth/register" className="btn-primary !py-2 !px-4 text-sm">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 text-blue-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Real-World Data · AI-Powered · CSL Plasma
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Donate Smarter.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
              Save Lives.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            PlasmIQ uses real-time traffic, weather, and center data to find you the
            perfect donation slot — so you spend less time waiting and more time living.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/register" className="btn-primary flex items-center justify-center gap-2 text-base">
              Start Donating
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/centers" className="btn-secondary flex items-center justify-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              Find a Center
            </Link>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="border-y border-slate-800 bg-slate-800/50 py-6 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs sm:text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How PlasmIQ Works</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Three steps between you and the perfect donation window.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="card relative">
                <div className="absolute -top-4 -left-4 w-9 h-9 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-sm font-bold text-slate-300">
                  {i + 1}
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${step.color}`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-4 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need</h2>
            <p className="text-slate-400">Built for donors who want to make every trip count.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card hover:border-blue-600/50 transition-colors">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="font-semibold mb-1">{f.title}</h4>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card bg-gradient-to-br from-blue-900/50 to-slate-800 border-blue-700/50">
            <Droplets className="w-12 h-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Ready to make a difference?</h2>
            <p className="text-slate-400 mb-8">
              Join thousands of donors already using PlasmIQ to give plasma smarter.
            </p>
            <Link to="/auth/register" className="btn-primary inline-flex items-center gap-2">
              Create Your Free Account
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center mb-2">
          <img src={logo} alt="PlasmIQ" className="h-5 w-auto opacity-70" />
        </div>
        <p>Built for CSL Plasma · Saving lives with real-world data and AI</p>
      </footer>
    </div>
  )
}
