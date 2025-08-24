import bcrypt from 'bcrypt'
import crypto from 'crypto'

// 비밀번호 정책
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90일
}

// 비밀번호 유효성 검증
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`비밀번호는 최소 ${PASSWORD_POLICY.minLength}자 이상이어야 합니다.`)
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('비밀번호는 대문자를 포함해야 합니다.')
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('비밀번호는 소문자를 포함해야 합니다.')
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('비밀번호는 숫자를 포함해야 합니다.')
  }

  if (
    PASSWORD_POLICY.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('비밀번호는 특수문자를 포함해야 합니다.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// 비밀번호 검증
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// JWT 시크릿 생성
export function generateJWTSecret(): string {
  return crypto.randomBytes(64).toString('hex')
}

// 안전한 랜덤 문자열 생성
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// 해시 생성 (파일 무결성 검증용)
export function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

// Rate Limiting을 위한 키 생성
export function generateRateLimitKey(identifier: string, action: string): string {
  return `${identifier}:${action}:${Math.floor(Date.now() / (15 * 60 * 1000))}` // 15분 단위
}
