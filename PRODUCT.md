# Product

## Register

product

## Users

College students at the University of Maryland trying to get into full/waitlisted courses. They're checking this under stress — add/drop period is short, seats go fast, and the university's own tooling (Testudo) is hostile and slow. Primary context: phone or laptop, urgent, low patience. Secondary: background passive monitoring — they set a watch and wait for an email.

## Product Purpose

SeatStalker monitors UMD course sections and emails users the moment a seat opens. Users register, search for a course, add sections to a watchlist (max 5), and get notified once per availability window. It exists because Testudo doesn't notify anyone of anything, and F5-refreshing a page for days is not a life.

## Brand Personality

Retro, raw, irreverent. The product talks like a friend who actually knows the registration system — casual, a little cocky, not corporate. "Better than the McKeldin one." Pixel aesthetic is intentional and locked in: monospace fonts, heavy borders, black-and-white with pixel-art shadow depth. This is the cool alternative to the university's own UI.

## Anti-references

- **Testudo / PeopleSoft-era university portals**: the thing SeatStalker replaces. No table-heavy layouts, muted blues, or "official" government-web energy.
- **Generic SaaS clones**: no rounded cards, soft shadows, gradient accents, or Notion/Linear aesthetics. This is not a productivity tool for knowledge workers.

## Design Principles

1. **Contrast over comfort.** Black is the canvas. White is the signal. Nothing in between unless it earns its place.
2. **Blunt, not brutal.** The aesthetic is retro but the experience is fast — no friction in the core flow (search → watch → wait).
3. **Personality in copy, not decoration.** The irreverence lives in the words (subject lines, error messages, empty states), not in emoji or cartoon mascots.
4. **Watchlist as the product.** Everything else (auth, search) is scaffolding. The watchlist view is what users actually live in.
5. **Mobile-first urgency.** Students check on phones during the panic window. Forms must be fast one-thumb, no horizontal scroll, no tiny tap targets.

## Accessibility & Inclusion

WCAG AA minimum. All interactive elements keyboard-navigable. The monochrome palette makes contrast easy to control — enforce it rigorously (white on dark-gray backgrounds must hit 4.5:1). Reduced-motion alternative required for the FallingPattern animation and any cursor effects.
