// 공통 API 응답 타입
export interface ApiResponse<T = any> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    version: string
    requestId: string
  }
}

// 성공 응답 헬퍼
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ApiResponse['meta']>
): ApiResponse<T> {
  return {
    ok: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: generateRequestId(),
      ...meta,
    },
  }
}

// 에러 응답 헬퍼
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  meta?: Partial<ApiResponse['meta']>
): ApiResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: generateRequestId(),
      ...meta,
    },
  }
}

// 요청 ID 생성
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 페이지네이션 타입
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta
}

// 게임 관련 공통 타입
export interface GameStats {
  str: number
  agi: number
  sta: number
  int: number
  luck: number
  fate: number
}

export interface GameResources {
  ap: number
  apMax: number
  gold: number
  stress: number
  stressMax: number
  lastApUpdate: string
}

export interface GameCharacter {
  id: string
  name: string
  level: number
  exp: number
  stats: GameStats
  resources: GameResources
}

// 실시간 업데이트 타입
export interface RealTimeUpdate<T> {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'REPLACE'
  entity: string
  id: string
  data: T
  timestamp: string
  version: number
}

// 웹소켓 이벤트 타입
export interface WebSocketEvent<T = any> {
  event: string
  data: T
  timestamp: string
  requestId?: string
}

// 인증 관련 타입
export interface AuthResponse {
  user: {
    id: string
    nickname: string
    character: GameCharacter
  }
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

// 훈련 관련 타입
export interface TrainingItem {
  id: string
  name: string
  description: string
  apCost: number
  goldCost: number
  effects: {
    str?: number
    agi?: number
    sta?: number
    weaponXp?: number
    stressDelta?: number
  }
  requirements?: {
    level?: number
    stats?: Partial<GameStats>
    items?: string[]
  }
}

export interface TrainingResult {
  success: boolean
  character: Partial<GameCharacter>
  rewards?: {
    exp?: number
    gold?: number
    items?: string[]
  }
  message: string
}
