import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

const API_URL = import.meta.env.VITE_API_URL
const UMD_COURSES_URL = 'https://api.umd.io/v1/courses'

function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
}

function formatMeeting(section) {
  const meetings = section?.meetings || section?.days_info
  const meeting = Array.isArray(meetings) ? meetings[0] : null
  if (!meeting) return 'TBA'

  const days = meeting.days || 'TBA'
  const startTime = meeting.start_time || 'TBA'
  return `${days} @ ${startTime}`
}

function Dashboard() {
  const { user } = useAuth()
  const [searchCourseId, setSearchCourseId] = useState('')
  const [sections, setSections] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const userName = useMemo(() => localStorage.getItem('seatstalker_user_name') || '', [])

  const loadWatchlist = async () => {
    if (!user?.email) return

    setWatchlistLoading(true)
    try {
      const response = await axios.get(`${API_URL}/watchlist/${encodeURIComponent(user.email)}`)
      setWatchlist(response.data?.watchlist || [])
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to load your watchlist.')
    } finally {
      setWatchlistLoading(false)
    }
  }

  useEffect(() => {
    loadWatchlist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email])

  const handleSearch = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setSearchLoading(true)

    try {
      const courseId = searchCourseId.trim().toUpperCase()
      const response = await axios.get(`${API_URL}/courses/${courseId}/sections`)
      const payload = response.data
      const nextSections = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.sections)
          ? payload.sections
          : []
      setSections(nextSections)
      if (nextSections.length === 0) {
        setMessage('No sections found for that course.')
      }
    } catch (requestError) {
      setSections([])
      setError(requestError?.response?.data?.detail || 'Unable to search for that course right now.')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleWatch = async (sectionId) => {
    setError('')
    setMessage('')
    setActionLoadingId(sectionId)

    try {
      await axios.post(`${API_URL}/watchlist`, {
        email: user?.email,
        section_id: sectionId,
      })
      setMessage(`Now watching ${sectionId}.`)
      await loadWatchlist()
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to add section to watchlist.')
    } finally {
      setActionLoadingId('')
    }
  }

  const handleRemove = async (sectionId) => {
    setError('')
    setMessage('')
    setActionLoadingId(sectionId)

    try {
      await axios.delete(`${API_URL}/watchlist`, {
        data: {
          email: user?.email,
          section_id: sectionId,
        },
      })
      setMessage(`Removed ${sectionId} from your watchlist.`)
      await loadWatchlist()
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to remove section from watchlist.')
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <main className="min-h-screen bg-[#E03a3e] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Navbar />

        <section className="rounded-2xl border border-white/30 bg-white p-6 shadow-2xl">
          <h1 className="text-3xl font-bold text-[#E03a3e]">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-700">
            Logged in as <span className="font-semibold">{user?.email}</span>
            {userName ? <span className="ml-2 text-slate-500">({userName})</span> : null}
          </p>

          {message ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="rounded-2xl border border-white/30 bg-white p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-[#E03a3e]">Your Watchlist</h2>
          <p className="mt-2 text-sm text-slate-600">These sections are checked automatically by the poller.</p>

          <div className="mt-5 space-y-4">
            {watchlistLoading ? (
              <div className="flex items-center gap-3 rounded-md border border-slate-200 px-4 py-6 text-slate-600">
                <Spinner />
                Loading your watchlist...
              </div>
            ) : watchlist.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">
                Your watchlist is empty. Search a course above and click Watch to add sections.
              </p>
            ) : (
              watchlist.map((entry) => (
                <article key={`${entry.section_id}-${entry.added_at}`} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{entry.section_id}</h3>
                    <p className="text-sm text-slate-600">Course: {entry.course_id}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(entry.section_id)}
                    disabled={actionLoadingId === entry.section_id}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E03a3e] px-4 py-2 font-semibold text-[#E03a3e] transition hover:bg-[#E03a3e] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoadingId === entry.section_id ? <Spinner /> : null}
                    Remove
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/30 bg-white p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-[#E03a3e]">Course Search</h2>
          <p className="mt-2 text-sm text-slate-600">Search a course ID like CMSC131 to see all available sections.</p>

          <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={searchCourseId}
              onChange={(event) => setSearchCourseId(event.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-4 py-3 outline-none ring-[#E03a3e]/25 focus:ring"
              placeholder="CMSC131"
              aria-label="Course ID"
              required
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#E03a3e] px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searchLoading ? <Spinner /> : null}
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {sections.length === 0 && !searchLoading ? (
              <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">
                Search for a course to view its sections.
              </p>
            ) : null}

            {sections.map((section) => (
              <article key={section.section_id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{section.section_id}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">Instructors:</span>{' '}
                      {Array.isArray(section.instructors) && section.instructors.length > 0
                        ? section.instructors.join(', ')
                        : 'TBA'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">Meeting:</span> {formatMeeting(section)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">Seats:</span> {section.seats ?? 'N/A'} |{' '}
                      <span className="font-semibold text-slate-800">Open:</span> {section.open_seats ?? 'N/A'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleWatch(section.section_id)}
                    disabled={actionLoadingId === section.section_id}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#E03a3e] px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoadingId === section.section_id ? <Spinner /> : null}
                    Watch
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Dashboard
