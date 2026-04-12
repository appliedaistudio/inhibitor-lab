/**
 * Chat API — uses the same `backend` axios instance as the rest of the app
 * so the JWT interceptor always fires and donor_id is consistent with what
 * /api/appointments queries by.
 */
import backend from './backend'

/**
 * Send a message to the AI concierge.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.message
 * @param {object|null} params.pendingBooking
 * @param {Array<{role:string,content:string}>} params.history
 */
export const sendChatMessage = async ({ userId, message, pendingBooking, history }) => {
  const { data } = await backend.post('/api/chat/send', {
    donor_id: userId,
    message,
    pending_booking: pendingBooking ?? null,
    history: (history ?? []).map(({ role, content }) => ({ role, content })),
  })
  return data // { message, action, data }
}

/**
 * Persist chat history to the backend (fire-and-forget).
 */
export const saveChatHistory = async (userId, messages) => {
  try {
    await backend.post(`/api/chat/history/${userId}`, {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ts: m.ts ?? new Date().toISOString(),
      })),
    })
  } catch {
    // non-critical, swallow
  }
}

/**
 * Load persisted chat history for a donor.
 */
export const loadChatHistory = async (userId) => {
  try {
    const { data } = await backend.get(`/api/chat/history/${userId}`)
    return data.messages ?? []
  } catch {
    return []
  }
}

export default backend
