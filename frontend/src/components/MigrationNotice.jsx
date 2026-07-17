import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const STORAGE_KEY = 'seatstalker_migration_notice_dismissed'

const SLIDE = {
  hidden: { x: '120%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    x: '120%',
    opacity: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
}

const REDUCED = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export default function MigrationNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setVisible(true), 1000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const variants = prefersReduced ? REDUCED : SLIDE

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          key="migration-notice"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-5 right-5 z-50 w-[min(300px,calc(100vw-2.5rem))] border-4 border-ss-border bg-ss-surface font-mono shadow-pixel-md"
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-1">
            <p className="text-xs font-black uppercase tracking-widest text-white [text-shadow:1px_1px_0_#606060]">
              heads up
            </p>
            <button
              onClick={dismiss}
              aria-label="Dismiss notice"
              className="mt-px shrink-0 text-ss-border transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
              </svg>
            </button>
          </div>

          <p className="px-4 pt-1 pb-3 text-xs font-bold leading-relaxed text-ss-text">
            we recently changed the backend service, please login and check if your watchlists are accurate.
          </p>

          <div className="border-t-2 border-ss-rule px-4 py-3">
            <Link
              to="/login"
              onClick={dismiss}
              className="text-xs font-black text-white underline underline-offset-2 hover:text-ss-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              go to dashboard →
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
