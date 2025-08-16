export type LoginResponse = {
  ok: boolean
  token?: string
  user?: { id: string; name: string; characters?: any[] }
  error?: string
}

// Allow override via Vite env when served over internet/tunnel
const rawEnvOrigin = (import.meta as any)?.env?.VITE_SERVER_ORIGIN as string | undefined
const envOrigin = rawEnvOrigin ? rawEnvOrigin.trim().replace(/\/+$/, '') : undefined
const defaultOrigin =
  typeof window !== 'undefined'
    ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5174'
      : `${window.location.protocol}//${window.location.hostname}:5174`
    : 'http://127.0.0.1:5174'
export const SERVER_ORIGIN = envOrigin && envOrigin.length > 0 ? envOrigin : defaultOrigin

function isTunnelHost(): boolean {
  try {
    const hostFromEnv = (() => {
      if (!SERVER_ORIGIN) return ''
      const u = new URL(SERVER_ORIGIN)
      return u.hostname
    })()
    const hostFromWin = typeof window !== 'undefined' ? window.location.hostname : ''
    return hostFromEnv.endsWith('loca.lt') || hostFromWin.endsWith('loca.lt')
  } catch {
    return false
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<T> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ac.signal })
    const data = (await res.json()) as T
    return data
  } finally {
    clearTimeout(timer)
  }
}

export async function loginRequest(id: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams({ id, password })
  const timeout = isTunnelHost() ? 12000 : 6000
  try {
    return await fetchJsonWithTimeout<LoginResponse>(
      `${SERVER_ORIGIN}/auth/login`,
      { method: 'POST', body, credentials: 'omit' },
      timeout
    )
  } catch {
    // Retry once with extended timeout to avoid false negatives on slow tunnels
    return await fetchJsonWithTimeout<LoginResponse>(
      `${SERVER_ORIGIN}/auth/login`,
      { method: 'POST', body, credentials: 'omit' },
      timeout * 2
    )
  }
}

export type RegisterResponse = LoginResponse & { error?: 'INVALID_INPUT' | 'DUPLICATE_ID' }

export async function registerRequest(
  id: string,
  password: string,
  confirm: string
): Promise<RegisterResponse> {
  const body = new URLSearchParams({ id, password, confirm })
  const timeout = isTunnelHost() ? 14000 : 7000
  try {
    return await fetchJsonWithTimeout<RegisterResponse>(
      `${SERVER_ORIGIN}/auth/register`,
      { method: 'POST', body, credentials: 'omit' },
      timeout
    )
  } catch {
    return await fetchJsonWithTimeout<RegisterResponse>(
      `${SERVER_ORIGIN}/auth/register`,
      { method: 'POST', body, credentials: 'omit' },
      timeout * 2
    )
  }
}

export async function checkIdAvailability(
  id: string
): Promise<{ ok: boolean; available?: boolean }> {
  // Use GET to avoid preflight over tunnels
  const url = `${SERVER_ORIGIN}/auth/check-id?id=${encodeURIComponent(id)}&ts=${Date.now()}`
  try {
    return await fetchJsonWithTimeout<{ ok: boolean; available?: boolean }>(
      url,
      { method: 'GET', cache: 'no-store', credentials: 'omit' },
      5000
    )
  } catch {
    return { ok: false }
  }
}
