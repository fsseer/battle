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
  return fetchJsonWithTimeout<LoginResponse>(
    `${SERVER_ORIGIN}/auth/login`,
    { method: 'POST', body, credentials: 'omit' },
    5000
  )
}

export type RegisterResponse = LoginResponse & { error?: 'INVALID_INPUT' | 'DUPLICATE_ID' }

export async function registerRequest(
  id: string,
  password: string,
  confirm: string
): Promise<RegisterResponse> {
  const body = new URLSearchParams({ id, password, confirm })
  return fetchJsonWithTimeout<RegisterResponse>(
    `${SERVER_ORIGIN}/auth/register`,
    { method: 'POST', body, credentials: 'omit' },
    7000
  )
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
