import { PrismaClient } from '@prisma/client'
import { Server } from 'socket.io'
import msgpackParser from 'socket.io-msgpack-parser'
import { createServer } from 'http'
import { HybridSyncService } from './services/hybridSync'
import { ResourceManager } from './services/resourceManager'
import { SmartCache } from './services/smartCache'
import { logger, type LogContext } from './utils/logger'
import { hashPassword, verifyPassword } from './utils/security'
import { generateTokens, verifyToken } from './utils/jwt'
import { TRAINING_CATALOG } from './training.registry'

const prisma = new PrismaClient()
const server = createServer()

const io = new Server(server, {
  parser: msgpackParser as any,
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://vindexarena.iptime.org:5173',
      'http://192.168.0.2:5173',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // 성능 최적화 설정
  transports: ['websocket'],
  allowEIO3: true,
  pingTimeout: 20000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  allowRequest: (req, callback) => {
    // CORS preflight 요청 허용
    callback(null, true)
  },
})

// 핵심 서비스 초기화
const smartCache = new SmartCache({
  maxSize: 2000,
  defaultTTL: 300000, // 5분
  enableCompression: true,
})

const hybridSync = new HybridSyncService(io)
const resourceManager = new ResourceManager(hybridSync)

// 세션 관리
const activeSessions = new Map<string, { token: string; lastActivity: number }>()

// 소켓 연결 핸들러
io.on('connection', (socket) => {
  console.log('[Socket] 새로운 연결:', socket.id)
  console.log('[Socket] 현재 연결된 소켓 수:', io.engine.clientsCount)

  // 핑/퐁 핸들러
  socket.on('ping', (data: { timestamp: number }) => {
    socket.emit('pong', { timestamp: data.timestamp })
  })

  // 인증 핸들러
  socket.on('auth.login', async (userId: string) => {
    try {
      console.log('[Socket] auth.login 요청:', userId, '소켓 ID:', socket.id)
      socket.data.userId = userId
      socket.data.authenticated = true

      // 기존 세션이 있다면 제거
      if (activeSessions.has(userId)) {
        const existingSocket = Array.from(io.sockets.sockets.values()).find(
          (s) => s.data.userId === userId && s.id !== socket.id
        )
        if (existingSocket) {
          console.log('[Socket] 기존 소켓 연결 해제:', existingSocket.id)
          existingSocket.disconnect(true)
        }
      }

      // 새 세션 등록
      activeSessions.set(userId, {
        token: '',
        lastActivity: Date.now(),
      })

      console.log('[Socket] 인증 성공:', userId, '소켓 ID:', socket.id)
      socket.emit('auth.success', { userId })
    } catch (error) {
      console.error('[Socket] 인증 실패:', error)
      socket.emit('auth.error', { message: '인증에 실패했습니다.' })
    }
  })

  // 연결 해제 처리
  socket.on('disconnect', (reason) => {
    console.log('[Socket] 연결 해제:', socket.id, '사유:', reason)
    if (socket.data.userId) {
      activeSessions.delete(socket.data.userId)
      console.log('[Socket] 사용자 세션 정리됨:', socket.data.userId)
    }
  })

  // 에러 처리
  socket.on('error', (error) => {
    console.error('[Socket] 소켓 에러:', error)
  })
})

// HTTP 서버 설정 완료

// HTTP 서버를 0.0.0.0에 바인딩
server.listen(5174, '0.0.0.0', async () => {
  console.log('[HTTP Server] 0.0.0.0:5174에 바인딩됨')
  console.log('[Socket.IO] 서버 준비됨')

  // 데이터베이스 연결 테스트
  try {
    await prisma.$connect()
    console.log('[Database] 연결 성공')

    // 사용자 수 확인
    const userCount = await prisma.user.count()
    console.log(`[Database] 총 사용자 수: ${userCount}`)

    // fsseer 계정 확인
    const fsseerUser = await prisma.user.findUnique({
      where: { loginId: 'fsseer' },
      select: { id: true, loginId: true, nickname: true },
    })

    if (fsseerUser) {
      console.log(`[Database] fsseer 계정 발견: ${fsseerUser.nickname}`)
    } else {
      console.log('[Database] fsseer 계정이 존재하지 않습니다')
    }
  } catch (error) {
    console.error('[Database] 연결 실패:', error)
  }
})

// HTTP 서버 직접 처리 준비 완료

// HTTP 요청을 직접 처리 (Fastify 대신)
server.on('request', async (req, res) => {
  // CORS 헤더 설정
  const requestOrigin = req.headers.origin || ''
  const allowedOrigins = new Set([
    'http://vindexarena.iptime.org:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.0.2:5173',
  ])
  const originToUse = allowedOrigins.has(requestOrigin)
    ? requestOrigin
    : 'http://vindexarena.iptime.org:5173'

  res.setHeader('Access-Control-Allow-Origin', originToUse)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // 헬스체크
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        message: 'Server running on 0.0.0.0:5174',
      })
    )
    return
  }

  // ID 중복 확인 API
  if (req.url?.startsWith('/auth/check-id') && req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const id = url.searchParams.get('id')

      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false }))
        return
      }

      console.log(`[Check-ID] 중복 확인: ${id}`)

      const existing = await prisma.user.findUnique({
        where: { loginId: id },
        select: { id: true },
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          available: !existing,
        })
      )

      console.log(`[Check-ID] 결과: ${id} - ${existing ? '중복' : '사용가능'}`)
    } catch (error) {
      console.error('[Check-ID] 오류:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false }))
    }
    return
  }

  // 회원가입 API
  if (req.url === '/auth/register' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })

      req.on('end', async () => {
        try {
          const params = new URLSearchParams(body)
          const id = params.get('id') || params.get('loginId')
          const password = params.get('password')
          const confirm = params.get('confirm')
          const nickname = params.get('nickname') || id

          if (!id || !password || !confirm) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'INVALID_INPUT' }))
            return
          }

          if (password !== confirm) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'INVALID_INPUT' }))
            return
          }

          console.log(`[Register] 회원가입 시도: ${id}`)

          // 중복 확인
          const exists = await prisma.user.findFirst({
            where: {
              OR: [{ loginId: id }, { nickname: nickname || id }],
            },
            select: { id: true, loginId: true },
          })

          if (exists) {
            res.writeHead(409, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'DUPLICATE_ID' }))
            return
          }

          // 실제 비밀번호 해싱
          const hashedPassword = await hashPassword(password)
          console.log(`[Register] 비밀번호 해싱 완료: ${id}`)

          // 사용자 생성
          const user = await prisma.user.create({
            data: {
              loginId: id,
              nickname: nickname || id,
              pwHash: hashedPassword,
            },
          })

          console.log(`[Register] 사용자 생성 성공: ${id}`)

          // 회원가입 성공 시 JWT 토큰 생성
          const { accessToken, refreshToken } = await generateTokens(user.loginId)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: true,
              token: accessToken,
              refreshToken: refreshToken,
              user: { id: user.loginId, name: user.nickname },
            })
          )
        } catch (error) {
          console.error('[Register] 처리 오류:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'INTERNAL' }))
        }
      })
    } catch (error) {
      console.error('[Register] 요청 처리 오류:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'INTERNAL' }))
    }
    return
  }

  // 로그인 API
  if (req.url === '/auth/login' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })

      req.on('end', async () => {
        try {
          const params = new URLSearchParams(body)
          const id = params.get('id')
          const password = params.get('password')

          if (!id || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'ID와 비밀번호가 필요합니다.' }))
            return
          }

          console.log(`[Login] 사용자 검색: ${id}`)

          const user = await prisma.user.findUnique({
            where: { loginId: id },
            select: { id: true, loginId: true, pwHash: true, nickname: true },
          })

          console.log(`[Login] 검색 결과:`, user ? '사용자 발견' : '사용자 없음')

          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'USER_NOT_FOUND' }))
            return
          }

          // 실제 비밀번호 해시 검증
          try {
            console.log(`[Login] 입력된 비밀번호: ${password}`)
            console.log(`[Login] DB 해시: ${user.pwHash}`)

            console.log('[Login] 해시 검증 시도 중...')
            const isValidPassword = await verifyPassword(password, user.pwHash)
            console.log(`[Login] 해시 검증 결과: ${isValidPassword}`)

            if (isValidPassword) {
              // 로그인 성공 - JWT 토큰 생성 (loginId 사용)
              const { accessToken, refreshToken } = await generateTokens(user.loginId)

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  ok: true,
                  token: accessToken,
                  refreshToken: refreshToken,
                  user: { id: user.id, name: user.nickname },
                })
              )

              console.log(`[Login] 로그인 성공: ${id}`)
            } else {
              res.writeHead(401, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'WRONG_PASSWORD' }))
            }
          } catch (error) {
            console.error('[Login] 로그인 처리 오류:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: '서버 오류가 발생했습니다.' }))
          }
        } catch (error) {
          console.error('[Login] 처리 오류:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: '서버 오류가 발생했습니다.' }))
        }
      })
    } catch (error) {
      console.error('[Login] 요청 처리 오류:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: '서버 오류가 발생했습니다.' }))
    }
    return
  }

  // 토큰 검증 API
  if (req.url === '/api/auth/validate' && req.method === 'GET') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'No token' }))
        return
      }

      // 실제 JWT 토큰 검증
      try {
        const decoded = await verifyToken(token)

        if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: true,
              valid: true,
              user: { id: decoded.sub, name: decoded.sub },
            })
          )
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Invalid token' }))
        }
      } catch (tokenError) {
        console.error('[Validate] 토큰 검증 오류:', tokenError)
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Invalid token' }))
      }
    } catch (error) {
      console.error('[Validate] 오류:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Internal error' }))
    }
    return
  }

  // 훈련 카탈로그 API
  if (req.url === '/training/catalog' && req.method === 'GET') {
    try {
      console.log('[Training] 카탈로그 조회 요청')
      
      // 클라이언트가 기대하는 형식으로 데이터 변환
      const catalogItems = TRAINING_CATALOG.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        category: item.category,
        apCost: item.apCost,
        goldCost: item.goldCost || 0,
        stressDelta: item.stressDelta,
        weaponKind: item.weaponKind,
        weaponXp: item.weaponXp
      }))

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        ok: true,
        items: catalogItems
      }))
    } catch (error) {
      console.error('[Training] 카탈로그 조회 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'TRAINING_CATALOG_ERROR' }))
    }
    return
  }

  // 훈련 실행 API
  if (req.url === '/training/run' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })

      req.on('end', async () => {
        try {
          const params = new URLSearchParams(body)
          const trainingId = params.get('id')

          if (!trainingId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'INVALID_INPUT' }))
            return
          }

          // 훈련 아이템 찾기
          const trainingItem = TRAINING_CATALOG.find(item => item.id === trainingId)
          if (!trainingItem) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'TRAINING_NOT_FOUND' }))
            return
          }

          // TODO: 실제 훈련 실행 로직 구현
          const result = {
            success: true,
            trainingId,
            apCost: trainingItem.apCost,
            stressDelta: trainingItem.stressDelta,
            goldCost: trainingItem.goldCost || 0,
            message: `${trainingItem.name} 훈련이 완료되었습니다.`
          }

          console.log('[Training] 훈련 실행 완료:', result)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            ok: true,
            ...result
          }))
        } catch (error) {
          console.error('[Training] 훈련 실행 실패:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'TRAINING_EXECUTION_ERROR' }))
        }
      })
    } catch (error) {
      console.error('[Training] 훈련 실행 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'TRAINING_EXECUTION_ERROR' }))
    }
    return
  }

  // 빠른 액션 API
  if (req.url === '/training/quick' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })

      req.on('end', async () => {
        try {
          const params = new URLSearchParams(body)
          const type = params.get('type')

          if (!type || (type !== 'gold' && type !== 'stress')) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'INVALID_ACTION' }))
            return
          }

          let result
          if (type === 'gold') {
            result = {
              success: true,
              apCost: 5,
              goldGain: 10,
              message: 'AP 5를 소모하여 골드 10을 획득했습니다.'
            }
          } else if (type === 'stress') {
            result = {
              success: true,
              apCost: 2,
              stressReduction: 5,
              message: 'AP 2를 소모하여 스트레스 5를 감소시켰습니다.'
            }
          }

          console.log('[Training] 빠른 액션 실행 완료:', result)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            ok: true,
            ...result
          }))
        } catch (error) {
          console.error('[Training] 빠른 액션 실행 실패:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'QUICK_ACTION_ERROR' }))
        }
      })
    } catch (error) {
      console.error('[Training] 빠른 액션 실행 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'QUICK_ACTION_ERROR' }))
    }
    return
  }

  // 사용자 자원 API
  if (req.url === '/api/user/resources' && req.method === 'GET') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'No token' }))
        return
      }

      // 사용자 정보 및 자원 정보 반환
      try {
        const decoded = await verifyToken(token)
        console.log('[Resources] 토큰 디코딩 결과:', decoded)

        if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
          console.log('[Resources] 사용자 ID로 검색:', decoded.sub)

          // 실제 사용자 정보 조회
          const user = await prisma.user.findFirst({
            where: { loginId: decoded.sub },
            select: { id: true, loginId: true, nickname: true },
          })

          console.log('[Resources] 데이터베이스 검색 결과:', user)

          if (user) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                ok: true,
                character: {
                  level: 1,
                  exp: 0,
                  reputation: 0,
                },
                resources: {
                  ap: 100,
                  gold: 1000,
                  stress: 0,
                  lastApUpdate: Date.now(),
                },
              })
            )
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'User not found' }))
          }
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Invalid token' }))
        }
      } catch (tokenError) {
        console.error('[Resources] 토큰 검증 오류:', tokenError)
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Invalid token' }))
      }
    } catch (error) {
      console.error('[Resources] 오류:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Internal error' }))
    }
    return
  }

  // 기본 응답
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'Not Found' }))
})

// 서버 시작
const start = async () => {
  try {
    logger.info(`서버가 포트 5174에서 실행 중입니다.`)
    logger.info('서비스 초기화 완료')
  } catch (err) {
    logger.error('서버 시작 실패:', err as LogContext)
    process.exit(1)
  }
}

start()
