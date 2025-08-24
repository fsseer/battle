export type LoginResponse = {
  ok: boolean
  token?: string
  hasExistingSession?: boolean
  existingSessionInfo?: {
    lastActivity: number
    message: string
  }
  user?: {
    id: string
    name: string
    nickname?: string
    characters?: Array<{
      id: string
      name: string
      level: number
      stats: {
        str: number
        agi: number
        sta: number
      }
    }>
  }
  error?: string
}

// Allow override via Vite env when served over external domain
const rawEnvOrigin = (import.meta as any)?.env?.VITE_SERVER_ORIGIN as string | undefined
const envOrigin = rawEnvOrigin ? rawEnvOrigin.trim().replace(/\/+$/, '') : undefined

// 환경 변수가 없을 때 강제로 외부 도메인 감지
const isExternalDomain =
  typeof window !== 'undefined' && window.location.hostname.includes('iptime.org')
const forceExternalOrigin = isExternalDomain ? `http://${window.location.hostname}:5174` : undefined

// 현재 호스트에 따른 기본 주소 결정
const getDefaultOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5174'
  }

  const hostname = window.location.hostname
  const protocol = window.location.protocol

  // iptime.org 도메인인 경우 - 외부 접근용
  if (hostname.includes('iptime.org')) {
    return `http://${hostname}:5174`
  }

  // localhost인 경우
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5174'
  }

  // 기타 도메인인 경우
  return `${protocol}//${hostname}:5174`
}

const defaultOrigin = getDefaultOrigin()

console.log('[API] 환경 변수 주소:', envOrigin)
console.log('[API] 강제 외부 도메인:', forceExternalOrigin)
console.log('[API] 기본 주소:', defaultOrigin)

// 최종 서버 주소 결정 (우선순위: 환경변수 > 강제감지 > 기본값)
export const SERVER_ORIGIN = envOrigin || forceExternalOrigin || defaultOrigin

console.log('[API] 최종 서버 주소:', SERVER_ORIGIN)

// 인증된 사용자를 위한 API 호출 함수
export async function call(
  endpoint: string,
  data: Record<string, unknown> = {},
  method: string = 'POST'
): Promise<unknown> {
  try {
    // localStorage에서 'token' 키로 토큰 가져오기 (useAuthStore와 통일)
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('인증 정보가 없습니다.')
    }

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }

    // POST 요청이 아닌 경우 body를 추가하지 않음
    if (method === 'POST' && data) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(`${SERVER_ORIGIN}${endpoint}`, requestOptions)

    if (!response.ok) {
      // 인증 관련 에러 (401, 403) 시 자동 로그아웃
      if (response.status === 401 || response.status === 403) {
        console.error(`[API] ${endpoint} 인증 실패 (${response.status}), 자동 로그아웃 시작`)
        console.log(
          `[API] 현재 localStorage 토큰:`,
          localStorage.getItem('token') ? '존재함' : '없음'
        )

        // useAuthStore의 토큰 만료 처리 함수 호출
        try {
          console.log('[API] useAuthStore import 시도...')
          const { useAuthStore } = await import('../store/auth')
          console.log('[API] useAuthStore import 성공, handleTokenExpiration 호출')
          useAuthStore.getState().handleTokenExpiration()
          console.log('[API] handleTokenExpiration 호출 완료')
        } catch (error) {
          console.error('[API] 토큰 만료 처리 실패:', error)
          // fallback: 직접 처리
          console.log('[API] fallback 처리 시작')
          localStorage.removeItem('token')
          console.log('[API] localStorage 토큰 제거 완료')
          window.location.href = '/login'
          console.log('[API] 페이지 리다이렉트 완료')
        }
        throw { status: response.status, message: '인증이 만료되었습니다. 다시 로그인해주세요.' }
      }

      // 400 에러의 경우 JSON 응답을 시도
      if (response.status === 400) {
        try {
          const errorData = await response.json()
          throw { status: 400, ...errorData }
        } catch {
          throw { status: 400, message: '잘못된 요청입니다.' }
        }
      }

      // 다른 에러의 경우 텍스트 응답
      const errorText = await response.text()
      throw { status: response.status, message: errorText }
    }

    return await response.json()
  } catch (error) {
    console.error(`[API] ${endpoint} 호출 중 오류:`, error)
    throw error
  }
}

// GET 요청을 위한 편의 함수
export async function get(endpoint: string): Promise<unknown> {
  return call(endpoint, {}, 'GET')
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<T> {
  const ac = AbortController ? new AbortController() : ({} as AbortController)
  const timer = setTimeout(() => {
    if (ac.abort) ac.abort()
  }, timeoutMs)
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
  const timeout = 6000 // 포트포워딩 환경 최적화
  try {
    return await fetchJsonWithTimeout<LoginResponse>(
      `${SERVER_ORIGIN}/auth/login`,
      { method: 'POST', body, credentials: 'omit' },
      timeout
    )
  } catch {
    // 재시도 로직 (네트워크 지연 대응)
    return await fetchJsonWithTimeout<LoginResponse>(
      `${SERVER_ORIGIN}/auth/login`,
      { method: 'POST', body, credentials: 'omit' },
      timeout * 1.5
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
  const timeout = 7000 // 포트포워딩 환경 최적화
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
      timeout * 1.5
    )
  }
}

export async function checkIdAvailability(
  id: string
): Promise<{ ok: boolean; available?: boolean }> {
  // Use GET to avoid preflight complexity
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
