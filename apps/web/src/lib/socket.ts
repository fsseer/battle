import { io } from 'socket.io-client'
import msgpackParser from 'socket.io-msgpack-parser'

// Vite 환경에서만 존재하는 import.meta.env 접근을 안전하게 처리
type ViteMetaEnv = { VITE_SERVER_ORIGIN?: string }
const rawEnvOrigin = (import.meta as unknown as { env?: ViteMetaEnv })?.env?.VITE_SERVER_ORIGIN
const envOrigin = rawEnvOrigin ? rawEnvOrigin.trim().replace(/\/+$/, '') : undefined

// 환경 변수가 설정되지 않은 경우 강제로 외부 도메인 감지
const isExternalDomain =
  typeof window !== 'undefined' && window.location.hostname.includes('iptime.org')
const forceExternalOrigin = isExternalDomain ? `http://${window.location.hostname}:5174` : undefined

// 현재 호스트에 따른 서버 주소 결정
const getServerOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5174'
  }

  const hostname = window.location.hostname
  const protocol = window.location.protocol

  // iptime.org 도메인인 경우 - 외부 접근용 (포트포워딩 테스트)
  if (hostname.includes('iptime.org')) {
    return `http://${hostname}:5174` // 포트포워딩이 설정되어 있다면 외부 도메인 사용
  }

  // localhost인 경우
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5174'
  }

  // 기타 도메인인 경우
  return `${protocol}//${hostname}:5174`
}

const defaultOrigin = getServerOrigin()

console.log('[Socket] 환경 변수 주소:', envOrigin)
console.log('[Socket] 강제 외부 도메인:', forceExternalOrigin)
console.log('[Socket] 기본 주소:', defaultOrigin)

// 최종 서버 주소 결정 (우선순위: 환경변수 > 강제감지 > 기본값)
const finalOrigin = envOrigin || forceExternalOrigin || defaultOrigin

console.log('[Socket] 최종 서버 주소:', finalOrigin)

export const socket = io(finalOrigin, {
  autoConnect: true,
  // 성능 최적화: WebSocket만 사용
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 3, // 재연결 시도 횟수 줄임
  reconnectionDelay: 2000, // 재연결 지연 증가
  reconnectionDelayMax: 10000, // 최대 지연 증가
  forceNew: false,
  upgrade: false, // 업그레이드 비활성화로 안정성 향상
  path: '/socket.io',
  timeout: 15000, // 타임아웃 증가
  parser: msgpackParser,
  // 성능 최적화 옵션
  closeOnBeforeunload: false,
  autoUnref: false,
})

// 소켓 연결 상태 모니터링
socket.on('connect', () => {
  console.log('[Socket] 연결 성공:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('[Socket] 연결 해제:', reason)
})

socket.on('connect_error', (error) => {
  console.error('[Socket] 연결 에러:', error)
})

socket.on('reconnect', (attemptNumber) => {
  console.log('[Socket] 재연결 성공:', attemptNumber)
})

socket.on('reconnect_error', (error) => {
  console.error('[Socket] 재연결 에러:', error)
})

socket.on('reconnect_failed', () => {
  console.error('[Socket] 재연결 실패')
})
