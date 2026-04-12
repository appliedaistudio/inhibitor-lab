import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Bot, User, Loader2, MapPin, Clock,
  Navigation, CloudSun, Zap, X, Check,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sendChatMessage, saveChatHistory, loadChatHistory } from '../../api/agent'
import WaitTimeBadge from '../ui/WaitTimeBadge'
import FrictionScoreBadge from '../ui/FrictionScoreBadge'

const PLACEHOLDER_RESPONSES = [
  "I can look for nearby centers and times that fit your preferences. Want me to suggest options?",
  "Thanks for your patience — when the server is back, I'll show live options with travel and weather at a glance.",
  "For eligibility and medical screening, staff at the center will help — I can still help with scheduling here.",
  "Great — your appointment flow is ready. Stay hydrated and follow any prep instructions from your center. See you there!",
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ── Booking Ticket — mirrors the Appointments page card exactly ───────────────
function BookingTicket({ ticket }) {
  const snap = ticket.rwd_snapshot || {}
  return (
    <div className="mt-2 card space-y-4 max-w-[340px] border border-green-500/30">
      {/* Status + title */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-blue">scheduled</span>
            <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">✓ Confirmed</span>
          </div>
          <h3 className="font-semibold text-base">{ticket.center_name}</h3>
          {ticket.center_address && (
            <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {ticket.center_address}
            </div>
          )}
        </div>
      </div>

      {/* Date / time */}
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Clock className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-medium">{formatDateTime(ticket.slot_time)}</span>
      </div>

      {/* RWD Snapshot — only shown when data is present */}
      {(snap.travel_time_mins != null || snap.wait_time_mins != null || snap.weather || snap.friction_score != null) && (
        <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600">
          <div className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Conditions at Time of Booking
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {snap.travel_time_mins != null && (
              <span className="flex items-center gap-1 text-slate-300">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                {snap.travel_time_mins} min drive
              </span>
            )}
            {snap.wait_time_mins != null && (
              <WaitTimeBadge minutes={snap.wait_time_mins} />
            )}
            {snap.weather && (
              <span className="flex items-center gap-1 text-slate-300">
                <CloudSun className="w-3.5 h-3.5 text-sky-400" />
                {snap.weather}
              </span>
            )}
            {snap.friction_score != null && (
              <FrictionScoreBadge score={snap.friction_score} />
            )}
          </div>
        </div>
      )}

      {/* Points earned */}
      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-300 font-semibold">
          +{ticket.points_earned} pts earned · ~{ticket.approximate_points?.toLocaleString()} pts total
        </p>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-slate-500 text-center -mt-1">
        ID: {ticket.appointment_id} · View in Appointments tab
      </p>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// ── Single message ────────────────────────────────────────────────────────────
function Message({ msg }) {
  const isBot = msg.role === 'assistant'
  return (
    <div className={`flex items-end gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isBot ? 'bg-blue-600' : 'bg-slate-600'}`}>
        {isBot
          ? <Bot className="w-3.5 h-3.5 text-white" />
          : <User className="w-3.5 h-3.5 text-white" />
        }
      </div>
      <div className="flex flex-col gap-1 max-w-[82%]">
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isBot
              ? 'bg-slate-700 text-white rounded-bl-sm'
              : 'bg-blue-600 text-white rounded-br-sm'
          }`}
        >
          {msg.content}
        </div>
        {msg.booking_ticket && <BookingTicket ticket={msg.booking_ticket} />}
      </div>
    </div>
  )
}

// ── Pending booking banner ────────────────────────────────────────────────────
function PendingBanner({ pending, onConfirm, onDecline, loading }) {
  if (!pending) return null
  const when = pending.slot_time
    ? new Date(pending.slot_time).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : ''
  return (
    <div className="mx-4 mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-xs text-amber-300 font-semibold mb-0.5">Pending confirmation</p>
      <p className="text-sm text-white font-medium">{pending.center_name}</p>
      {when && <p className="text-xs text-slate-300">{when}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Confirm Booking
        </button>
        <button
          onClick={onDecline}
          disabled={loading}
          className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" /> No thanks
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AIConcierge() {
  const { donor, refreshDonor } = useAuth()
  const firstName = donor?.name?.split(' ')[0] || 'there'

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      ts: new Date().toISOString(),
      content: `Hi ${firstName}! 👋 I'm your PlasmIQ Assistant. I can suggest appointment times that maximize your booking rewards (+100 points per booking), answer general questions about plasma donation, and book a time after you confirm — without collecting medical or regulatory details in chat. How can I help today?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [responseIndex, setResponseIndex] = useState(0)
  const [pendingBooking, setPendingBooking] = useState(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef(null)
  const saveTimer = useRef(null)

  // ── Load persisted history on mount ──────────────────────────────────────
  useEffect(() => {
    if (!donor?.id || historyLoaded) return
    loadChatHistory(donor.id).then((stored) => {
      if (stored.length > 0) {
        setMessages([
          {
            role: 'assistant',
            ts: new Date().toISOString(),
            content: `Welcome back, ${firstName}! Your previous conversation is loaded. How can I help you today?`,
          },
          ...stored.map((m) => ({ role: m.role, content: m.content, ts: m.ts })),
        ])
      }
      setHistoryLoaded(true)
    })
  }, [donor?.id, firstName, historyLoaded])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Debounced save to backend ─────────────────────────────────────────────
  const scheduleSave = useCallback((msgs) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (donor?.id) saveChatHistory(donor.id, msgs)
    }, 2000)
  }, [donor?.id])

  // ── Core send logic ───────────────────────────────────────────────────────
  const doSend = useCallback(async (userMessage) => {
    if (!userMessage.trim() || loading) return
    const ts = new Date().toISOString()
    const userMsg = { role: 'user', content: userMessage.trim(), ts }

    setMessages((prev) => {
      const next = [...prev, userMsg]
      scheduleSave(next)
      return next
    })
    setLoading(true)

    try {
      // Build history (all previous turns except the welcome greeting)
      const historyForApi = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map(({ role, content }) => ({ role, content }))

      const result = await sendChatMessage({
        userId: donor?.id,
        message: userMessage.trim(),
        pendingBooking,
        history: historyForApi,
      })

      const reply = result.message || result.reply || 'I could not process that. Please try again.'
      const ticket = result.data?.booking_ticket ?? null

      if (result.action === 'booked' || result.action === 'cancelled') {
        setPendingBooking(null)
      } else if (result.data && Object.prototype.hasOwnProperty.call(result.data, 'pending_booking')) {
        setPendingBooking(result.data.pending_booking)
      }

      if (result.action === 'booked' && refreshDonor) refreshDonor()

      const botMsg = {
        role: 'assistant',
        content: reply,
        ts: new Date().toISOString(),
        booking_ticket: ticket,
      }
      setMessages((prev) => {
        const next = [...prev, botMsg]
        scheduleSave(next)
        return next
      })
    } catch {
      await new Promise((r) => setTimeout(r, 800))
      const reply = PLACEHOLDER_RESPONSES[responseIndex % PLACEHOLDER_RESPONSES.length]
      setResponseIndex((i) => i + 1)
      setMessages((prev) => {
        const next = [...prev, { role: 'assistant', content: reply, ts: new Date().toISOString() }]
        scheduleSave(next)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [loading, messages, pendingBooking, donor?.id, refreshDonor, responseIndex, scheduleSave])

  const sendMessage = () => {
    const msg = input.trim()
    setInput('')
    doSend(msg)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleConfirm = () => doSend('confirm')
  const handleDecline = () => doSend('no thanks')

  const isFirstMessage = messages.length <= 1

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Pending booking confirmation banner */}
      {!loading && pendingBooking && (
        <PendingBanner
          pending={pendingBooking}
          onConfirm={handleConfirm}
          onDecline={handleDecline}
          loading={loading}
        />
      )}

      {/* Quick prompts — only on first message */}
      {isFirstMessage && !pendingBooking && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {[
            'What should I expect when donating?',
            'Find best slot with rewards',
            'Book an appointment',
          ].map((p) => (
            <button
              key={p}
              onClick={() => doSend(p)}
              className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-full px-3 py-1.5 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-700">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingBooking ? 'Reply "confirm", pick 1–3, or say "no thanks"…' : 'Ask me anything…'}
            rows={1}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none max-h-24 leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          AI Concierge · Powered by GPT-4o
        </p>
      </div>
    </div>
  )
}
