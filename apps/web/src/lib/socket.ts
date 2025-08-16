import { io } from 'socket.io-client'

// Vite 환경에서만 존재하는 import.meta.env 접근을 안전하게 처리
type ViteMetaEnv = { VITE_SERVER_ORIGIN?: string }
const rawEnvOrigin = (import.meta as unknown as { env?: ViteMetaEnv })?.env?.VITE_SERVER_ORIGIN
const envOrigin = rawEnvOrigin ? rawEnvOrigin.trim().replace(/\/+$/, '') : undefined
const defaultOrigin =
  typeof window !== 'undefined'
    ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5174'
      : `${window.location.protocol}//${window.location.hostname}:5174`
    : 'http://127.0.0.1:5174'

const isHttps = (() => {
  if (envOrigin) return envOrigin.startsWith('https://')
  if (typeof window !== 'undefined') return window.location.protocol === 'https:'
  return false
})()

export const socket = io(envOrigin && envOrigin.length > 0 ? envOrigin : defaultOrigin, {
  autoConnect: true,
  // 터널(HTTPS)에서는 우선 websocket 업그레이드를 시도하고 실패 시 polling으로 폴백
  transports: isHttps ? ['websocket', 'polling'] : ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 300,
  reconnectionDelayMax: 2000,
  forceNew: true,
  upgrade: true,
  path: '/socket.io',
})
