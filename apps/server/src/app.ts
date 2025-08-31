import fastify from 'fastify'
import cors from '@fastify/cors'
import formbody from '@fastify/formbody'
import { registerRoutes as registerAuthFastify } from './routes/auth'
import { registerGameRoutes } from './routes/game'
import { SmartCache } from './services/smartCache'
import { ResourceManager } from './services/resourceManager'
import { HybridSyncService } from './services/hybridSync'
import { registerLegacyRoutes } from './routes/legacy'
import responsePlugin from './plugins/response'
import { ENV } from './config/environment'

export async function buildApp(options: {
  smartCache: SmartCache
  resourceManager: ResourceManager
  hybrid: HybridSyncService
}) {
  const app = fastify({ logger: true })

  await app.register(cors, {
    origin: ENV.CORS_ORIGIN,
    credentials: true,
  })
  await app.register(formbody)
  await app.register(responsePlugin)

  // health
  app.get('/health', async () => ({ ok: true, message: 'OK' }))

  // feature routes
  await registerAuthFastify(app)
  await registerGameRoutes(app, {
    smartCache: options.smartCache,
    resourceManager: options.resourceManager,
  })
  await registerLegacyRoutes(app)

  return app
}
