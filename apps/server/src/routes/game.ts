import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createSuccessResponse, createErrorResponse } from '../types/api'
import { SmartCache } from '../services/smartCache'
import { ResourceManager } from '../services/resourceManager'
import { logger } from '../utils/logger'

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
        logger.debug('캐시된 캐릭터 정보 반환', { characterId: id })
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
      logger.error('캐릭터 정보 조회 실패', { error })
      return createErrorResponse('CHARACTER_FETCH_ERROR', '캐릭터 정보 조회에 실패했습니다.')
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
        logger.debug('캐시된 자원 정보 반환', { characterId })
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
      logger.error('자원 정보 조회 실패', { error })
      return createErrorResponse('RESOURCES_FETCH_ERROR', '자원 정보 조회에 실패했습니다.')
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

      logger.info('훈련 실행 완료', { characterId, trainingType, result })
      return createSuccessResponse(result)
    } catch (error) {
      logger.error('훈련 실행 실패', { error })
      return createErrorResponse('TRAINING_EXECUTION_ERROR', '훈련 실행에 실패했습니다.')
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
      logger.error('전투 상태 조회 실패', { error })
      return createErrorResponse('BATTLE_FETCH_ERROR', '전투 상태 조회에 실패했습니다.')
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
        logger.debug('캐시된 게임 상태 반환', { characterId })
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
          ap: resources.currentValue,
          gold: resources.currentValue,
          stress: resources.currentValue,
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
      logger.error('게임 상태 조회 실패', { error })
      return createErrorResponse('GAME_STATE_FETCH_ERROR', '게임 상태 조회에 실패했습니다.')
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

      logger.info('캐시 무효화 실행', { pattern, key, invalidated })
      return createSuccessResponse({ invalidated })
    } catch (error) {
      logger.error('캐시 무효화 실패', { error })
      return createErrorResponse('CACHE_INVALIDATE_ERROR', '캐시 무효화에 실패했습니다.')
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
