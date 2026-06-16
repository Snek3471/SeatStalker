import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

const USER_NAME_STORAGE_KEY = 'seatstalker_user_name'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const storedName = localStorage.getItem(USER_NAME_STORAGE_KEY) || ''

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="rounded-2xl border border-white/30 bg-white px-6 py-4 shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xl font-extrabold tracking-wide text-[#E03a3e]">UMD SeatAlert</p>
          <p className="mt-1 text-sm text-slate-500">Track seats before they disappear.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{storedName || user?.email || 'Student'}</p>
            <p className="text-xs text-slate-500">Logged in</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-[#E03a3e] px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
