import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto mt-20 max-w-2xl rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-3 text-slate-700">Logged in as <span className="font-semibold">{user?.email}</span>.</p>
        <p className="mt-2 text-slate-600">This route is protected and only accessible while authenticated.</p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-md bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-700"
        >
          Logout
        </button>
      </div>
    </main>
  )
}

export default DashboardPage
