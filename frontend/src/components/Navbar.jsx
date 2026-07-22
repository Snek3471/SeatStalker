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
    <header className="border-4 border-b-[6px] border-ss-border bg-ss-surface px-5 py-5 shadow-pixel-xl">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="pf-h3 uppercase text-white [text-shadow:2px_2px_0_#606060]">
            SEAT<span className="text-ss-border">_</span>STALKER
          </p>
          <p className="mt-2 pf-tiny text-ss-muted">Track seats before they disappear.</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 border-4 border-ss-rule bg-ss-inset px-4 py-2 text-left shadow-pixel-sm sm:max-w-[15rem] sm:text-right">
            <p className="truncate pf-body-sm text-white">{storedName || user?.email || 'Student'}</p>
            <p className="mt-1 pf-label uppercase text-ss-muted">Logged in</p>
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
