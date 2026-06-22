/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
}
