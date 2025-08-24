// 서버와 동일한 API 응답 타입 (타입 동기화)
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

// 게임 관련 타입들
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

// API 요청 상태 관리
export interface ApiRequestState<T = any> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastUpdated: number | null
  isStale: boolean
}

// 실시간 데이터 구독 타입
export interface DataSubscription<T = any> {
  id: string
  entity: string
  entityId: string
  callback: (data: T) => void
  lastData?: T
  isActive: boolean
}

// 캐시 전략 타입
export interface CacheStrategy {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of items
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  invalidateOnUpdate: boolean // Update 시 캐시 무효화 여부
}

// API 클라이언트 설정
export interface ApiClientConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  enableCache: boolean
  enableOfflineSupport: boolean
  requestInterceptors: Array<(config: any) => any>
  responseInterceptors: Array<(response: any) => any>
}

// 웹소켓 연결 상태
export interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  reconnectAttempts: number
  lastConnected: number | null
  lastDisconnected: number | null
}

// 실시간 게임 상태
export interface GameState {
  character: GameCharacter | null
  resources: GameResources | null
  isInBattle: boolean
  battleId?: string
  opponent?: {
    id: string
    nickname: string
    level: number
  }
  lastActionTime: number
  serverTimeOffset: number // 클라이언트-서버 시간 차이
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

// 에러 코드 상수
export const ERROR_CODES = {
  // 인증 관련
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 게임 관련
  INSUFFICIENT_AP: 'INSUFFICIENT_AP',
  INSUFFICIENT_GOLD: 'INSUFFICIENT_GOLD',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',

  // 네트워크 관련
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',

  // 유효성 검증
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
