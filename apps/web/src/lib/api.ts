export type LoginResponse = {
  ok: boolean
  token?: string
  user?: { id: string; name: string; characters?: any[] }
  error?: string
}

export async function loginRequest(id: string, password: string): Promise<LoginResponse> {
  const res = await fetch('http://localhost:5174/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password })
  })
  return res.json()
}

export type RegisterResponse = LoginResponse & { error?: 'INVALID_INPUT' | 'DUPLICATE_ID' }

export async function registerRequest(id: string, password: string, confirm: string): Promise<RegisterResponse> {
  const res = await fetch('http://localhost:5174/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password, confirm })
  })
  return res.json()
}


