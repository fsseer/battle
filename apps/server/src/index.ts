import Fastify from 'fastify'
import cors from '@fastify/cors'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { evaluateSkills, evaluateTraits, type StatKey } from './skills.registry'
import { TRAINING_CATALOG, type TrainingId } from './training.registry'

const fastify = Fastify({ logger: true })
// Allow CORS from local dev and optionally any origin via env (for quick testing over internet)
const corsEnv = process.env.CORS_ORIGIN || ''
const extraCorsOrigin = corsEnv ? corsEnv.split(',') : []
const allowAll = corsEnv.trim() === '*'
await fastify.register(cors, {
  origin: allowAll ? true : ['http://127.0.0.1:5173', 'http://localhost:5173', ...extraCorsOrigin],
})

fastify.get('/health', async () => ({ ok: true }))

const io = new Server(fastify.server, {
  cors: allowAll
    ? { origin: '*', methods: ['GET', 'POST'] }
    : { origin: ['http://127.0.0.1:5173', 'http://localhost:5173', ...extraCorsOrigin], methods: ['GET', 'POST'] },
})

const prisma = new PrismaClient()
const AP_REGEN_MS = Number(process.env.AP_REGEN_MS ?? 6 * 1000)
// AP regen: 6분당 1, 최대 100
function applyApRegen(ch: any) {
  const now = Date.now()
  const last = new Date(ch.apUpdatedAt).getTime()
  const elapsedMs = Math.max(0, now - last)
  const gained = Math.floor(elapsedMs / AP_REGEN_MS)
  if (gained <= 0) return ch
  const nextAp = Math.min(100, (ch.ap ?? 0) + gained)
  return { ...ch, ap: nextAp, apUpdatedAt: new Date(now) }
}

async function saveApIfChanged(chBefore: any, chAfter: any) {
  if (chAfter.ap !== chBefore.ap) {
    await prisma.character.update({
      where: { id: chBefore.id },
      data: { ap: chAfter.ap, apUpdatedAt: chAfter.apUpdatedAt },
    })
  }
}

function parseLoginIdFromToken(bearer?: string): string | null {
  if (!bearer) return null
  const token = bearer.replace(/^Bearer\s+/i, '')
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [loginId] = decoded.split(':')
    return loginId || null
  } catch {
    return null
  }
}
// Simple auth route with persistence
const SPECIAL_PASSWORDS: Record<string, string> = { fsseer: '0608' }

fastify.post('/auth/login', async (request, reply) => {
  try {
    const body = request.body as { id?: string; password?: string }
    const id = (body?.id ?? '').trim()
    const pw = body?.password ?? ''
    const isAlnum = (s: string) => /^[A-Za-z0-9]+$/.test(s)
    const invalid =
      !id ||
      !pw ||
      id.length < 4 ||
      id.length > 24 ||
      pw.length < 4 ||
      pw.length > 24 ||
      /\s/.test(id) ||
      /\s/.test(pw) ||
      !isAlnum(id) ||
      !isAlnum(pw)
    if (invalid) {
      return reply.code(400).send({ ok: false, error: 'INVALID_INPUT' })
    }
    // Special-case credential check for demo accounts
    const expected = SPECIAL_PASSWORDS[id]
    if (expected && pw !== expected) {
      return reply.code(401).send({ ok: false, error: 'WRONG_PASSWORD' })
    }

    // Find user (no auto-create here)
    const user = await prisma.user.findUnique({
      where: { loginId: id },
      include: { characters: true },
    })
    if (!user) return reply.code(404).send({ ok: false, error: 'USER_NOT_FOUND' })
    if (!expected) {
      const ok = await bcrypt.compare(pw, user.pwHash)
      if (!ok) return reply.code(401).send({ ok: false, error: 'WRONG_PASSWORD' })
    }
    const token = Buffer.from(`${user.loginId}:${Date.now()}`).toString('base64')
    return {
      ok: true,
      token,
      user: {
        id: user.loginId,
        name: user.name,
        characters: user.characters.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          stats: { str: c.str, agi: c.agi, sta: c.sta },
        })),
      },
    }
  } catch (e) {
    request.log.error(e)
    return reply.code(500).send({ ok: false, error: 'SERVER_ERROR' })
  }
})

fastify.get('/me', async (request, reply) => {
  const loginId = parseLoginIdFromToken(request.headers.authorization)
  if (!loginId) return reply.code(401).send({ ok: false })
  request.log.info({ route: '/me', loginId }, 'me request')
  const user = await prisma.user.findUnique({
    where: { loginId },
    include: { characters: { include: { proficiencies: true } } },
  })
  if (!user) {
    request.log.warn({ route: '/me', loginId }, 'user not found')
    return reply.code(404).send({ ok: false })
  }
  // apply AP regen on first character for now
  const ch0 = user.characters?.[0]
  if (ch0) {
    const updated = applyApRegen(ch0)
    await saveApIfChanged(ch0, updated)
    user.characters[0] = updated as any
  }
  return { ok: true, user: { id: user.loginId, name: user.name, characters: user.characters } }
})

// Skills/Traits evaluation (temporary, using registry + basic mapping)
fastify.get('/skills', async (request) => {
  const loginId = parseLoginIdFromToken(request.headers.authorization) ?? 'fsseer'
  const user = await prisma.user.findUnique({
    where: { loginId },
    include: { characters: { include: { proficiencies: true } } },
  })
  const ch = user?.characters?.[0]
  const stats: Record<StatKey, number> = {
    str: ch?.str ?? 5,
    agi: ch?.agi ?? 5,
    int: (ch as any)?.int ?? 5,
    luck: (ch as any)?.luck ?? 5,
    fate: (ch as any)?.fate ?? 0,
  }
  const profs = Object.fromEntries((ch?.proficiencies ?? []).map((p) => [p.kind, p.level])) as any
  // naive equipped kinds until equipment model exists
  const equippedKinds: any[] = ['ONE_HAND']
  const weaponSkills = evaluateSkills({ stats, profs, equippedKinds })
  const traits = evaluateTraits({ stats, profs })
  return {
    weaponSkills,
    characterSkills: weaponSkills.filter((w) => w.skill.category !== 'WEAPON'),
    traits,
  }
})

fastify.post('/train/proficiency', async (request, reply) => {
  const loginId = parseLoginIdFromToken(request.headers.authorization)
  if (!loginId) return reply.code(401).send({ ok: false })
  request.log.info({ route: '/train/proficiency', loginId }, 'train request')
  const body = request.body as { kind: any; xp?: number }
  const kind = body?.kind
  if (!kind) return reply.code(400).send({ ok: false })
  const user = await prisma.user.findUnique({ where: { loginId }, include: { characters: true } })
  const ch = user?.characters?.[0]
  if (!ch) {
    request.log.warn({ route: '/train/proficiency', loginId }, 'character not found')
    return reply.code(404).send({ ok: false })
  }
  // consume 1 AP to train
  const chUpdated = applyApRegen(ch)
  const cost = 1
  if ((chUpdated.ap ?? 0) < cost) {
    return reply.code(400).send({ ok: false, error: 'NOT_ENOUGH_AP' })
  }
  const afterSpend = { ...chUpdated, ap: chUpdated.ap - cost, apUpdatedAt: new Date() }
  await saveApIfChanged(ch, afterSpend)
  const xpGain = body.xp ?? 100
  const prof = await prisma.weaponProficiency.upsert({
    where: { characterId_kind: { characterId: ch.id, kind } },
    update: { xp: { increment: xpGain } },
    create: { characterId: ch.id, kind, xp: xpGain, level: 0 },
  })
  // recompute level: 100 xp per level
  const newLevel = Math.floor(prof.xp / 100)
  if (newLevel !== prof.level) {
    await prisma.weaponProficiency.update({ where: { id: prof.id }, data: { level: newLevel } })
  }
  const all = await prisma.weaponProficiency.findMany({ where: { characterId: ch.id } })
  return { ok: true, proficiencies: all, ap: afterSpend.ap }
})

// Simple training: earn gold by spending AP
fastify.post('/train/earn', async (request, reply) => {
  const loginId = parseLoginIdFromToken(request.headers.authorization)
  if (!loginId) return reply.code(401).send({ ok: false })
  const body = request.body as { apCost?: number; gold?: number }
  const apCost = Math.max(1, Math.min(50, body?.apCost ?? 5))
  const goldGain = Math.max(1, Math.min(1000, body?.gold ?? 10))
  const user = await prisma.user.findUnique({ where: { loginId }, include: { characters: true } })
  const ch = user?.characters?.[0]
  if (!ch) return reply.code(404).send({ ok: false })
  const afterRegen = applyApRegen(ch)
  if ((afterRegen.ap ?? 0) < apCost)
    return reply.code(400).send({ ok: false, error: 'NOT_ENOUGH_AP' })
  const updated = await prisma.character.update({
    where: { id: ch.id },
    data: { ap: afterRegen.ap - apCost, apUpdatedAt: new Date(), gold: { increment: goldGain } },
  })
  return {
    ok: true,
    character: { id: updated.id, ap: updated.ap, gold: updated.gold, stress: updated.stress },
  }
})

// Simple training: rest to reduce stress by spending AP
fastify.post('/train/rest', async (request, reply) => {
  const loginId = parseLoginIdFromToken(request.headers.authorization)
  if (!loginId) return reply.code(401).send({ ok: false })
  const body = request.body as { apCost?: number; stressRelief?: number }
  const apCost = Math.max(0, Math.min(50, body?.apCost ?? 2))
  const relief = Math.max(1, Math.min(100, body?.stressRelief ?? 5))
  const user = await prisma.user.findUnique({ where: { loginId }, include: { characters: true } })
  const ch = user?.characters?.[0]
  if (!ch) return reply.code(404).send({ ok: false })
  const afterRegen = applyApRegen(ch)
  if ((afterRegen.ap ?? 0) < apCost)
    return reply.code(400).send({ ok: false, error: 'NOT_ENOUGH_AP' })
  const newStress = Math.max(0, (afterRegen.stress ?? 0) - relief)
  const updated = await prisma.character.update({
    where: { id: ch.id },
    data: { ap: afterRegen.ap - apCost, apUpdatedAt: new Date(), stress: newStress },
  })
  return {
    ok: true,
    character: { id: updated.id, ap: updated.ap, gold: updated.gold, stress: updated.stress },
  }
})

// Catalog + run specific training item (BASIC/WEAPON)
fastify.get('/training/catalog', async () => ({ ok: true, items: TRAINING_CATALOG }))

fastify.post('/training/run', async (request, reply) => {
  const loginId = parseLoginIdFromToken(request.headers.authorization)
  if (!loginId) return reply.code(401).send({ ok: false })
  const body = request.body as { id?: TrainingId }
  const id = body?.id
  const item = TRAINING_CATALOG.find((t) => t.id === id)
  if (!item) return reply.code(400).send({ ok: false, error: 'INVALID_TRAINING' })
  const user = await prisma.user.findUnique({ where: { loginId }, include: { characters: true } })
  const ch = user?.characters?.[0]
  if (!ch) return reply.code(404).send({ ok: false })
  const staged = applyApRegen(ch)
  if ((staged.ap ?? 0) < item.apCost)
    return reply.code(400).send({ ok: false, error: 'NOT_ENOUGH_AP' })
  if ((item.goldCost ?? 0) > 0 && (staged.gold ?? 0) < (item.goldCost ?? 0))
    return reply.code(400).send({ ok: false, error: 'NOT_ENOUGH_GOLD' })
  const data: any = {
    ap: staged.ap - item.apCost,
    apUpdatedAt: new Date(),
    stress: Math.max(0, (staged.stress ?? 0) + item.stressDelta),
  }
  if (item.goldCost) data.gold = { decrement: item.goldCost }
  const updated = await prisma.character.update({ where: { id: ch.id }, data })
  if (item.weaponKind && item.weaponXp) {
    await prisma.weaponProficiency.upsert({
      where: { characterId_kind: { characterId: ch.id, kind: item.weaponKind } },
      update: { xp: { increment: item.weaponXp } },
      create: { characterId: ch.id, kind: item.weaponKind, xp: item.weaponXp, level: 0 },
    })
  }
  return {
    ok: true,
    character: { id: updated.id, ap: updated.ap, gold: updated.gold, stress: updated.stress },
  }
})

// Debug: echo who the server sees from the Authorization header
fastify.get('/debug/whoami', async (request) => {
  const loginId = parseLoginIdFromToken(request.headers.authorization)
  return { loginId }
})
// Registration endpoint
fastify.post('/auth/register', async (request, reply) => {
  try {
    const body = request.body as { id?: string; password?: string; confirm?: string }
    const id = (body?.id ?? '').trim()
    const pw = body?.password ?? ''
    const confirm = body?.confirm ?? ''
    const invalidLenId = id.length < 4 || id.length > 24
    const invalidLenPw = pw.length < 4 || pw.length > 24
    const invalidWsId = /\s/.test(id)
    const invalidWsPw = /\s/.test(pw)
    const invalidCsId = !/^[A-Za-z0-9]+$/.test(id)
    const invalidCsPw = !/^[A-Za-z0-9]+$/.test(pw)
    if (
      !id ||
      !pw ||
      !confirm ||
      invalidLenId ||
      invalidLenPw ||
      invalidWsId ||
      invalidWsPw ||
      invalidCsId ||
      invalidCsPw ||
      pw !== confirm
    ) {
      return reply.code(400).send({
        ok: false,
        error: 'INVALID_INPUT',
        errorDetails: {
          idLength: invalidLenId,
          pwLength: invalidLenPw,
          idWhitespace: invalidWsId,
          pwWhitespace: invalidWsPw,
          idCharset: invalidCsId,
          pwCharset: invalidCsPw,
          mismatch: pw !== confirm,
        },
      })
    }
    const exists = await prisma.user.findUnique({ where: { loginId: id } })
    if (exists) return reply.code(409).send({ ok: false, error: 'DUPLICATE_ID' })
    const pwHash = await bcrypt.hash(pw, 10)
    const user = await prisma.user.create({
      data: {
        loginId: id,
        pwHash,
        name: id,
        characters: { create: [{ name: 'Novice Gladiator', level: 1, str: 5, agi: 5, sta: 5 }] },
      },
      include: { characters: true },
    })
    const token = Buffer.from(`${user.loginId}:${Date.now()}`).toString('base64')
    return {
      ok: true,
      token,
      user: {
        id: user.loginId,
        name: user.name,
        characters: user.characters.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          stats: { str: c.str, agi: c.agi, sta: c.sta },
        })),
      },
    }
  } catch (e) {
    request.log.error({ err: e }, 'register failed')
    return reply.code(500).send({ ok: false, error: 'SERVER_ERROR' })
  }
})

// Check ID availability
fastify.post('/auth/check-id', async (request, reply) => {
  try {
    const body = request.body as { id?: string }
    const id = (body?.id ?? '').trim()
    if (!id || id.length < 4 || id.length > 24 || /\s/.test(id) || !/^[A-Za-z0-9]+$/.test(id)) {
      return reply.code(400).send({ ok: false, error: 'INVALID_ID' })
    }
    const exists = await prisma.user.findUnique({ where: { loginId: id } })
    return { ok: true, available: !exists }
  } catch (e) {
    request.log.error({ err: e }, 'check-id failed')
    return reply.code(500).send({ ok: false })
  }
})

// DEV ONLY: admin delete user (no auth)
fastify.post('/admin/delete-user', async (request, reply) => {
  const body = request.body as { id?: string }
  const id = (body?.id ?? '').trim()
  if (!id) return reply.code(400).send({ ok: false })
  const u = await prisma.user.findUnique({ where: { loginId: id } })
  if (!u) return { ok: true, deleted: 0 }
  await prisma.character.deleteMany({ where: { userId: u.id } })
  await prisma.user.delete({ where: { id: u.id } })
  return { ok: true, deleted: 1 }
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
