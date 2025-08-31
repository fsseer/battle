import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createSuccessResponse, createErrorResponse } from '../types/api'
import { SmartCache } from '../services/smartCache'
import { ResourceManager } from '../services/resourceManager'
import { logger } from '../utils/logger'
import { TRAINING_CATALOG } from '../training.registry'

interface GameRoutesOptions {
  smartCache: SmartCache
  resourceManager: ResourceManager
}

export async function registerGameRoutes(fastify: FastifyInstance, options: GameRoutesOptions) {
  const { smartCache, resourceManager } = options

  // 캐릭터 정보 조회 (폴링 기반, 캐싱 적용)
  fastify.get('/character/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const cacheKey = `character:${id}`

      // 캐시 확인
      const cached = smartCache.get(cacheKey)
      if (cached) {
        logger.debug('Return cached character', { characterId: id })
        return createSuccessResponse(cached)
      }

      // 데이터베이스에서 조회 (실제 구현 필요)
      const character = await getCharacterFromDB(id)

      // 캐시에 저장 (30초 TTL, 중간 우선순위)
      smartCache.set(cacheKey, character, {
        ttl: 30000,
        priority: 'MEDIUM',
      })

      return createSuccessResponse(character)
    } catch (error) {
      logger.error('Character fetch failed', { error })
      return createErrorResponse('CHARACTER_FETCH_ERROR', 'Failed to fetch character.')
    }
  })

  // 자원 상태 조회 (이벤트 기반, 캐싱 적용)
  fastify.get('/resources/:characterId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { characterId } = request.params as { characterId: string }
      const cacheKey = `resources:${characterId}`

      // 캐시 확인
      const cached = smartCache.get(cacheKey)
      if (cached) {
        logger.debug('Return cached resources', { characterId })
        return createSuccessResponse(cached)
      }

      // 자원 매니저에서 상태 조회
      const resources = resourceManager.getResourceState(characterId, 'all')

      // 캐시에 저장 (10초 TTL, 높은 우선순위)
      smartCache.set(cacheKey, resources, {
        ttl: 10000,
        priority: 'HIGH',
      })

      return createSuccessResponse(resources)
    } catch (error) {
      logger.error('Resources fetch failed', { error })
      return createErrorResponse('RESOURCES_FETCH_ERROR', 'Failed to fetch resources.')
    }
  })

  // 훈련 실행 (즉시 처리, 캐시 무효화)
  fastify.post('/training/:characterId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { characterId } = request.params as { characterId: string }
      const { trainingType } = request.body as { trainingType: string }

      // 훈련 실행 (실제 구현 필요)
      const result = await executeTraining(characterId, trainingType)

      // 관련 캐시 무효화
      smartCache.invalidate(`character:${characterId}`)
      smartCache.invalidate(`resources:${characterId}`)

      // 자원 변경사항 즉시 업데이트
      resourceManager.batchUpdateResources(
        characterId,
        {
          ap: result.newAp,
          gold: result.newGold,
          stress: result.newStress,
        },
        'training'
      )

      logger.info('Training executed', { characterId, trainingType, result })
      return createSuccessResponse(result)
    } catch (error) {
      logger.error('Training execution failed', { error })
      return createErrorResponse('TRAINING_EXECUTION_ERROR', 'Failed to execute training.')
    }
  })

  // 전투 상태 조회 (실시간, 캐싱 없음)
  fastify.get('/battle/:battleId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { battleId } = request.params as { battleId: string }

      // 전투는 실시간이므로 캐싱하지 않음
      const battleState = await getBattleStateFromDB(battleId)

      return createSuccessResponse(battleState)
    } catch (error) {
      logger.error('Battle fetch failed', { error })
      return createErrorResponse('BATTLE_FETCH_ERROR', 'Failed to fetch battle state.')
    }
  })

  // 게임 상태 일괄 조회 (폴링 기반, 압축된 응답)
  fastify.get('/game-state/:characterId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { characterId } = request.params as { characterId: string }
      const cacheKey = `gameState:${characterId}`

      // 캐시 확인
      const cached = smartCache.get(cacheKey)
      if (cached) {
        logger.debug('Return cached game state', { characterId })
        return createSuccessResponse(cached)
      }

      // 여러 데이터를 일괄 조회
      const [character, resources, trainingProgress] = await Promise.all([
        getCharacterFromDB(characterId),
        resourceManager.getResourceState(characterId, 'all'),
        getTrainingProgressFromDB(characterId),
      ])

      // 압축된 게임 상태 생성
      const gameState = {
        character: {
          id: character.id,
          name: character.name,
          level: character.level,
          exp: character.exp,
        },
        resources: {
          ap: (resources as any).ap ?? 0,
          gold: (resources as any).gold ?? 0,
          stress: (resources as any).stress ?? 0,
        },
        training: trainingProgress,
        lastUpdate: new Date().toISOString(),
      }

      // 캐시에 저장 (1분 TTL, 낮은 우선순위)
      smartCache.set(cacheKey, gameState, {
        ttl: 60000,
        priority: 'LOW',
      })

      return createSuccessResponse(gameState)
    } catch (error) {
      logger.error('Game state fetch failed', { error })
      return createErrorResponse('GAME_STATE_FETCH_ERROR', 'Failed to fetch game state.')
    }
  })

  // 훈련 카탈로그 조회
  fastify.get('/training/catalog', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.debug('Training catalog requested')

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

      return createSuccessResponse({ items: catalogItems })
    } catch (error) {
      logger.error('Training catalog fetch failed', { error })
      return createErrorResponse('TRAINING_CATALOG_ERROR', 'Failed to fetch training catalog.')
    }
  })

  // 훈련 실행
  fastify.post('/training/run', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id: trainingId } = request.body as { id: string }
      const token = request.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return createErrorResponse('UNAUTHORIZED', 'Authentication required.')
      }

      // TODO: 토큰에서 사용자 ID 추출 및 검증
      const userId = 'temp-user-id' // 실제로는 JWT에서 추출

      // 훈련 아이템 찾기
      const trainingItem = TRAINING_CATALOG.find((item) => item.id === trainingId)
      if (!trainingItem) {
        return createErrorResponse('TRAINING_NOT_FOUND', 'Training not found.')
      }

      // TODO: 실제 훈련 실행 로직 구현
      const result = {
        success: true,
        trainingId,
        apCost: trainingItem.apCost,
        stressDelta: trainingItem.stressDelta,
        goldCost: trainingItem.goldCost || 0,
        message: `${trainingItem.name} 훈련이 완료되었습니다.`,
      }

      logger.info('Training executed', { userId, trainingId, result })
      return createSuccessResponse(result)
    } catch (error) {
      logger.error('Training execution failed', { error })
      return createErrorResponse('TRAINING_EXECUTION_ERROR', 'Failed to execute training.')
    }
  })

  // 빠른 액션 (AP 소모로 골드 획득 또는 스트레스 감소)
  fastify.post('/training/quick', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { type } = request.body as { type: 'gold' | 'stress' }
      const token = request.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return createErrorResponse('UNAUTHORIZED', 'Authentication required.')
      }

      // TODO: 토큰에서 사용자 ID 추출 및 검증
      const userId = 'temp-user-id' // 실제로는 JWT에서 추출

      let result
      if (type === 'gold') {
        result = {
          success: true,
          apCost: 5,
          goldGain: 10,
          message: 'Consumed AP 5 and gained Gold 10.',
        }
      } else if (type === 'stress') {
        result = {
          success: true,
          apCost: 2,
          stressReduction: 5,
          message: 'Consumed AP 2 and reduced Stress by 5.',
        }
      } else {
        return createErrorResponse('INVALID_ACTION', 'Invalid action type.')
      }

      logger.info('Quick action executed', { userId, type, result })
      return createSuccessResponse(result)
    } catch (error) {
      logger.error('Quick action execution failed', { error })
      return createErrorResponse('QUICK_ACTION_ERROR', 'Failed to execute quick action.')
    }
  })

  // 캐시 통계 조회 (관리자용)
  fastify.get('/admin/cache-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = smartCache.getStats()
      const cacheInfo = smartCache.getCacheInfo()

      return createSuccessResponse({
        stats,
        cacheInfo,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('캐시 통계 조회 실패', { error })
      return createErrorResponse('CACHE_STATS_ERROR', '캐시 통계 조회에 실패했습니다.')
    }
  })

  // 캐시 무효화 (관리자용)
  fastify.post('/admin/cache/invalidate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { pattern, key } = request.body as { pattern?: string; key?: string }

      let invalidated = 0
      if (key) {
        smartCache.invalidate(key)
        invalidated = 1
      } else if (pattern) {
        invalidated = smartCache.deletePattern(new RegExp(pattern))
      }

      logger.info('Cache invalidation executed', { pattern, key, invalidated })
      return createSuccessResponse({ invalidated })
    } catch (error) {
      logger.error('Cache invalidation failed', { error })
      return createErrorResponse('CACHE_INVALIDATE_ERROR', 'Failed to invalidate cache.')
    }
  })
}

// 데이터베이스 조회 함수들 (실제 구현 필요)
async function getCharacterFromDB(id: string) {
  // TODO: 실제 데이터베이스 조회 구현
  return {
    id,
    name: '테스트 캐릭터',
    level: 1,
    exp: 0,
    stats: { str: 10, agi: 10, sta: 10, int: 10, luck: 10, fate: 10 },
    resources: { ap: 100, apMax: 100, gold: 1000, stress: 0, stressMax: 200 },
  }
}

async function executeTraining(characterId: string, trainingType: string) {
  // TODO: 실제 훈련 로직 구현
  return {
    success: true,
    newAp: 90,
    newGold: 950,
    newStress: 20,
    expGained: 50,
    message: '훈련이 완료되었습니다.',
  }
}

async function getBattleStateFromDB(battleId: string) {
  // TODO: 실제 전투 상태 조회 구현
  return {
    id: battleId,
    status: 'active',
    turn: 1,
    players: [],
    lastAction: new Date().toISOString(),
  }
}

async function getTrainingProgressFromDB(characterId: string) {
  // TODO: 실제 훈련 진행도 조회 구현
  return {
    currentTraining: null,
    completedTrainings: [],
    totalExp: 0,
  }
}
