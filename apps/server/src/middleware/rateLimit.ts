import { FastifyRequest, FastifyReply } from 'fastify'
import { generateRateLimitKey } from '../utils/security'

// 메모리 기반 Rate Limiting (프로덕션에서는 Redis 사용 권장)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  keyGenerator?: (request: FastifyRequest) => string
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = config.keyGenerator
      ? config.keyGenerator(request)
      : generateRateLimitKey(request.ip || 'unknown', 'default')

    const now = Date.now()
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs

    const current = rateLimitStore.get(key)

    if (!current || current.resetTime < now) {
      // 새로운 윈도우 시작
      rateLimitStore.set(key, { count: 1, resetTime: windowStart + config.windowMs })
    } else {
      // 기존 윈도우에서 카운트 증가
      if (current.count >= config.max) {
        const retryAfter = Math.ceil((current.resetTime - now) / 1000)

        reply.header('Retry-After', retryAfter)
        reply.header('X-RateLimit-Limit', config.max)
        reply.header('X-RateLimit-Remaining', 0)
        reply.header('X-RateLimit-Reset', current.resetTime)

        return reply.code(429).send({
          error: 'Too Many Requests',
          message: config.message || '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.',
          retryAfter,
        })
      }

      current.count++
      rateLimitStore.set(key, current)
    }

    // 헤더 설정
    const remaining = Math.max(0, config.max - (current?.count || 0))
    reply.header('X-RateLimit-Limit', config.max)
    reply.header('X-RateLimit-Remaining', remaining)
    reply.header('X-RateLimit-Reset', windowStart + config.windowMs)
  }
}

// 로그인 전용 Rate Limiter
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회 시도
  message: '너무 많은 로그인 시도가 있었습니다. 15분 후 다시 시도해주세요.',
  keyGenerator: (request: FastifyRequest) => {
    const body = request.body as any
    const loginId = body?.loginId || request.ip || 'unknown'
    return generateRateLimitKey(loginId, 'login')
  },
})

// API 전용 Rate Limiter
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1분
  max: 100, // 최대 100회 요청
  message: 'API 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  keyGenerator: (request: FastifyRequest) => {
    const token = request.headers.authorization?.replace('Bearer ', '') || 'anonymous'
    return generateRateLimitKey(token, 'api')
  },
})

// 정리 함수 (메모리 누수 방지)
export function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

// 주기적으로 정리 실행 (1시간마다)
setInterval(cleanupRateLimitStore, 60 * 60 * 1000)
