import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword, validatePassword } from '../utils/security'
import {
  generateTokens,
  verifyToken,
  extractUserIdFromToken,
  invalidateUserTokens,
} from '../utils/jwt'
import { loginRateLimiter } from '../middleware/rateLimit'
import { loginSchema, registerSchema } from './auth.schemas'

const prisma = new PrismaClient()

// 인증 미들웨어
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Token is required.' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid token.' })
  }

  // request에 사용자 정보 추가
  ;(request as any).user = decoded
}

// 회원가입
export async function registerRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/auth/register',
    {
      preHandler: [loginRateLimiter],
      schema: registerSchema,
    },
    async (request, reply) => {
      try {
        const { loginId, password, confirm, nickname } = request.body as {
          loginId?: string
          password?: string
          confirm?: string
          nickname?: string
        }

        // 입력 검증
        if (!loginId || !password || !confirm) {
          return reply
            .code(400)
            .send({ code: 'VALIDATION_ERROR', message: 'All required fields must be provided.' })
        }

        if (password !== confirm) {
          return reply
            .code(400)
            .send({ code: 'VALIDATION_ERROR', message: 'Password confirmation does not match.' })
        }

        // 비밀번호 정책 검증
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.isValid) {
          return reply
            .code(400)
            .send({
              code: 'PASSWORD_POLICY_VIOLATION',
              message: 'Password does not meet the policy requirements.',
              details: passwordValidation.errors,
            })
        }

        // 기존 사용자 확인
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ loginId }, { nickname: nickname || loginId }],
          },
        })

        if (existingUser) {
          if (existingUser.loginId === loginId) {
            return reply
              .code(409)
              .send({ code: 'DUPLICATE_LOGIN_ID', message: 'Login ID already in use.' })
          } else {
            return reply
              .code(409)
              .send({ code: 'DUPLICATE_NICKNAME', message: 'Nickname already in use.' })
          }
        }

        // 비밀번호 해싱
        const pwHash = await hashPassword(password)

        // 사용자 생성
        const user = await prisma.user.create({
          data: {
            loginId,
            nickname: nickname || loginId,
            pwHash,
            character: {
              create: {
                name: 'Novice Gladiator',
                level: 1,
                str: 5,
                agi: 5,
                sta: 5,
                int: 5,
                luck: 5,
                fate: 0,
              },
            },
          },
          include: {
            character: true,
          },
        })

        // 토큰 생성
        const tokens = generateTokens(user.id)

        return {
          ok: true,
          ...tokens,
          user: {
            id: user.loginId,
            nickname: user.nickname,
            character: user.character,
          },
        }
      } catch (error) {
        request.log.error(error)
        return reply
          .code(500)
          .send({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' })
      }
    }
  )

  // 로그인
  fastify.post(
    '/auth/login',
    {
      preHandler: [loginRateLimiter],
      schema: loginSchema,
    },
    async (request, reply) => {
      try {
        const { loginId, password } = request.body as {
          loginId?: string
          password?: string
        }

        if (!loginId || !password) {
          return reply
            .code(400)
            .send({ code: 'VALIDATION_ERROR', message: 'Login ID and password are required.' })
        }

        // 사용자 조회
        const user = await prisma.user.findUnique({
          where: { loginId },
          include: { character: true },
        })

        if (!user) {
          return reply
            .code(401)
            .send({ code: 'INVALID_CREDENTIALS', message: 'Invalid login ID or password.' })
        }

        // 비밀번호 검증
        const isValidPassword = await verifyPassword(password, user.pwHash)
        if (!isValidPassword) {
          // 로그인 시도 횟수 증가
          await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: { increment: 1 } },
          })

          return reply
            .code(401)
            .send({ code: 'INVALID_CREDENTIALS', message: 'Invalid login ID or password.' })
        }

        // 계정 잠금 확인
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return reply
            .code(423)
            .send({
              code: 'ACCOUNT_LOCKED',
              message: 'Account is locked. Please wait until it is unlocked.',
              lockedUntil: user.lockedUntil,
            })
        }

        // 기존 토큰 무효화 (중복 로그인 방지)
        invalidateUserTokens(user.id)

        // 새 토큰 생성
        const tokens = generateTokens(user.id)

        // 로그인 성공 시 메타데이터 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            loginAttempts: 0,
            lockedUntil: null,
          },
        })

        return {
          ok: true,
          ...tokens,
          user: {
            id: user.loginId,
            nickname: user.nickname,
            character: user.character,
          },
        }
      } catch (error) {
        request.log.error(error)
        return reply
          .code(500)
          .send({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' })
      }
    }
  )

  // 토큰 갱신
  fastify.post('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body as { refreshToken?: string }

      if (!refreshToken) {
        return reply
          .code(400)
          .send({ code: 'VALIDATION_ERROR', message: 'Refresh token is required.' })
      }

      const newAccessToken = await generateTokens(refreshToken)
      if (!newAccessToken) {
        return reply
          .code(401)
          .send({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.' })
      }

      return {
        ok: true,
        accessToken: newAccessToken.accessToken,
      }
    } catch (error) {
      request.log.error(error)
      return reply
        .code(500)
        .send({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' })
    }
  })

  // 로그아웃
  fastify.post(
    '/auth/logout',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as any).user

        // 토큰 무효화
        invalidateUserTokens(user.sub)

        return { ok: true, message: 'Logged out.' }
      } catch (error) {
        request.log.error(error)
        return reply
          .code(500)
          .send({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' })
      }
    }
  )

  // 현재 사용자 정보
  fastify.get(
    '/auth/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as any).user

        const userData = await prisma.user.findUnique({
          where: { id: user.sub },
          include: { character: true },
        })

        if (!userData) {
          return reply.code(404).send({ code: 'USER_NOT_FOUND', message: 'User not found.' })
        }

        return {
          ok: true,
          user: {
            id: userData.loginId,
            nickname: userData.nickname,
            character: userData.character,
          },
        }
      } catch (error) {
        request.log.error(error)
        return reply
          .code(500)
          .send({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' })
      }
    }
  )

  // 토큰 유효성 검증
  fastify.get(
    '/auth/validate',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as any).user

        return {
          ok: true,
          message: 'Token is valid.',
          user: {
            id: user.sub,
            exp: user.exp,
          },
        }
      } catch (error) {
        request.log.error(error)
        return reply
          .code(500)
          .send({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' })
      }
    }
  )
}
