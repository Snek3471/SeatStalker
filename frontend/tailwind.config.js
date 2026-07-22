/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Sharp corners everywhere — the pixel/Minecraft aesthetic has no soft edges.
    // Every `rounded*` utility collapses to 0–2px so existing markup goes blocky
    // without touching each call site.
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '2px',
      md: '2px',
      lg: '2px',
      xl: '2px',
      '2xl': '2px',
      '3xl': '2px',
      full: '2px',
    },
    extend: {
      fontFamily: {
        // Primary pixel/display face. Everything reads in this by default.
        pixel: ['"Press Start 2P"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        // Readable monospace for long-form prose (legal pages) and the
        // untouched migration notice — where Press Start 2P would hurt reading.
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', '"Courier New"', 'monospace'],
        sans: ['"Press Start 2P"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        'ss-surface':  '#171717',
        'ss-inset':    '#1f1f1f',
        'ss-deep':     '#101010',
        'ss-disabled': '#2b2b2b',
        'ss-border':   '#8a8a8a',
        'ss-rule':     '#8f8f8f',
        'ss-text':     '#d8d8d8',
        'ss-muted':    '#bfbfbf',
        'ss-subtle':   '#b8b8b8',
        'ss-btn-bd':   '#f5f5f5',
        'ss-btn-hov':  '#dedede',
        'ss-btn-fg':   '#111111',
      },
      boxShadow: {
        'pixel-xl':     '10px 10px 0 #606060',
        'pixel-auth':   '10px 10px 0 #606060, -8px -8px 0 #2d2d2d',
        'pixel-md':     '6px 6px 0 #5f5f5f',
        'pixel-sm':     '4px 4px 0 #5f5f5f',
        'pixel-btn':    '6px 6px 0 #8f8f8f',
        'pixel-btn-sm': '4px 4px 0 #8f8f8f',
        // Tight white pixel-shadow for interactive elements on dark surfaces.
        'pixel-white':  '4px 4px 0 #f5f5f5',
      },
      keyframes: {
        'pixel-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'pixel-blink': 'pixel-blink 1s steps(2, start) infinite',
      },
    },
  },
  plugins: [],
}
