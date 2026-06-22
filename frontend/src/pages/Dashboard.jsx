import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { API_URL } from '../config/api'

const SECTION_HEADING_CLASS = 'text-2xl font-black uppercase leading-none tracking-normal text-white [text-shadow:2px_2px_0_#8b8b8b]'

function Spinner() {
  return (
    <span role="status" className="inline-flex shrink-0 items-center">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </span>
  )
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
  const navigate = useNavigate()
  const [searchCourseId, setSearchCourseId] = useState('')
  const [sections, setSections] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const userName = localStorage.getItem('seatstalker_user_name') || ''
  const watchlistHeadingRef = useRef(null)

  const loadWatchlist = useCallback(async (signal) => {
    if (!user?.token) return
    setWatchlistLoading(true)
    try {
      const response = await axios.get(`${API_URL}/watchlist`, {
        headers: { Authorization: `Bearer ${user.token}` },
        ...(signal && { signal }),
      })
      setWatchlist(response.data?.watchlist || [])
    } catch (requestError) {
      if (axios.isCancel(requestError)) return
      if (requestError?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setError(requestError?.response?.data?.detail || 'Failed to load your watchlist.')
    } finally {
      setWatchlistLoading(false)
    }
  }, [user?.token, navigate])

  useEffect(() => {
    const controller = new AbortController()
    loadWatchlist(controller.signal)
    return () => controller.abort()
  }, [loadWatchlist])

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
      if (requestError?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }
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
      await axios.post(
        `${API_URL}/watchlist`,
        { section_id: sectionId },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      )
      setMessage(`Now watching ${sectionId}.`)
      await loadWatchlist()
      setTimeout(() => watchlistHeadingRef.current?.focus(), 50)
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }
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
        headers: { Authorization: `Bearer ${user?.token}` },
        data: { section_id: sectionId },
      })
      setMessage(`Removed ${sectionId} from your watchlist.`)
      await loadWatchlist()
      setTimeout(() => watchlistHeadingRef.current?.focus(), 50)
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setError(requestError?.response?.data?.detail || 'Failed to remove section from watchlist.')
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-black/60 px-4 py-8 font-mono text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8 pb-10">
        <Navbar />

        <section aria-labelledby="dashboard-heading" className="border-4 border-[#8a8a8a] bg-[#171717] p-6 shadow-[10px_10px_0_#606060]">
          <h1 id="dashboard-heading" className={SECTION_HEADING_CLASS}>Dashboard</h1>
          <p className="mt-3 text-sm font-bold text-[#d8d8d8]">
            Logged in as{' '}
            <span className="break-all font-semibold">{user?.email}</span>
            {userName ? <span className="ml-2 text-[#bfbfbf]">({userName})</span> : null}
          </p>

          {message ? (
            <p role="status" aria-live="polite" className="mt-4 border-2 border-[#bfbfbf] bg-[#101010] px-3 py-2 text-xs font-bold text-white">
              [ OK ] {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" aria-live="assertive" className="mt-4 border-2 border-[#bfbfbf] bg-[#101010] px-3 py-2 text-xs font-bold text-white">
              [ ERR ] {error}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="watchlist-heading" className="border-4 border-[#8a8a8a] bg-[#171717] p-6 shadow-[10px_10px_0_#606060]">
          <h2
            id="watchlist-heading"
            ref={watchlistHeadingRef}
            tabIndex={-1}
            className={`${SECTION_HEADING_CLASS} outline-none`}
          >
            Your Watchlist
          </h2>
          <p className="mt-2 text-sm font-bold text-[#d8d8d8]">These sections are checked automatically by the poller.</p>

          <div className="mt-5 space-y-4">
            {watchlistLoading ? (
              <div className="flex items-center gap-3 border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-6 text-sm font-bold text-white shadow-[6px_6px_0_#5f5f5f]">
                <Spinner />
                <span>Loading your watchlist…</span>
              </div>
            ) : watchlist.length === 0 ? (
              <p className="border-4 border-dashed border-[#8f8f8f] bg-[#1f1f1f] px-4 py-6 text-sm font-bold text-[#d8d8d8]">
                Your watchlist is empty. Search a course below and click Watch to add sections.
              </p>
            ) : (
              watchlist.map((entry) => (
                <article
                  key={`${entry.section_id}-${entry.added_at}`}
                  aria-label={`Watching ${entry.section_id}`}
                  className="flex flex-col gap-4 border-4 border-[#8f8f8f] bg-[#1f1f1f] p-4 shadow-[6px_6px_0_#5f5f5f] md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-white">{entry.section_id}</h3>
                    <p className="text-sm font-bold text-[#d8d8d8]">Course: {entry.course_id}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(entry.section_id)}
                    disabled={!!actionLoadingId}
                    aria-busy={actionLoadingId === entry.section_id}
                    aria-label={`Remove ${entry.section_id} from watchlist`}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 border-4 border-[#f5f5f5] bg-white px-4 py-3 font-black text-[#111111] shadow-[4px_4px_0_#8f8f8f] transition hover:-translate-y-0.5 hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoadingId === entry.section_id ? <Spinner /> : null}
                    Remove
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="search-heading" className="border-4 border-[#8a8a8a] bg-[#171717] p-6 shadow-[10px_10px_0_#606060]">
          <h2 id="search-heading" className={SECTION_HEADING_CLASS}>Course Search</h2>
          <p className="mt-2 text-sm font-bold text-[#d8d8d8]">Search a course ID like CMSC131 to see all available sections.</p>

          <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={searchCourseId}
              onChange={(event) => setSearchCourseId(event.target.value)}
              className="flex-1 border-4 border-[#8f8f8f] bg-[#1f1f1f] px-4 py-3 text-base font-bold text-white shadow-[6px_6px_0_#5f5f5f] outline-none placeholder:text-[#b8b8b8] focus:border-white focus:ring-4 focus:ring-white/20"
              placeholder="CMSC131"
              aria-label="Course ID"
              autoComplete="off"
              required
            />
            <button
              type="submit"
              disabled={searchLoading}
              aria-busy={searchLoading}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 border-4 border-[#f5f5f5] bg-white px-5 py-3 font-black text-[#111111] shadow-[6px_6px_0_#8f8f8f] transition hover:-translate-y-0.5 hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searchLoading ? <Spinner /> : null}
              {searchLoading ? 'Searching…' : 'Search'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {sections.length === 0 && !searchLoading ? (
              <p className="border-4 border-dashed border-[#8f8f8f] bg-[#1f1f1f] px-4 py-6 text-sm font-bold text-[#d8d8d8]">
                Search for a course to view its sections.
              </p>
            ) : null}

            {sections.map((section) => (
              <article
                key={section.section_id}
                aria-label={`Section ${section.section_id}`}
                className="border-4 border-[#8f8f8f] bg-[#1f1f1f] p-4 shadow-[6px_6px_0_#5f5f5f]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-white">{section.section_id}</h3>
                    <p className="mt-1 text-sm font-bold text-[#d8d8d8]">
                      <span className="text-white">Instructors:</span>{' '}
                      <span className="break-words">
                        {Array.isArray(section.instructors) && section.instructors.length > 0
                          ? section.instructors.join(', ')
                          : 'TBA'}
                      </span>
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#d8d8d8]">
                      <span className="text-white">Meeting:</span> {formatMeeting(section)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#d8d8d8]">
                      <span className="text-white">Seats:</span> {section.seats ?? 'N/A'} |{' '}
                      <span className="text-white">Open:</span> {section.open_seats ?? 'N/A'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleWatch(section.section_id)}
                    disabled={!!actionLoadingId}
                    aria-busy={actionLoadingId === section.section_id}
                    aria-label={`Watch section ${section.section_id}`}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 border-4 border-[#f5f5f5] bg-white px-4 py-3 font-black text-[#111111] shadow-[4px_4px_0_#8f8f8f] transition hover:-translate-y-0.5 hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
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
