export type LoginResponse = {
  ok: boolean
  token?: string
  user?: { id: string; name: string; characters?: any[] }
  error?: string
}

const SERVER_ORIGIN = 'http://127.0.0.1:5174'

export async function loginRequest(id: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${SERVER_ORIGIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password })
  })
  return res.json()
}

export type RegisterResponse = LoginResponse & { error?: 'INVALID_INPUT' | 'DUPLICATE_ID' }

export async function registerRequest(id: string, password: string, confirm: string): Promise<RegisterResponse> {
  const res = await fetch(`${SERVER_ORIGIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password, confirm })
  })
  return res.json()
}

export async function checkIdAvailability(id: string): Promise<{ ok: boolean; available?: boolean }> {
  const res = await fetch(`${SERVER_ORIGIN}/auth/check-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  return res.json()
}


