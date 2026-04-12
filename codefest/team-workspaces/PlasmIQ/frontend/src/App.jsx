import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Centers from './pages/Centers'
import Dashboard from './pages/Dashboard'
import FindSlot from './pages/FindSlot'
import ManualBook from './pages/ManualBook'
import BookAppointment from './pages/BookAppointment'
import Appointments from './pages/Appointments'
import History from './pages/History'
import Rewards from './pages/Rewards'
import Admin from './pages/Admin'

function ProtectedRoute({ children }) {
  const { donor } = useAuth()
  if (!donor) return <Navigate to="/auth/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { donor } = useAuth()
  if (donor) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/centers" element={<Centers />} />

      {/* Auth — redirect to dashboard if already logged in */}
      <Route path="/auth/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/auth/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Protected dashboard routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/book" element={<ProtectedRoute><ManualBook /></ProtectedRoute>} />
      <Route path="/dashboard/find-slot" element={<ProtectedRoute><FindSlot /></ProtectedRoute>} />
      <Route path="/dashboard/book/:centerId" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
      <Route path="/dashboard/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
      <Route path="/dashboard/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/dashboard/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<Admin />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
