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

// 세션 관리: 로그인 ID 기준으로 최근 소켓/활동 관리
const activeSessions = new Map<string, { socketId: string; lastActivity: number }>()

// 간단 매칭 큐 (FIFO)
const waitingQueue: string[] = [] // socket.id 목록

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

      // 기존 세션이 있다면 비실시간 만료 및 신규 로그인 쪽에 확인 팝업 트리거
      const existing = activeSessions.get(userId)
      if (existing && existing.socketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(existing.socketId)
        if (oldSocket) {
          console.log('[Auth] 기존 세션 만료 알림:', existing.socketId)
          oldSocket.emit('duplicate.login', { error: 'DUPLICATE_LOGIN' })
          // 실제 연결은 바로 끊지 않고 비실시간 만료(사용자 확인 전까지 유지)
        }
      }

      // 새 세션 등록
      activeSessions.set(userId, { socketId: socket.id, lastActivity: Date.now() })

      console.log('[Socket] 인증 성공:', userId, '소켓 ID:', socket.id)
      socket.emit('auth.success', { userId })
    } catch (error) {
      console.error('[Socket] 인증 실패:', error)
      socket.emit('auth.error', { message: '인증에 실패했습니다.' })
    }
  })

  // 매칭 찾기 시작
  socket.on('match.find', () => {
    try {
      // 중복 방지
      if (!waitingQueue.includes(socket.id)) {
        waitingQueue.push(socket.id)
        console.log('[Match] 대기열 추가:', socket.id, '현재 대기:', waitingQueue.length)
      }

      // 두 명 이상이면 즉시 매칭
      while (waitingQueue.length >= 2) {
        const aId = waitingQueue.shift()!
        const bId = waitingQueue.shift()!
        const a = io.sockets.sockets.get(aId)
        const b = io.sockets.sockets.get(bId)

        if (!a || !b) {
          // 유효하지 않은 소켓은 건너뛰기
          if (a) waitingQueue.unshift(a.id)
          if (b) waitingQueue.unshift(b.id)
          break
        }

        console.log('[Match] 매칭 성사:', a.id, '<->', b.id)
        a.emit('match.found', { ok: true })
        b.emit('match.found', { ok: true })
      }
    } catch (e) {
      console.error('[Match] match.find 처리 오류:', e)
    }
  })

  // 매칭 취소
  socket.on('match.cancel', () => {
    const idx = waitingQueue.indexOf(socket.id)
    if (idx !== -1) {
      waitingQueue.splice(idx, 1)
      console.log('[Match] 대기열 취소:', socket.id, '남은 대기:', waitingQueue.length)
    }
  })

  // 연결 해제 처리
  socket.on('disconnect', (reason) => {
    console.log('[Socket] 연결 해제:', socket.id, '사유:', reason)
    // 매칭 대기열에서 제거
    const idx = waitingQueue.indexOf(socket.id)
    if (idx !== -1) {
      waitingQueue.splice(idx, 1)
      console.log('[Match] 대기열에서 제거(연결 해제):', socket.id)
    }
    if (socket.data.userId) {
      const cur = activeSessions.get(socket.data.userId)
      // 자신이 최신 세션일 때만 제거
      if (cur && cur.socketId === socket.id) {
        activeSessions.delete(socket.data.userId)
        console.log('[Socket] 사용자 세션 정리됨:', socket.data.userId)
      }
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

    // 상점 테이블 보장 및 시드
    await ensureShopTables()
    await seedShopItems()

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

              // 기존 세션 존재 여부 확인 (비실시간 만료 안내용)
              const existing = activeSessions.get(user.loginId)
              const hasExistingSession = !!existing
              const existingSessionInfo = existing
                ? {
                    lastActivity: existing.lastActivity,
                    message:
                      '다른 기기에서 로그인된 세션이 있습니다. 계속 진행하면 기존 세션이 종료됩니다.',
                  }
                : undefined

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  ok: true,
                  token: accessToken,
                  refreshToken: refreshToken,
                  user: { id: user.loginId, name: user.nickname },
                  hasExistingSession,
                  existingSessionInfo,
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
      const catalogItems = TRAINING_CATALOG.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        category: item.category,
        apCost: item.apCost,
        goldCost: item.goldCost || 0,
        stressDelta: item.stressDelta,
        weaponKind: item.weaponKind,
        weaponXp: item.weaponXp,
      }))

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          items: catalogItems,
        })
      )
    } catch (error) {
      console.error('[Training] 카탈로그 조회 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'TRAINING_CATALOG_ERROR' }))
    }
    return
  }

  // 상점 카탈로그 API
  if (req.url?.startsWith('/shop/catalog') && req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const shop = (url.searchParams.get('shop') || 'market').toLowerCase()

      const items = (await prisma.$queryRaw<any[]>`SELECT id, shop, name, description, category, price, sellPrice, effect FROM items WHERE shop = ${shop} ORDER BY price ASC`) as any[]

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          shop,
          items: items.map((it) => ({
            id: it.id,
            name: it.name,
            description: it.description || '',
            category: it.category,
            price: it.price,
            sellPrice: it.sellPrice ?? Math.floor((it.price || 0) / 2),
            effect: it.effect ? safeParseJson(it.effect) : undefined,
          })),
        })
      )
    } catch (error) {
      console.error('[Shop] 카탈로그 조회 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'SHOP_CATALOG_ERROR' }))
    }
    return
  }

  // 인벤토리 조회 API
  if (req.url === '/inventory' && req.method === 'GET') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'No token' }))
        return
      }

      const decoded = await verifyToken(token)
      if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Invalid token' }))
        return
      }

      const user = await prisma.user.findFirst({ where: { loginId: (decoded as any).sub }, select: { id: true } })
      if (!user) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'User not found' }))
        return
      }

      const rows = (await prisma.$queryRaw<any[]>`SELECT ii.id, ii.itemId, ii.quantity, i.name, i.description, i.category, i.price, i.sellPrice FROM inventory_items ii JOIN items i ON i.id = ii.itemId WHERE ii.userId = ${user.id} ORDER BY i.name ASC`) as any[]
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          items: rows.map((r) => ({
            inventoryItemId: r.id,
            itemId: r.itemId,
            name: r.name,
            description: r.description || '',
            category: r.category,
            price: r.price,
            sellPrice: r.sellPrice ?? Math.floor((r.price || 0) / 2),
            quantity: r.quantity,
          })),
        })
      )
    } catch (error) {
      console.error('[Inventory] 조회 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'INVENTORY_ERROR' }))
    }
    return
  }

  // 상점 구매 API
  if (req.url === '/shop/buy' && req.method === 'POST') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'No token' }))
        return
      }

      let body = ''
      req.on('data', (chunk) => (body += chunk.toString()))
      req.on('end', async () => {
        try {
          const data = safeParseBody(body)
          const itemId = data.itemId as string
          const quantity = Math.max(1, parseInt(String(data.quantity || '1'), 10) || 1)

          if (!itemId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'INVALID_INPUT', message: 'itemId가 필요합니다.' }))
            return
          }

          const decoded = await verifyToken(token)
          if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid token' }))
            return
          }

          const user = await prisma.user.findFirst({ where: { loginId: (decoded as any).sub }, select: { id: true } })
          if (!user) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'User not found' }))
            return
          }

          const item = (await prisma.$queryRaw<any[]>`SELECT id, name, price FROM items WHERE id = ${itemId} LIMIT 1`) as any[]
          if (!item.length) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'ITEM_NOT_FOUND' }))
            return
          }

          const price = Number(item[0].price || 0)
          const totalCost = price * quantity

          // 캐릭터 확보 (없으면 생성)
          const character = await ensureCharacter(user.id, String((decoded as any).sub))

          // 보유 골드 확인 및 구매 처리
          const rows = (await prisma.$queryRaw<any[]>`SELECT gold FROM characters WHERE userId = ${user.id} LIMIT 1`) as any[]
          const currentGold = Number(rows?.[0]?.gold || 0)
          if (currentGold < totalCost) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'NOT_ENOUGH_GOLD' }))
            return
          }

          await prisma.$transaction([
            prisma.$executeRawUnsafe(
              'UPDATE characters SET gold = gold - ? WHERE userId = ? AND gold >= ?;',
              totalCost,
              user.id,
              totalCost
            ),
            prisma.$executeRawUnsafe(
              'INSERT INTO inventory_items (id, userId, itemId, quantity) VALUES (?, ?, ?, ?) ON CONFLICT(userId, itemId) DO UPDATE SET quantity = quantity + excluded.quantity;',
              cryptoRandomId(),
              user.id,
              itemId,
              quantity
            ),
          ])

          const updated = (await prisma.$queryRaw<any[]>`SELECT gold FROM characters WHERE userId = ${user.id} LIMIT 1`) as any[]

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({ ok: true, itemId, quantity, gold: Number(updated?.[0]?.gold || 0) })
          )
        } catch (error) {
          console.error('[Shop] 구매 실패:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'SHOP_BUY_ERROR' }))
        }
      })
    } catch (error) {
      console.error('[Shop] 구매 처리 오류:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'SHOP_BUY_ERROR' }))
    }
    return
  }

  // 상점 판매 API (시장)
  if (req.url === '/shop/sell' && req.method === 'POST') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'No token' }))
        return
      }

      let body = ''
      req.on('data', (chunk) => (body += chunk.toString()))
      req.on('end', async () => {
        try {
          const data = safeParseBody(body)
          const itemId = data.itemId as string
          const quantity = Math.max(1, parseInt(String(data.quantity || '1'), 10) || 1)

          if (!itemId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'INVALID_INPUT', message: 'itemId가 필요합니다.' }))
            return
          }

          const decoded = await verifyToken(token)
          if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid token' }))
            return
          }

          const user = await prisma.user.findFirst({ where: { loginId: (decoded as any).sub }, select: { id: true } })
          if (!user) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'User not found' }))
            return
          }

          const item = (await prisma.$queryRaw<any[]>`SELECT id, name, price, sellPrice FROM items WHERE id = ${itemId} LIMIT 1`) as any[]
          if (!item.length) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'ITEM_NOT_FOUND' }))
            return
          }
          const sellPrice = Number(item[0].sellPrice ?? Math.floor(Number(item[0].price || 0) / 2))

          // 인벤토리 수량 확인
          const inv = (await prisma.$queryRaw<any[]>`SELECT id, quantity FROM inventory_items WHERE userId = ${user.id} AND itemId = ${itemId} LIMIT 1`) as any[]
          const curQty = Number(inv?.[0]?.quantity || 0)
          if (curQty < quantity) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'NOT_ENOUGH_ITEMS' }))
            return
          }

          const proceeds = sellPrice * quantity

          await prisma.$transaction([
            prisma.$executeRawUnsafe(
              'UPDATE inventory_items SET quantity = quantity - ? WHERE userId = ? AND itemId = ? AND quantity >= ?;',
              quantity,
              user.id,
              itemId,
              quantity
            ),
            prisma.$executeRawUnsafe(
              'UPDATE characters SET gold = gold + ? WHERE userId = ?;',
              proceeds,
              user.id
            ),
          ])

          const updatedInv = (await prisma.$queryRaw<any[]>`SELECT quantity FROM inventory_items WHERE userId = ${user.id} AND itemId = ${itemId} LIMIT 1`) as any[]
          const updatedGold = (await prisma.$queryRaw<any[]>`SELECT gold FROM characters WHERE userId = ${user.id} LIMIT 1`) as any[]

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: true,
              itemId,
              quantity,
              remaining: Number(updatedInv?.[0]?.quantity || 0),
              gold: Number(updatedGold?.[0]?.gold || 0),
            })
          )
        } catch (error) {
          console.error('[Shop] 판매 실패:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'SHOP_SELL_ERROR' }))
        }
      })
    } catch (error) {
      console.error('[Shop] 판매 처리 오류:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'SHOP_SELL_ERROR' }))
    }
    return
  }

  // 훈련 실행 API
  if (req.url === '/training/run' && req.method === 'POST') {
    console.log('[Training] 훈련 실행 API 호출됨')
    console.log('[Training] 요청 URL:', req.url)
    console.log('[Training] 요청 메서드:', req.method)
    console.log('[Training] 요청 헤더:', req.headers)

    try {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
        console.log('[Training] 데이터 청크 수신:', chunk.toString())
      })

      req.on('end', async () => {
        try {
          console.log('[Training] 훈련 실행 요청 body 완료:', body)
          console.log('[Training] body 길이:', body.length)
          console.log('[Training] body 타입:', typeof body)

          // JSON 요청 처리
          let requestData
          try {
            requestData = JSON.parse(body)
            console.log('[Training] JSON 파싱 성공:', requestData)
          } catch (parseError) {
            console.log('[Training] JSON 파싱 실패, URLSearchParams 시도:', parseError)
            // JSON 파싱 실패 시 URLSearchParams로 시도
            const params = new URLSearchParams(body)
            requestData = { id: params.get('id') }
            console.log('[Training] URLSearchParams 결과:', requestData)
          }

          const trainingId = requestData.id
          console.log('[Training] 추출된 훈련 ID:', trainingId)

          if (!trainingId) {
            console.log('[Training] 훈련 ID 누락')
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                ok: false,
                error: 'INVALID_INPUT',
                message: '훈련 ID가 필요합니다.',
              })
            )
            return
          }

          console.log('[Training] 훈련 ID 검증 완료:', trainingId)

          // 훈련 아이템 찾기
          const trainingItem = TRAINING_CATALOG.find((item) => item.id === trainingId)
          console.log('[Training] TRAINING_CATALOG 길이:', TRAINING_CATALOG.length)
          console.log('[Training] 찾으려는 ID:', trainingId)
          console.log(
            '[Training] 사용 가능한 ID들:',
            TRAINING_CATALOG.map((item) => item.id)
          )

          if (!trainingItem) {
            console.log('[Training] 훈련 아이템을 찾을 수 없음')
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                ok: false,
                error: 'TRAINING_NOT_FOUND',
                message: '존재하지 않는 훈련입니다.',
              })
            )
            return
          }

          console.log('[Training] 훈련 아이템 찾음:', trainingItem.name)

          // TODO: 실제 훈련 실행 로직 구현
          const result = {
            success: true,
            trainingId,
            apCost: trainingItem.apCost,
            stressDelta: trainingItem.stressDelta,
            goldCost: trainingItem.goldCost || 0,
            message: `${trainingItem.name} 훈련이 완료되었습니다.`,
          }

          console.log('[Training] 훈련 실행 완료:', result)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: true,
              ...result,
            })
          )
        } catch (error) {
          console.error('[Training] 훈련 실행 실패:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: false,
              error: 'TRAINING_EXECUTION_ERROR',
              message: '훈련 실행 중 오류가 발생했습니다.',
            })
          )
        }
      })
    } catch (error) {
      console.error('[Training] 훈련 실행 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: false,
          error: 'TRAINING_EXECUTION_ERROR',
          message: '훈련 실행 중 오류가 발생했습니다.',
        })
      )
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
          console.log('[Training] 빠른 액션 요청 body:', body)

          // JSON 요청 처리
          let requestData
          try {
            requestData = JSON.parse(body)
          } catch {
            // JSON 파싱 실패 시 URLSearchParams로 시도
            const params = new URLSearchParams(body)
            requestData = { type: params.get('type') }
          }

          const type = requestData.type

          if (!type || (type !== 'gold' && type !== 'stress')) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                ok: false,
                error: 'INVALID_ACTION',
                message: '잘못된 액션 타입입니다.',
              })
            )
            return
          }

          console.log('[Training] 빠른 액션 타입:', type)

          let result
          if (type === 'gold') {
            result = {
              success: true,
              apCost: 5,
              goldGain: 10,
              message: 'AP 5를 소모하여 골드 10을 획득했습니다.',
            }
          } else if (type === 'stress') {
            result = {
              success: true,
              apCost: 2,
              stressReduction: 5,
              message: 'AP 2를 소모하여 스트레스 5를 감소시켰습니다.',
            }
          }

          console.log('[Training] 빠른 액션 실행 완료:', result)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: true,
              ...result,
            })
          )
        } catch (error) {
          console.error('[Training] 빠른 액션 실행 실패:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: false,
              error: 'QUICK_ACTION_ERROR',
              message: '빠른 액션 실행 중 오류가 발생했습니다.',
            })
          )
        }
      })
    } catch (error) {
      console.error('[Training] 빠른 액션 실행 실패:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: false,
          error: 'QUICK_ACTION_ERROR',
          message: '빠른 액션 실행 중 오류가 발생했습니다.',
        })
      )
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

// 유틸 및 초기화 함수들
function safeParseJson(v: string | null): unknown | undefined {
  if (!v) return undefined
  try {
    return JSON.parse(v)
  } catch {
    return undefined
  }
}

function safeParseBody(body: string): Record<string, unknown> {
  if (!body) return {}
  try {
    return JSON.parse(body)
  } catch {
    const p = new URLSearchParams(body)
    const obj: Record<string, unknown> = {}
    p.forEach((val, key) => {
      obj[key] = val
    })
    return obj
  }
}

async function ensureCharacter(userId: string, fallbackName: string) {
  const existing = await prisma.character.findFirst({ where: { userId } })
  if (existing) return existing
  return prisma.character.create({ data: { userId, name: fallbackName } })
}

function cryptoRandomId(): string {
  // 간단한 임시 ID 생성기 (충분히 랜덤한 문자열)
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

async function ensureShopTables() {
  // SQLite용 테이블 보장
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      shop TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      sellPrice INTEGER,
      effect TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME
    );`
  )
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_items_shop ON items(shop);')

  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(userId, itemId)
    );`
  )
}

async function seedShopItems() {
  const countRows = (await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM items`) as any[]
  const total = Number(countRows?.[0]?.cnt || 0)
  if (total > 0) return

  const now = new Date().toISOString()
  const batch: Array<any> = [
    // 식당 메뉴
    { id: cryptoRandomId(), shop: 'restaurant', name: '갈비 스튜', description: '든든한 스튜. AP 소량 회복', category: 'food', price: 30, sellPrice: null, effect: JSON.stringify({ ap: +10 }) },
    { id: cryptoRandomId(), shop: 'restaurant', name: '빵', description: '간단한 식사', category: 'food', price: 10, sellPrice: null, effect: JSON.stringify({ ap: +4 }) },
    { id: cryptoRandomId(), shop: 'restaurant', name: '포도주', description: '마시면 기분이 좋아진다', category: 'food', price: 20, sellPrice: null, effect: JSON.stringify({ stress: -5 }) },
    // 시장 소모품
    { id: cryptoRandomId(), shop: 'market', name: '회복약', description: '체력을 회복한다', category: 'consumable', price: 50, sellPrice: 25, effect: JSON.stringify({ heal: 50 }) },
    { id: cryptoRandomId(), shop: 'market', name: '해독제', description: '중독을 해제한다', category: 'consumable', price: 40, sellPrice: 20, effect: JSON.stringify({ cure: 'poison' }) },
    { id: cryptoRandomId(), shop: 'market', name: '붕대', description: '출혈을 멈춘다', category: 'consumable', price: 20, sellPrice: 10, effect: JSON.stringify({ cure: 'bleed' }) },
  ]

  for (const it of batch) {
    await prisma.$executeRawUnsafe(
      'INSERT OR IGNORE INTO items (id, shop, name, description, category, price, sellPrice, effect, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      it.id,
      it.shop,
      it.name,
      it.description,
      it.category,
      it.price,
      it.sellPrice,
      it.effect,
      now,
      now
    )
  }
  console.log('[Shop] 기본 아이템 시드 완료')
}
