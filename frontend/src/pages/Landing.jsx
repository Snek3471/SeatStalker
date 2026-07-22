import { Link } from 'react-router-dom'
import MigrationNotice from '../components/MigrationNotice'

const CTA_PRIMARY =
  'inline-flex min-h-[48px] items-center justify-center gap-2 border-4 border-ss-btn-bd bg-white px-8 py-3 text-[11px] uppercase tracking-wide text-ss-btn-fg shadow-pixel-btn transition-[transform,background-color,color,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-black hover:text-white active:translate-x-0 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black'

const CTA_SECONDARY =
  'pf-body-sm uppercase text-white underline underline-offset-4 hover:text-ss-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

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
    <div className="min-h-dvh bg-black text-white">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="mb-7 pf-label uppercase text-ss-border">
          UMD · Course Seat Notifier
        </p>

        <h1 className="pf-hero text-balance uppercase text-white [text-shadow:5px_5px_0_#606060,_-2px_-2px_0_#2d2d2d]">
          Seat<br className="sm:hidden" /> Stalker
        </h1>

        <div className="mx-auto mt-8 pixel-divider max-w-[220px]" aria-hidden="true" />

        <p className="mx-auto mt-8 max-w-xl text-balance pf-body text-ss-text">
          Never miss an open seat during add/drop. We watch your courses every 60 seconds and email you the moment one opens.
        </p>

        {/* Product preview — shows what users will actually see */}
        <div className="mx-auto mt-11 w-full max-w-sm select-none" aria-hidden="true">
          <div className="border-4 border-ss-border bg-ss-surface p-4 shadow-pixel-xl text-left">
            <p className="mb-3 pf-label uppercase text-ss-border">Live example</p>
            <div className="border-4 border-ss-rule bg-ss-inset p-4 shadow-pixel-md">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="pf-body-sm text-white">CMSC131-0101</p>
                  <p className="mt-2 pf-tiny text-ss-text">TuTh @ 9:30am</p>
                  <p className="mt-2 inline-block border-2 border-white bg-black px-2 py-1 pf-tiny text-white">
                    1 SEAT OPEN
                  </p>
                </div>
                <div className="shrink-0 border-4 border-ss-btn-bd bg-white px-3 py-2 text-[9px] uppercase tracking-wide text-ss-btn-fg shadow-pixel-btn-sm">
                  Watch
                </div>
              </div>
            </div>
            <p className="mt-4 pf-tiny text-ss-border">
              &gt; You get an email in seconds.
            </p>
          </div>
        </div>

        <div className="mt-11 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <Link to="/register" className={CTA_PRIMARY}>
            Sign up free
          </Link>
          <Link to="/login" className={CTA_SECONDARY}>
            Already have an account? Log in &gt;
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section
        className="border-t-4 border-ss-border bg-ss-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="how-heading"
      >
        <div className="mx-auto max-w-3xl">
          <h2 id="how-heading" className="pf-h2 text-balance uppercase text-white [text-shadow:2px_2px_0_#606060]">
            How it works
          </h2>
          <div className="mt-4 pixel-divider max-w-[160px]" aria-hidden="true" />
          <p className="mt-5 pf-body-sm text-ss-text">
            Three steps. Two minutes to set up. Zero things to babysit.
          </p>

          <ol className="mt-10" aria-label="Steps to use SeatStalker">
            {STEPS.map(({ num, title, body }, i) => (
              <li
                key={num}
                className={[
                  'grid grid-cols-[2.75rem_1fr] gap-5 py-9 sm:grid-cols-[5rem_1fr] sm:gap-8',
                  i > 0 ? 'border-t-4 border-dashed border-ss-rule' : '',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className="select-none pf-hero leading-none text-ss-border [text-shadow:3px_3px_0_#2d2d2d]"
                >
                  {num}
                </span>
                <div className="min-w-0 pt-1">
                  <h3 className="pf-h3 text-balance uppercase text-white [text-shadow:1px_1px_0_#606060]">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-prose pf-body-sm text-ss-text">
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
          <h2 id="cta-heading" className="pf-h2 text-balance uppercase text-white [text-shadow:2px_2px_0_#606060]">
            Beat the add/drop rush.
          </h2>
          <p className="mx-auto mt-5 max-w-prose pf-body-sm text-ss-text">
            Free to use. Works with any UMD course. Requires a @gmail.com address.
          </p>
          <div className="mt-9 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <Link to="/register" className={CTA_PRIMARY}>
              Sign up free
            </Link>
            <Link to="/login" className={CTA_SECONDARY}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t-4 border-ss-rule bg-ss-surface px-6 py-9 text-center pf-tiny leading-loose text-ss-muted">
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
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <Link to="/privacy" className="underline underline-offset-2 hover:text-white">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="underline underline-offset-2 hover:text-white">
            Terms of Service
          </Link>
        </p>
        <p className="mt-4">
          SeatStalker · UMD Course Seat Notifier · Not affiliated with the University of Maryland
        </p>
      </footer>

    </div>

    <MigrationNotice />
    </>
  )
}

export default Landing
