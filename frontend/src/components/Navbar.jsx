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
    <header className="border-4 border-[#8a8a8a] bg-[#171717] px-6 py-4 shadow-[10px_10px_0_#606060]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-2xl font-black uppercase leading-none tracking-normal text-white [text-shadow:2px_2px_0_#8b8b8b]">
            SEAT STALKER
          </p>
          <p className="mt-1 text-sm font-bold text-[#d8d8d8]">Track seats before they disappear.</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-2 text-left shadow-[4px_4px_0_#5f5f5f] sm:text-right">
            <p className="text-sm font-black text-white">{storedName || user?.email || 'Student'}</p>
            <p className="text-xs font-bold text-[#bfbfbf]">Logged in</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="border-4 border-[#f5f5f5] bg-white px-4 py-2 font-black text-[#111111] shadow-[4px_4px_0_#8f8f8f] transition hover:-translate-y-0.5 hover:bg-[#dedede]"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
