import { ENV } from '../config/environment'

export interface LogContext {
  [key: string]: any
}

export interface LogLevel {
  ERROR: 0
  WARN: 1
  INFO: 2
  DEBUG: 3
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
}

const currentLogLevel = LOG_LEVELS[ENV.LOG_LEVEL.toUpperCase() as keyof LogLevel] || LOG_LEVELS.INFO

class Logger {
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level}] ${message}${contextStr}`
  }

  private shouldLog(level: number): boolean {
    return level <= currentLogLevel
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage('ERROR', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.formatMessage('INFO', message, context))
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, context))
    }
  }

  // 성능 측정용 로깅
  time(label: string): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.time(`[PERF] ${label}`)
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.timeEnd(`[PERF] ${label}`)
    }
  }

  // API 요청/응답 로깅
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, context)
  }

  apiResponse(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? 'WARN' : 'INFO'
    const message = `API Response: ${method} ${url} - ${statusCode} (${responseTime}ms)`

    if (level === 'WARN') {
      this.warn(message, context)
    } else {
      this.info(message, context)
    }
  }

  // 보안 관련 로깅
  security(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, context)
  }

  // 게임 이벤트 로깅
  gameEvent(event: string, context?: LogContext): void {
    this.info(`Game Event: ${event}`, context)
  }

  // 데이터베이스 로깅
  database(operation: string, table: string, context?: LogContext): void {
    this.debug(`Database: ${operation} on ${table}`, context)
  }
}

export const logger = new Logger()

// Fastify 로거 어댑터
export function createFastifyLogger() {
  return {
    level: ENV.LOG_LEVEL,
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.ip,
        remotePort: req.connection.remotePort,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
    },
    customLevels: {
      security: 35,
      game: 25,
    },
    customLogLevels: {
      req: 'info',
      res: 'info',
      security: 'security',
      game: 'game',
    },
  }
}
