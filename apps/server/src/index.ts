import Fastify from 'fastify'
import cors from '@fastify/cors'
import { Server } from 'socket.io'

const fastify = Fastify({ logger: true })
await fastify.register(cors, { origin: true })

fastify.get('/health', async () => ({ ok: true }))

const io = new Server(fastify.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Simple auth route (placeholder): validates length and whitespace, returns a fake token and profile
const SPECIAL_PASSWORDS: Record<string, string> = { fsseer: '0608' }

fastify.post('/auth/login', async (request, reply) => {
  try {
    const body = request.body as { id?: string; password?: string }
    const id = (body?.id ?? '').trim()
    const pw = body?.password ?? ''
    const invalid =
      !id || !pw ||
      id.length < 4 || id.length > 24 ||
      pw.length < 4 || pw.length > 24 ||
      /\s/.test(id) || /\s/.test(pw)
    if (invalid) {
      return reply.code(400).send({ ok: false, error: 'INVALID_CREDENTIALS' })
    }
    // Special-case credential check for demo accounts
    const expected = SPECIAL_PASSWORDS[id]
    if (expected && pw !== expected) {
      return reply.code(401).send({ ok: false, error: 'INVALID_CREDENTIALS' })
    }

    const token = Buffer.from(`${id}:${Date.now()}`).toString('base64')
    const user = {
      id,
      name: id,
      characters: [
        { id: 'char-1', name: 'Novice Gladiator', level: 1, stats: { str: 5, agi: 5, sta: 5 } }
      ]
    }
    return { ok: true, token, user }
  } catch (e) {
    request.log.error(e)
    return reply.code(500).send({ ok: false, error: 'SERVER_ERROR' })
  }
})

type Role = 'ATTACK' | 'DEFENSE'
type SkillId = 'slash' | 'feint' | 'block' | 'parry'

const beats: Record<SkillId, SkillId> = {
  slash: 'parry',
  feint: 'block',
  block: 'slash',
  parry: 'feint',
}

io.on('connection', (socket) => {
  fastify.log.info({ sid: socket.id }, 'socket connected')
  socket.emit('server.hello', { id: socket.id })

  socket.on('queue.join', () => {
    fastify.log.info({ sid: socket.id }, 'queue.join received')
    socket.join(`battle:${socket.id}`)
    io.to(socket.id).emit('match.found', { opponent: 'bot' })
    // 초기 배틀 상태
    socket.data.battle = { round: 1, role: 'ATTACK' as Role }
  })

  socket.on('battle.choose', (skillId: SkillId) => {
    const battle = socket.data.battle as { round: number; role: Role } | undefined
    if (!battle) return
    // 봇 선택: 현재 역할에 맞는 랜덤 더미
    const candidates: SkillId[] = battle.role === 'ATTACK' ? ['slash', 'feint'] : ['block', 'parry']
    const bot = candidates[Math.floor(Math.random() * candidates.length)]

    let result: 'WIN' | 'LOSE' | 'DRAW' = 'DRAW'
    if (beats[skillId] === bot) result = 'WIN'
    else if (beats[bot] === skillId) result = 'LOSE'

    // 결과 전송 및 다음 라운드로
    io.to(socket.id).emit('battle.resolve', {
      round: battle.round,
      self: skillId,
      opp: bot,
      result,
      nextRole: result === 'WIN' ? 'ATTACK' : result === 'LOSE' ? 'DEFENSE' : battle.role,
    })
    battle.round += 1
    battle.role = result === 'WIN' ? 'ATTACK' : result === 'LOSE' ? 'DEFENSE' : battle.role
  })
})

const PORT = Number(process.env.PORT ?? 5174)
await fastify.listen({ port: PORT, host: '0.0.0.0' })
fastify.log.info(`Server listening on http://localhost:${PORT}`)


