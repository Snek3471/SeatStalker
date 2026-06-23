import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import SectionCard from '../components/ui/SectionCard'
import { API_URL } from '../config/api'

const SECTION_HEADING_CLASS = 'text-balance text-2xl font-black uppercase leading-none tracking-normal text-white [text-shadow:2px_2px_0_#8b8b8b]'

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
      setError(requestError?.response?.data?.detail || 'Failed to load your watchlist. Try refreshing.')
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
        setError('No sections found. Double-check the course ID (like CMSC131).')
      }
    } catch (requestError) {
      setSections([])
      if (requestError?.response?.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setError(requestError?.response?.data?.detail || 'Course search failed. Double-check the course ID.')
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
      setError(requestError?.response?.data?.detail || "Couldn't add that section. Try again.")
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
      setError(requestError?.response?.data?.detail || "Couldn't remove that section. Try again.")
    } finally {
      setActionLoadingId('')
    }
  }

  return (
    <main className="min-h-dvh overflow-y-auto bg-black px-4 py-12 font-mono text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-10 pb-6">
        <Navbar />

        <SectionCard as="section" aria-labelledby="dashboard-heading" className="shadow-pixel-xl sm:p-8">
          <h1 id="dashboard-heading" className={SECTION_HEADING_CLASS}>Dashboard</h1>
          <p className="mt-3 text-sm font-bold text-ss-text">
            Logged in as{' '}
            <span className="break-all font-semibold">{user?.email}</span>
            {userName ? <span className="ml-2 text-ss-muted">({userName})</span> : null}
          </p>

          {message ? (
            <p role="status" aria-live="polite" className="mt-4 border-2 border-ss-muted bg-ss-deep px-3 py-2 text-xs font-bold text-white">
              [ OK ] {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" aria-live="assertive" className="mt-4 border-2 border-ss-muted bg-ss-deep px-3 py-2 text-xs font-bold text-white">
              [ ERR ] {error}
            </p>
          ) : null}
        </SectionCard>

        <SectionCard as="section" aria-labelledby="watchlist-heading" className="shadow-pixel-xl sm:p-7">
          <h2
            id="watchlist-heading"
            ref={watchlistHeadingRef}
            tabIndex={-1}
            className={`${SECTION_HEADING_CLASS} outline-none`}
          >
            Your Watchlist
          </h2>
          <p className="mt-3 text-sm font-bold text-ss-text">Checked every 60 seconds. You get one email when a seat opens.</p>

          <div className="mt-6 space-y-4">
            {watchlistLoading ? (
              <div className="flex items-center gap-3 border-4 border-ss-rule bg-ss-inset px-4 py-6 text-sm font-bold text-white shadow-pixel-md">
                <Spinner />
                <span>Loading your watchlist…</span>
              </div>
            ) : watchlist.length === 0 ? (
              <p className="border-4 border-dashed border-ss-rule bg-ss-inset px-4 py-6 text-sm font-bold text-ss-text">
                Nothing on watch. Search a course below and hit Watch to start tracking.
              </p>
            ) : (
              watchlist.map((entry) => (
                <article
                  key={`${entry.section_id}-${entry.added_at}`}
                  aria-label={`Watching ${entry.section_id}`}
                  className="flex flex-col gap-4 border-4 border-ss-rule bg-ss-inset p-4 sm:p-5 shadow-pixel-md md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-white">{entry.section_id}</h3>
                    <p className="text-sm font-bold text-ss-text">Course: {entry.course_id}</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    shrink
                    onClick={() => handleRemove(entry.section_id)}
                    disabled={!!actionLoadingId}
                    aria-busy={actionLoadingId === entry.section_id}
                    aria-label={`Remove ${entry.section_id} from watchlist`}
                  >
                    {actionLoadingId === entry.section_id ? <Spinner /> : null}
                    Remove
                  </Button>
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard as="section" aria-labelledby="search-heading" className="shadow-pixel-xl">
          <h2 id="search-heading" className={SECTION_HEADING_CLASS}>Course Search</h2>
          <p className="mt-3 text-sm font-bold text-ss-text">Search a course ID like CMSC131 to see all available sections.</p>

          <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 md:flex-row">
            <FormInput
              aria-label="Course ID"
              className="flex-1"
              placeholder="CMSC131"
              value={searchCourseId}
              onChange={(event) => setSearchCourseId(event.target.value)}
              autoComplete="off"
              required
            />
            <Button
              type="submit"
              disabled={searchLoading}
              aria-busy={searchLoading}
              className="px-5"
            >
              {searchLoading ? <Spinner /> : null}
              {searchLoading ? 'Searching…' : 'Search'}
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            {sections.length === 0 && !searchLoading ? (
              <p className="border-4 border-dashed border-ss-rule bg-ss-inset px-4 py-6 text-sm font-bold text-ss-text">
                Search for a course to view its sections.
              </p>
            ) : null}

            {sections.map((section) => (
              <article
                key={section.section_id}
                aria-label={`Section ${section.section_id}`}
                className="border-4 border-ss-rule bg-ss-inset p-4 sm:p-5 shadow-pixel-md"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-white">{section.section_id}</h3>
                    <p className="mt-1.5 text-sm font-bold text-ss-text">
                      <span className="text-white">Instructors:</span>{' '}
                      <span className="break-words">
                        {Array.isArray(section.instructors) && section.instructors.length > 0
                          ? section.instructors.join(', ')
                          : 'TBA'}
                      </span>
                    </p>
                    <p className="mt-1 text-sm font-bold text-ss-text">
                      <span className="text-white">Meeting:</span> {formatMeeting(section)}
                      <span className="mx-2 text-ss-rule">·</span>
                      <span className="text-white">Seats:</span> {section.seats ?? 'N/A'}
                      <span className="mx-1.5 text-ss-rule">·</span>
                      <span className="text-white">Open:</span> {section.open_seats ?? 'N/A'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    shrink
                    onClick={() => handleWatch(section.section_id)}
                    disabled={!!actionLoadingId}
                    aria-busy={actionLoadingId === section.section_id}
                    aria-label={`Watch section ${section.section_id}`}
                  >
                    {actionLoadingId === section.section_id ? <Spinner /> : null}
                    Watch
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <footer className="border-t-4 border-ss-rule bg-ss-surface px-6 py-6 text-center text-xs font-bold text-ss-muted font-mono">
        <p>
          Bugs? Feedback?{' '}
          <span className="text-white" title="Discord username: .snek_">Discord: .snek_</span>
          <span className="mx-2">·</span>
          <a
            href="mailto:harshithsarma3471@gmail.com"
            className="text-white underline underline-offset-2 hover:text-ss-muted"
          >
            harshithsarma3471@gmail.com
          </a>
          <span className="ml-2 text-ss-border">(Discord preferred)</span>
        </p>
      </footer>
    </main>
  )
}

export default Dashboard
