import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'

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
    <header className="border-4 border-ss-border bg-ss-surface px-6 py-4 shadow-pixel-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-2xl font-black uppercase leading-none tracking-normal text-white [text-shadow:2px_2px_0_#8b8b8b]">
            SEAT STALKER
          </p>
          <p className="mt-1 text-sm font-bold text-ss-text">Track seats before they disappear.</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 border-4 border-ss-rule bg-ss-inset px-4 py-2 text-left shadow-pixel-sm sm:max-w-[14rem] sm:text-right">
            <p className="truncate text-sm font-black text-white">{storedName || user?.email || 'Student'}</p>
            <p className="text-xs font-bold text-ss-muted">Logged in</p>
          </div>

          <Button type="button" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
