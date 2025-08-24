import jwt from 'jsonwebtoken'
import { generateSecureToken } from './security'

// JWT 시크릿 (환경변수에서 가져오거나 생성)
const JWT_SECRET = process.env.JWT_SECRET || generateSecureToken(64)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

// 토큰 버전 관리 (강제 만료용)
const tokenVersions = new Map<string, number>()

export interface JWTPayload {
  sub: string // user ID
  iat: number // 발급 시간
  exp: number // 만료 시간
  jti: string // JWT ID (중복 로그인 방지)
  version: number // 토큰 버전 (강제 만료용)
  type: 'access' | 'refresh'
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// 토큰 생성
export function generateTokens(userId: string): TokenPair {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 24 * 60 * 60 // 24시간

  // 토큰 버전 증가
  const currentVersion = tokenVersions.get(userId) || 0
  const newVersion = currentVersion + 1
  tokenVersions.set(userId, newVersion)

  // JWT ID 생성 (중복 로그인 방지)
  const jti = generateSecureToken(16)

  const payload: JWTPayload = {
    sub: userId,
    iat: now,
    exp: now + expiresIn,
    jti,
    version: newVersion,
    type: 'access',
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' })

  // Refresh 토큰 (7일)
  const refreshPayload: JWTPayload = {
    ...payload,
    exp: now + 7 * 24 * 60 * 60,
    type: 'refresh',
  }

  const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, { algorithm: 'HS256' })

  return {
    accessToken,
    refreshToken,
    expiresIn,
  }
}

// 토큰 검증
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

    // 토큰 버전 확인
    const currentVersion = tokenVersions.get(decoded.sub)
    if (currentVersion === undefined || decoded.version < currentVersion) {
      return null // 토큰이 강제 만료됨
    }

    return decoded
  } catch (error) {
    return null
  }
}

// 토큰에서 사용자 ID 추출
export function extractUserIdFromToken(token: string): string | null {
  const decoded = verifyToken(token)
  return decoded?.sub || null
}

// 토큰 강제 만료 (중복 로그인 시)
export function invalidateUserTokens(userId: string): void {
  const currentVersion = tokenVersions.get(userId) || 0
  tokenVersions.set(userId, currentVersion + 1)
}

// 토큰 갱신
export function refreshAccessToken(refreshToken: string): string | null {
  const decoded = verifyToken(refreshToken)
  if (!decoded || decoded.type !== 'refresh') {
    return null
  }

  // 새로운 액세스 토큰 생성
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 24 * 60 * 60 // 24시간

  const payload: JWTPayload = {
    sub: decoded.sub,
    iat: now,
    exp: now + expiresIn,
    jti: generateSecureToken(16),
    version: decoded.version,
    type: 'access',
  }

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' })
}

// 토큰 정보 디코딩 (검증 없이)
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token)
  } catch {
    return null
  }
}

// 토큰 만료 시간 확인
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return true
  }

  const now = Math.floor(Date.now() / 1000)
  return decoded.exp < now
}

// 토큰 만료까지 남은 시간 (초)
export function getTokenTimeToExpiry(token: string): number {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return 0
  }

  const now = Math.floor(Date.now() / 1000)
  return Math.max(0, decoded.exp - now)
}
