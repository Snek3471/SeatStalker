function normalizeApiUrl(raw) {
  const value = (raw || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, '')
  }
  return `https://${value.replace(/\/$/, '')}`
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL)
