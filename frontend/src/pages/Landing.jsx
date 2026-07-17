import { Link } from 'react-router-dom'
import MigrationNotice from '../components/MigrationNotice'

const CTA_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center gap-2 border-4 border-ss-btn-bd bg-white px-8 py-3 font-black text-ss-btn-fg shadow-pixel-btn transition hover:-translate-y-0.5 hover:bg-ss-btn-hov active:translate-y-0.5 active:shadow-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black'

const CTA_SECONDARY =
  'rounded font-black text-white underline underline-offset-4 hover:text-ss-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

const STEPS = [
  {
    num: '1',
    title: 'Search a course',
    body: 'Enter a course ID — CMSC131, MATH141, STAT400. See every open section with seat counts, instructors, and meeting times.',
  },
  {
    num: '2',
    title: 'Watch a section',
    body: 'Hit Watch on any section. We start checking it every 60 seconds. Nothing to configure, nothing to install.',
  },
  {
    num: '3',
    title: 'Get the email',
    body: 'The moment a seat opens, you get one email. Not a daily digest. Not a push notification. One email, exactly when it matters.',
  },
]

function Landing() {
  return (
    <>
    <div className="min-h-dvh bg-black font-mono text-white">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="mb-6 text-xs font-bold uppercase tracking-[0.25em] text-ss-border">
          UMD · Course Seat Notifier
        </p>

        <h1 className="text-balance text-4xl font-black uppercase leading-none text-white [text-shadow:5px_5px_0_#606060,_-2px_-2px_0_#2d2d2d] sm:text-6xl lg:text-7xl">
          Seat Stalker
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-balance text-base font-bold text-ss-text sm:text-lg">
          Never miss an open seat during add/drop. We watch your courses every 60 seconds and email you the moment one opens.
        </p>

        {/* Product preview — shows what users will actually see */}
        <div
          className="mx-auto mt-10 w-full max-w-sm select-none"
          aria-hidden="true"
        >
          <div className="border-4 border-ss-border bg-ss-surface p-4 shadow-pixel-xl text-left">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ss-border">Live example</p>
            <div className="border-4 border-ss-rule bg-ss-inset p-4 shadow-pixel-md">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-black text-white">CMSC131-0101</p>
                  <p className="mt-0.5 text-xs font-bold text-ss-text">
                    Course: CMSC131
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-ss-text">
                    TuTh @ 9:30am ·{' '}
                    <span className="text-white">1 seat open</span>
                  </p>
                </div>
                <div className="shrink-0 border-4 border-ss-btn-bd bg-white px-3 py-2 text-xs font-black text-ss-btn-fg shadow-pixel-btn-sm">
                  Watch
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs font-bold text-ss-border">
              → You get an email in seconds.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
          <Link to="/register" className={CTA_PRIMARY}>
            Sign up free
          </Link>
          <Link to="/login" className={CTA_SECONDARY}>
            Already have an account? Log in →
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section
        className="border-t-4 border-ss-border bg-ss-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="how-heading"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="how-heading"
            className="text-balance text-2xl font-black uppercase text-white [text-shadow:2px_2px_0_#8b8b8b]"
          >
            How it works
          </h2>
          <p className="mt-2 text-sm font-bold text-ss-text">
            Three steps. Two minutes to set up. Zero things to babysit.
          </p>

          <ol className="mt-12" aria-label="Steps to use SeatStalker">
            {STEPS.map(({ num, title, body }, i) => (
              <li
                key={num}
                className={[
                  'grid grid-cols-[2.5rem_1fr] gap-5 py-10 sm:grid-cols-[4.5rem_1fr] sm:gap-8',
                  i > 0 ? 'border-t-4 border-ss-rule' : '',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className="select-none text-5xl font-black leading-none text-ss-border sm:text-7xl"
                >
                  {num}
                </span>
                <div className="pt-1 sm:pt-2">
                  <h3 className="text-balance text-lg font-black uppercase text-white [text-shadow:1px_1px_0_#8b8b8b] sm:text-xl">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-prose text-sm font-bold leading-relaxed text-ss-text sm:text-base">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FOOTER CTA ──────────────────────────────────────────── */}
      <section
        className="border-t-4 border-ss-border px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="cta-heading"
      >
        <div className="mx-auto max-w-2xl">
          <h2
            id="cta-heading"
            className="text-balance text-2xl font-black uppercase text-white [text-shadow:2px_2px_0_#8b8b8b] sm:text-3xl"
          >
            Beat the add/drop rush.
          </h2>
          <p className="mx-auto mt-4 max-w-prose text-sm font-bold text-ss-text">
            Free to use. Works with any UMD course. Requires a @gmail.com address.
          </p>
          <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <Link to="/register" className={CTA_PRIMARY}>
              Sign up free
            </Link>
            <Link to="/login" className={`${CTA_SECONDARY} text-sm`}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t-4 border-ss-rule bg-ss-surface px-6 py-8 text-center text-xs font-bold text-ss-muted">
        <p>
          Bugs? Feedback? Reach out —{' '}
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
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link to="/privacy" className="underline underline-offset-2 hover:text-white">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="underline underline-offset-2 hover:text-white">
            Terms of Service
          </Link>
        </p>
        <p className="mt-3">
          SeatStalker · UMD Course Seat Notifier · Not affiliated with the University of Maryland
        </p>
      </footer>

    </div>

    <MigrationNotice />
    </>
  )
}

export default Landing
