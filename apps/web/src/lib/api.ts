export type LoginResponse = {
  ok: boolean
  token?: string
  user?: { id: string; name: string; characters?: any[] }
  error?: string
}

// Allow override via Vite env when served over internet/tunnel
const envOrigin = (import.meta as any)?.env?.VITE_SERVER_ORIGIN as string | undefined
const defaultOrigin =
  typeof window !== 'undefined'
    ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5174'
      : `${window.location.protocol}//${window.location.hostname}:5174`
    : 'http://127.0.0.1:5174'
const SERVER_ORIGIN = envOrigin && envOrigin.length > 0 ? envOrigin : defaultOrigin

export async function loginRequest(id: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${SERVER_ORIGIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password }),
  })
  return res.json()
}

export type RegisterResponse = LoginResponse & { error?: 'INVALID_INPUT' | 'DUPLICATE_ID' }

export async function registerRequest(
  id: string,
  password: string,
  confirm: string
): Promise<RegisterResponse> {
  const res = await fetch(`${SERVER_ORIGIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password, confirm }),
  })
  return res.json()
}

export async function checkIdAvailability(
  id: string
): Promise<{ ok: boolean; available?: boolean }> {
  const res = await fetch(`${SERVER_ORIGIN}/auth/check-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}
