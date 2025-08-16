import { io } from 'socket.io-client'
import msgpackParser from 'socket.io-msgpack-parser'

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

// note: isHttps no longer used; tunnel detection suffices

const isTunnel = (() => {
  const hostFromEnv = (() => {
    try {
      if (!envOrigin) return ''
      const u = new URL(envOrigin)
      return u.hostname
    } catch {
      return ''
    }
  })()
  const hostFromWin = typeof window !== 'undefined' ? window.location.hostname : ''
  return hostFromEnv.endsWith('loca.lt') || hostFromWin.endsWith('loca.lt')
})()

export const socket = io(envOrigin && envOrigin.length > 0 ? envOrigin : defaultOrigin, {
  autoConnect: true,
  // LocalTunnel(HTTPS 프록시)에서는 WebSocket이 종종 차단되므로 polling만 사용
  transports: isTunnel ? ['polling'] : ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 300,
  reconnectionDelayMax: 1500,
  forceNew: true,
  upgrade: !isTunnel,
  path: '/socket.io',
  timeout: 10000,
  parser: msgpackParser,
  // 일부 터널/프록시는 바이너리 POST를 차단하므로 base64로 강제
  ...(isTunnel
    ? {
        // socket.io-client runtime accepts these for polling base64 fallback
        forceBase64: true as unknown as undefined,
        transportOptions: { polling: { forceBase64: true as unknown as undefined } },
      }
    : {}),
})
