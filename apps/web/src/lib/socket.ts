import { io } from 'socket.io-client'

const rawEnvOrigin = (import.meta as any)?.env?.VITE_SERVER_ORIGIN as string | undefined
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
  transports: isHttps ? ['polling'] : ['websocket'],
  upgrade: false,
})
