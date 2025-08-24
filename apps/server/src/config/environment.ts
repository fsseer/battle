import { config } from 'dotenv'

// .env 파일 로드
config()

export const ENV = {
  // 서버 설정
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5174', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // 데이터베이스
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',

  // JWT 설정
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // 보안 설정
  PASSWORD_SALT_ROUNDS: parseInt(process.env.PASSWORD_SALT_ROUNDS || '12', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15분
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10),

  // CORS 설정
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],

  // 게임 설정
  AP_REGEN_INTERVAL_MS: parseInt(process.env.AP_REGEN_INTERVAL_MS || '10000', 10), // 10초
  MAX_AP: parseInt(process.env.MAX_AP || '100', 10),
  MAX_STRESS: parseInt(process.env.MAX_STRESS || '200', 10),

  // 로깅 설정
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Redis 설정 (향후 사용)
  REDIS_URL: process.env.REDIS_URL,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // 모니터링 설정
  ENABLE_METRICS: process.env.ENABLE_METRICS === 'true',
  METRICS_PORT: parseInt(process.env.METRICS_PORT || '9090', 10),
} as const

// 환경별 설정 검증
export function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET']
  const missing = required.filter((key) => !ENV[key as keyof typeof ENV])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if (ENV.NODE_ENV === 'production' && ENV.JWT_SECRET === 'your-secret-key-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production')
  }
}

// 개발 환경 확인
export const isDevelopment = ENV.NODE_ENV === 'development'
export const isProduction = ENV.NODE_ENV === 'production'
export const isTest = ENV.NODE_ENV === 'test'
