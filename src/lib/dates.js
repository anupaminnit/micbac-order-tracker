// readiness_date/etc. are plain SQL `date` columns with no timezone, so comparisons against
// "today" must use the browser's local calendar date — not toISOString(), which is UTC and
// lags local date by up to 14 hours depending on timezone (e.g. up to 5:30 for India), causing
// orders to silently miss being flagged overdue right after local midnight.
export function localDateStr(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
