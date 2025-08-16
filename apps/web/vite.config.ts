/// <reference types="node" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const envAllowed = (process.env.ALLOWED_HOSTS ?? '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

const defaultExternalHost = 'gladiator-web.loca.lt'
const hmrProtocol = (process.env.HMR_PROTOCOL || 'wss') as 'ws' | 'wss'
const hmrHost = process.env.HMR_HOST || defaultExternalHost
const hmrClientPort = Number(process.env.HMR_PORT || (hmrProtocol === 'wss' ? 443 : 5173))

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow external tunneling host or user-provided hosts via env
    allowedHosts: [defaultExternalHost, ...envAllowed],
    hmr: {
      protocol: hmrProtocol,
      host: hmrHost,
      clientPort: hmrClientPort,
    },
  },
})
