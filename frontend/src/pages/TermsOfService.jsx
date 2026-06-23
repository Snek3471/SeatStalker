import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    num: '1',
    heading: 'Independent Project',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        SeatStalker is an independent, unofficial tool built by a UMD student. It is not affiliated with, endorsed by, or officially supported by the University of Maryland. Course and seat data is gathered from publicly accessible UMD systems (Testudo) for the purpose of providing notifications to students.
      </p>
    ),
  },
  {
    num: '2',
    heading: 'Eligibility',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        This service is intended for use by individuals with a valid email address as required by our current registration process. You agree to provide accurate information when registering.
      </p>
    ),
  },
  {
    num: '3',
    heading: 'No Guarantee of Accuracy or Availability',
    content: (
      <>
        <p className="mb-4 text-sm font-bold text-ss-text">
          We make a best effort to provide timely and accurate seat availability notifications, but we do not guarantee:
        </p>
        <ul className="space-y-2">
          {[
            'That notifications will always be sent in time for you to register before a seat fills',
            'That seat/course data will always be 100% accurate or up to date',
            'That the service will be available at all times without interruption',
          ].map((item) => (
            <li key={item} className="grid grid-cols-[1rem_1fr] gap-2 text-sm font-bold text-ss-text">
              <span className="mt-px select-none text-ss-border" aria-hidden="true">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: '4',
    heading: 'Acceptable Use',
    content: (
      <>
        <p className="mb-4 text-sm font-bold text-ss-text">You agree not to:</p>
        <ul className="space-y-2">
          {[
            'Use the service to spam, harass, or abuse other users',
            'Attempt to access another user\'s account or data without authorization',
            'Attempt to disrupt, overload, or interfere with the service (e.g. excessive automated requests)',
            'Use the service for any unlawful purpose',
          ].map((item) => (
            <li key={item} className="grid grid-cols-[1rem_1fr] gap-2 text-sm font-bold text-ss-text">
              <span className="mt-px select-none text-ss-border" aria-hidden="true">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: '5',
    heading: 'Account Termination',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        We reserve the right to suspend or terminate accounts that violate these terms, abuse the service, or for any other reason at our discretion.
      </p>
    ),
  },
  {
    num: '6',
    heading: 'Limitation of Liability',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        SeatStalker is provided{' '}
        <span className="text-white">"as is"</span>
        {' '}without warranties of any kind. To the fullest extent permitted by law, we are not liable for any missed registration opportunities, lost course seats, or any damages arising from your use of (or inability to use) this service.
      </p>
    ),
  },
  {
    num: '7',
    heading: 'Changes to These Terms',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.
      </p>
    ),
  },
  {
    num: '8',
    heading: 'Contact',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        Questions about these terms? Contact us at{' '}
        <a href="mailto:abetterstalker69@gmail.com" className="text-white underline underline-offset-2 hover:text-ss-muted">
          abetterstalker69@gmail.com
        </a>.
      </p>
    ),
  },
]

function TermsOfService() {
  return (
    <div className="min-h-dvh bg-black font-mono text-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">

        <Link
          to="/"
          className="inline-block text-xs font-black text-ss-border underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          ← Back to home
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-ss-border">
            SeatStalker
          </p>
          <h1 className="mt-2 text-balance text-3xl font-black uppercase text-white [text-shadow:4px_4px_0_#606060] sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs font-bold text-ss-border">
            Last updated: 23rd June 2026
          </p>
        </div>

        <p className="mt-8 text-sm font-bold text-ss-text">
          By using SeatStalker, you agree to the following terms.
        </p>

        <ol className="mt-2 space-y-0">
          {SECTIONS.map(({ num, heading, content }, i) => (
            <li
              key={num}
              className={[
                'grid grid-cols-[2rem_1fr] gap-5 py-8 sm:gap-8',
                i > 0 ? 'border-t-4 border-ss-rule' : 'border-t-4 border-ss-rule mt-4',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className="select-none text-3xl font-black leading-none text-ss-border sm:text-4xl"
              >
                {num}
              </span>
              <div className="pt-1">
                <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-white [text-shadow:1px_1px_0_#8b8b8b]">
                  {heading}
                </h2>
                {content}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <footer className="border-t-4 border-ss-rule bg-ss-surface px-6 py-8 text-center text-xs font-bold text-ss-muted">
        <p>
          <Link to="/privacy" className="underline underline-offset-2 hover:text-white">
            Privacy Policy
          </Link>
          <span className="mx-3">·</span>
          <Link to="/" className="underline underline-offset-2 hover:text-white">
            Home
          </Link>
        </p>
        <p className="mt-3">
          SeatStalker · UMD Course Seat Notifier · Not affiliated with the University of Maryland
        </p>
      </footer>
    </div>
  )
}

export default TermsOfService
