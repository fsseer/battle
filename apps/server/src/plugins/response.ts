import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

function createTraceId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export default fp(async function responsePlugin(app: FastifyInstance) {
  // requestId 부여
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const traceId = createTraceId()
    ;(req as any).traceId = traceId
    reply.header('X-Request-Id', traceId)
  })

  // 404 통일 처리
  app.setNotFoundHandler((req, reply) => {
    const traceId = (req as any).traceId
    reply.code(404).send({ code: 'NOT_FOUND', message: 'Not found.', traceId })
  })

  // 에러 통일 처리
  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode || 500
    const code = (err as any).code || (status === 400 ? 'BAD_REQUEST' : status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR')
    const message = err.message || 'Internal server error.'
    const traceId = (req as any).traceId
    reply.code(status).send({ code, message, traceId })
  })
})


