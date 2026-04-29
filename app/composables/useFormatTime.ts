export function useFormatTime() {
  function formatMs(ms: number | null | undefined): string {
    if (ms === null || ms === undefined || ms < 0) return '—'
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function formatDate(ts: number | null | undefined): string {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDateTime(ts: number | null | undefined): string {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return { formatMs, formatDate, formatDateTime }
}
