/// <reference types="node" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const envAllowed = (process.env.ALLOWED_HOSTS ?? '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

// iptime.org 도메인에서는 HMR 비활성화 (WebSocket 문제 방지)
const isIptimeDomain = envAllowed.some((host) => host.includes('iptime.org'))

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow user-provided hosts via env (포트포워딩 환경)
    allowedHosts: envAllowed,
    // iptime.org 도메인에서는 HMR 비활성화
    hmr: isIptimeDomain
      ? false
      : {
          protocol: 'ws',
          host: 'localhost',
          port: 5173,
        },
  },
})
