// ============================================
// API Query Param Validators
// ============================================

export function parseIntParam(value: string | null, defaultVal: number, min: number, max: number): number {
  if (!value) return defaultVal
  const num = parseInt(value, 10)
  if (isNaN(num)) return defaultVal
  return Math.min(Math.max(num, min), max)
}

export function parseStringParam(value: string | null, allowed?: string[]): string | undefined {
  if (!value || value.trim() === '') return undefined
  const trimmed = value.trim()
  if (allowed && !allowed.includes(trimmed)) return undefined
  return trimmed
}

export function parseBoolParam(value: string | null): boolean | undefined {
  if (!value) return undefined
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return undefined
}

/** Standard success JSON response */
export function jsonOk<T>(data: T, status: number = 200) {
  return Response.json({ success: true, data }, { status })
}

/** Standard error JSON response */
export function jsonError(message: string, status: number = 400) {
  return Response.json({ success: false, error: message }, { status })
}

/** Standard paginated JSON response */
export function jsonPaginated<T>(data: T[], pagination: { page: number; perPage: number; total: number; totalPages: number }) {
  return Response.json({ success: true, data, pagination })
}
