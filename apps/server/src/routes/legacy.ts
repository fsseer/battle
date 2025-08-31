import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '../utils/jwt'

const prisma = new PrismaClient()

export async function registerLegacyRoutes(app: FastifyInstance) {
  // Admin: grant gold to all characters (test helper)
  app.post('/admin/grant-gold', async (req, reply) => {
    try {
      const amount = Math.max(0, parseInt(String((req.body as any)?.amount ?? '1000'), 10) || 0)
      await prisma.$executeRawUnsafe('UPDATE characters SET gold = gold + ?;', amount)
      return { ok: true, amount }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ ok: false, error: 'ADMIN_GRANT_GOLD_ERROR' })
    }
  })
  // ID duplication check
  app.get('/auth/check-id', async (req, reply) => {
    try {
      const id = (req.query as any)?.id as string | undefined
      if (!id) return reply.code(400).send({ ok: false })
      const existing = await prisma.user.findUnique({
        where: { loginId: id },
        select: { id: true },
      })
      return { ok: true, available: !existing }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ ok: false })
    }
  })

  // Alias for auth validate
  app.get('/api/auth/validate', async (req, reply) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return reply.code(401).send({ ok: false, error: 'No token' })
      const decoded = await verifyToken(token)
      if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        return reply.code(401).send({ ok: false, error: 'Invalid token' })
      }
      return { ok: true, valid: true, user: { id: (decoded as any).sub } }
    } catch (e) {
      return reply.code(401).send({ ok: false, error: 'Invalid token' })
    }
  })

  // Shop catalog
  app.get('/shop/catalog', async (req, reply) => {
    try {
      const shop = String((req.query as any)?.shop || 'market').toLowerCase()
      const items = (await prisma.$queryRaw<any[]>`
        SELECT id, shop, name, description, category, price, sellPrice, effect FROM items WHERE shop = ${shop} ORDER BY price ASC
      `) as any[]
      return {
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
      }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ ok: false, error: 'SHOP_CATALOG_ERROR' })
    }
  })

  // Inventory (auth)
  app.get('/inventory', async (req, reply) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return reply.code(401).send({ ok: false, error: 'No token' })
      const decoded = await verifyToken(token)
      if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        return reply.code(401).send({ ok: false, error: 'Invalid token' })
      }
      const user = await prisma.user.findFirst({
        where: { loginId: (decoded as any).sub },
        select: { id: true },
      })
      if (!user) return reply.code(404).send({ ok: false, error: 'User not found' })
      const rows = (await prisma.$queryRaw<any[]>`
        SELECT ii.id, ii.itemId, ii.quantity, i.name, i.description, i.category, i.price, i.sellPrice
        FROM inventory_items ii JOIN items i ON i.id = ii.itemId
        WHERE ii.userId = ${user.id} ORDER BY i.name ASC
      `) as any[]
      return {
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
      }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ ok: false, error: 'INVENTORY_ERROR' })
    }
  })

  // Shop buy (auth)
  app.post('/shop/buy', async (req, reply) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return reply.code(401).send({ ok: false, error: 'No token' })
      const decoded = await verifyToken(token)
      if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        return reply.code(401).send({ ok: false, error: 'Invalid token' })
      }
      const body = req.body as any
      const itemId = String(body?.itemId || '')
      const quantity = Math.max(1, parseInt(String(body?.quantity || '1'), 10) || 1)
      if (!itemId) return reply.code(400).send({ ok: false, error: 'INVALID_INPUT' })

      const user = await prisma.user.findFirst({
        where: { loginId: (decoded as any).sub },
        select: { id: true },
      })
      if (!user) return reply.code(404).send({ ok: false, error: 'User not found' })
      const item = (await prisma.$queryRaw<
        any[]
      >`SELECT id, price FROM items WHERE id = ${itemId} LIMIT 1`) as any[]
      if (!item.length) return reply.code(404).send({ ok: false, error: 'ITEM_NOT_FOUND' })
      const totalCost = Number(item[0].price || 0) * quantity
      const rows = (await prisma.$queryRaw<
        any[]
      >`SELECT gold FROM characters WHERE userId = ${user.id} LIMIT 1`) as any[]
      const currentGold = Number(rows?.[0]?.gold || 0)
      if (currentGold < totalCost)
        return reply.code(400).send({ ok: false, error: 'NOT_ENOUGH_GOLD' })

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
      const updated = (await prisma.$queryRaw<
        any[]
      >`SELECT gold FROM characters WHERE userId = ${user.id} LIMIT 1`) as any[]
      return { ok: true, itemId, quantity, gold: Number(updated?.[0]?.gold || 0) }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ ok: false, error: 'SHOP_BUY_ERROR' })
    }
  })

  // Shop sell (auth)
  app.post('/shop/sell', async (req, reply) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return reply.code(401).send({ ok: false, error: 'No token' })
      const decoded = await verifyToken(token)
      if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        return reply.code(401).send({ ok: false, error: 'Invalid token' })
      }
      const body = req.body as any
      const itemId = String(body?.itemId || '')
      const quantity = Math.max(1, parseInt(String(body?.quantity || '1'), 10) || 1)
      if (!itemId) return reply.code(400).send({ ok: false, error: 'INVALID_INPUT' })

      const user = await prisma.user.findFirst({
        where: { loginId: (decoded as any).sub },
        select: { id: true },
      })
      if (!user) return reply.code(404).send({ ok: false, error: 'User not found' })
      const item = (await prisma.$queryRaw<
        any[]
      >`SELECT id, price, sellPrice FROM items WHERE id = ${itemId} LIMIT 1`) as any[]
      if (!item.length) return reply.code(404).send({ ok: false, error: 'ITEM_NOT_FOUND' })
      const sellPrice = Number(item[0].sellPrice ?? Math.floor(Number(item[0].price || 0) / 2))

      const inv = (await prisma.$queryRaw<
        any[]
      >`SELECT id, quantity FROM inventory_items WHERE userId = ${user.id} AND itemId = ${itemId} LIMIT 1`) as any[]
      const curQty = Number(inv?.[0]?.quantity || 0)
      if (curQty < quantity) return reply.code(400).send({ ok: false, error: 'NOT_ENOUGH_ITEMS' })

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
      const updatedInv = (await prisma.$queryRaw<
        any[]
      >`SELECT quantity FROM inventory_items WHERE userId = ${user.id} AND itemId = ${itemId} LIMIT 1`) as any[]
      const updatedGold = (await prisma.$queryRaw<
        any[]
      >`SELECT gold FROM characters WHERE userId = ${user.id} LIMIT 1`) as any[]
      return {
        ok: true,
        itemId,
        quantity,
        remaining: Number(updatedInv?.[0]?.quantity || 0),
        gold: Number(updatedGold?.[0]?.gold || 0),
      }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ ok: false, error: 'SHOP_SELL_ERROR' })
    }
  })

  // User resources (auth)
  app.get('/api/user/resources', async (req, reply) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return reply.code(401).send({ ok: false, error: 'No token' })
      const decoded = await verifyToken(token)
      if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        return reply.code(401).send({ ok: false, error: 'Invalid token' })
      }
      const user = await prisma.user.findFirst({
        where: { loginId: (decoded as any).sub },
        select: { id: true, nickname: true },
      })
      if (!user) return reply.code(404).send({ ok: false, error: 'User not found' })
      let character = await prisma.character.findFirst({ where: { userId: user.id } })
      if (!character) {
        character = await prisma.character.create({
          data: {
            userId: user.id,
            name: user.nickname || (decoded as any).sub,
            level: 1,
            ap: 60,
            apMax: 60,
            gold: 1000,
            stress: 0,
            stressMax: 200,
          },
        })
      }
      return {
        ok: true,
        character: { level: character.level, exp: character.exp, reputation: 0 },
        resources: {
          ap: character.ap,
          apMax: character.apMax ?? 60,
          gold: character.gold,
          stress: character.stress,
          stressMax: character.stressMax ?? 100,
          lastApUpdate: Date.now(),
        },
      }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ ok: false, error: 'Internal error' })
    }
  })
}

function safeParseJson(v: string | null): unknown | undefined {
  if (!v) return undefined
  try {
    return JSON.parse(v)
  } catch {
    return undefined
  }
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}
