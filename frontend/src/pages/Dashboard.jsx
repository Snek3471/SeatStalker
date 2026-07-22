import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import SectionCard from '../components/ui/SectionCard'
import { API_URL } from '../config/api'

const SECTION_HEADING_CLASS = 'pf-h2 text-balance uppercase text-white [text-shadow:2px_2px_0_#606060]'

function Spinner() {
  return (
    <span role="status" className="inline-flex shrink-0 items-center">
      {/* Stepped square loader — reads as a pixel-game spinner, not a smooth ring. */}
      <span
        className="h-4 w-4 animate-spin border-2 border-current border-t-transparent [animation-timing-function:steps(8)]"
        aria-hidden="true"
      />
      <span className="sr-only">Loading…</span>
    </span>
  )
}

function SeatBadge({ open, total }) {
  const openNum = typeof open === 'number' ? open : null
  const hasOpen = openNum !== null && openNum > 0
  return (
    <div
      className={[
        'shrink-0 border-4 px-3 py-2 text-center shadow-pixel-btn-sm',
        hasOpen ? 'border-white bg-white text-ss-btn-fg' : 'border-ss-rule bg-ss-deep text-ss-muted',
      ].join(' ')}
    >
      <p className="pf-label uppercase">Open</p>
      <p className="mt-1.5 pf-h3">{openNum !== null ? openNum : '—'}</p>
      <p className="mt-1.5 pf-tiny">of {typeof total === 'number' ? total : '—'}</p>
    </div>
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
    <main className="min-h-dvh overflow-y-auto bg-black px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-10 pb-6">
        <Navbar />

        <SectionCard as="section" aria-labelledby="dashboard-heading" className="shadow-pixel-xl sm:p-8">
          <h1 id="dashboard-heading" className={SECTION_HEADING_CLASS}>Dashboard</h1>
          <p className="mt-4 pf-body-sm text-ss-text">
            Logged in as{' '}
            <span className="break-all text-white">{user?.email}</span>
            {userName ? <span className="ml-2 text-ss-muted">({userName})</span> : null}
          </p>

          {message ? (
            <p role="status" aria-live="polite" className="mt-5 border-4 border-ss-rule bg-ss-deep px-3 py-3 pf-body-sm text-white shadow-pixel-sm">
              [ OK ] {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" aria-live="assertive" className="mt-5 border-4 border-white bg-ss-deep px-3 py-3 pf-body-sm text-white shadow-pixel-sm">
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
          <p className="mt-4 pf-body-sm text-ss-text">Checked every 60 seconds. You get one email when a seat opens.</p>

          <div className="mt-7 space-y-4">
            {watchlistLoading ? (
              <div className="flex items-center gap-3 border-4 border-ss-rule bg-ss-inset px-4 py-6 pf-body-sm text-white shadow-pixel-md">
                <Spinner />
                <span>Loading your watchlist…</span>
              </div>
            ) : watchlist.length === 0 ? (
              <div className="border-4 border-dashed border-ss-rule bg-ss-inset px-4 py-9 text-center">
                <p className="inline-block border-2 border-ss-rule px-3 py-1 pf-label uppercase text-ss-border">Empty</p>
                <p className="mt-5 pf-body-sm text-ss-text">Nothing on watch yet.</p>
                <p className="mt-3 pf-tiny text-ss-muted">Search a course below and hit WATCH to start tracking.</p>
              </div>
            ) : (
              watchlist.map((entry) => (
                <article
                  key={`${entry.section_id}-${entry.added_at}`}
                  aria-label={`Watching ${entry.section_id}`}
                  className="flex flex-col gap-4 border-4 border-ss-rule bg-ss-inset p-4 sm:p-5 shadow-pixel-md md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="truncate pf-h3 text-white">{entry.section_id}</h3>
                    <p className="mt-2 pf-body-sm text-ss-text">Course: {entry.course_id}</p>
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
          <p className="mt-4 pf-body-sm text-ss-text">Search a course ID like CMSC131 to see all available sections.</p>

          <form onSubmit={handleSearch} className="mt-7 flex flex-col gap-3 md:flex-row">
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
              <div className="border-4 border-dashed border-ss-rule bg-ss-inset px-4 py-9 text-center">
                <p className="inline-block border-2 border-ss-rule px-3 py-1 pf-label uppercase text-ss-border">No results</p>
                <p className="mt-5 pf-body-sm text-ss-text">Search a course to view its sections.</p>
                <p className="mt-3 pf-tiny text-ss-muted">Try a course ID like CMSC131 or MATH141.</p>
              </div>
            ) : null}

            {sections.map((section) => (
              <article
                key={section.section_id}
                aria-label={`Section ${section.section_id}`}
                className="border-4 border-ss-rule bg-ss-inset p-4 sm:p-5 shadow-pixel-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="pf-h3 text-white">{section.section_id}</h3>
                    <p className="mt-3 pf-body-sm text-ss-text">
                      <span className="text-white">Instructor</span>{' — '}
                      <span className="break-words">
                        {Array.isArray(section.instructors) && section.instructors.length > 0
                          ? section.instructors.join(', ')
                          : 'TBA'}
                      </span>
                    </p>
                    <p className="mt-2 pf-body-sm text-ss-text">
                      <span className="text-white">Meets</span>{' — '}{formatMeeting(section)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 md:flex-col md:items-stretch md:gap-3">
                    <SeatBadge open={section.open_seats} total={section.seats} />
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
            href="mailto:abetterstalker@gmail.com"
            className="text-white underline underline-offset-2 hover:text-ss-muted"
          >
            abetterstalker@gmail.com
          </a>
          <span className="ml-2 text-ss-border">(Discord preferred)</span>
        </p>
      </footer>
    </main>
  )
}

export default Dashboard
