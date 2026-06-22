import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import PixelCursorTrail from './components/PixelCursorTrail'
import { FallingPattern } from './components/FallingPattern'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'

function App() {
  return (
    <>
      <div className="fixed inset-0 -z-10">
        <FallingPattern color="white" backgroundColor="black" />
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <PixelCursorTrail />
    </>
  )
}

export default App
