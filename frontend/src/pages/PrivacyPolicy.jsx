import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    heading: null,
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        SeatStalker (<span className="text-white">"we," "us," "the app"</span>) is an independent,
        student-built tool and is not affiliated with, endorsed by, or operated by the University of Maryland.
      </p>
    ),
  },
  {
    heading: 'Information We Collect',
    content: (
      <ul className="space-y-2">
        {[
          'Your name and email address, provided when you register',
          'A securely hashed version of your password (we never store or have access to your plaintext password)',
          'The course sections you choose to watch ("your watchlist")',
          'Basic technical data such as IP address, collected automatically by our hosting providers (Railway, Vercel) for security and abuse prevention',
        ].map((item) => (
          <li key={item} className="grid grid-cols-[1rem_1fr] gap-2 text-sm font-bold text-ss-text">
            <span className="mt-px select-none text-ss-border" aria-hidden="true">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    heading: 'How We Use Your Information',
    content: (
      <ul className="space-y-2">
        {[
          'To create and manage your account',
          'To send you email notifications when a seat opens in a section you\'re watching',
          'To send account-related emails (verification codes, password reset links)',
          'To prevent abuse (e.g. rate limiting registration attempts)',
        ].map((item) => (
          <li key={item} className="grid grid-cols-[1rem_1fr] gap-2 text-sm font-bold text-ss-text">
            <span className="mt-px select-none text-ss-border" aria-hidden="true">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    heading: "What We Don't Do",
    content: (
      <ul className="space-y-2">
        {[
          'We do not sell your personal information to anyone',
          'We do not share your email or watchlist data with third parties for advertising or marketing purposes',
          'We do not use your data for any purpose beyond operating this tool',
        ].map((item) => (
          <li key={item} className="grid grid-cols-[1rem_1fr] gap-2 text-sm font-bold text-ss-text">
            <span className="mt-px select-none text-ss-border" aria-hidden="true">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    heading: 'Third-Party Services We Use',
    content: (
      <>
        <ul className="space-y-2">
          {[
            ['Resend', 'to deliver transactional emails (verification codes, password resets, seat alerts)'],
            ['Railway', 'to host our backend server and database'],
            ['Vercel', 'to host our website frontend'],
          ].map(([name, desc]) => (
            <li key={name} className="grid grid-cols-[1rem_1fr] gap-2 text-sm font-bold text-ss-text">
              <span className="mt-px select-none text-ss-border" aria-hidden="true">→</span>
              <span><span className="text-white">{name}</span> — {desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-bold text-ss-text">
          These providers may process your data solely to provide their respective services to us, under their own privacy/security practices.
        </p>
      </>
    ),
  },
  {
    heading: 'Data Retention',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        We retain your account information for as long as your account exists. You may request account deletion at any time by contacting us at{' '}
        <a href="mailto:abetterstalker@gmail.com" className="text-white underline underline-offset-2 hover:text-ss-muted">
          abetterstalker@gmail.com
        </a>.
      </p>
    ),
  },
  {
    heading: 'Data Security',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        We take reasonable measures to protect your information, including password hashing, encrypted connections (HTTPS), and access controls on our database. However, no system is 100% secure, and we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    heading: 'Changes to This Policy',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        We may update this policy from time to time. Continued use of the app after changes constitutes acceptance of the updated policy.
      </p>
    ),
  },
  {
    heading: 'Contact',
    content: (
      <p className="text-sm font-bold leading-relaxed text-ss-text">
        Questions about this policy? Contact us at{' '}
        <a href="mailto:abetterstalker@gmail.com" className="text-white underline underline-offset-2 hover:text-ss-muted">
          abetterstalker@gmail.com
        </a>.
      </p>
    ),
  },
]

function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs font-bold text-ss-border">
            Last updated: 23rd June 2026
          </p>
        </div>

        <div className="mt-10 space-y-0">
          {SECTIONS.map(({ heading, content }, i) => (
            <div
              key={heading ?? '__intro'}
              className={[
                'py-8',
                i > 0 ? 'border-t-4 border-ss-rule' : '',
              ].join(' ')}
            >
              {heading && (
                <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white [text-shadow:1px_1px_0_#8b8b8b]">
                  {heading}
                </h2>
              )}
              {content}
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t-4 border-ss-rule bg-ss-surface px-6 py-8 text-center text-xs font-bold text-ss-muted">
        <p>
          <Link to="/terms" className="underline underline-offset-2 hover:text-white">
            Terms of Service
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

export default PrivacyPolicy
