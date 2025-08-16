import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const envAllowed = (process.env.ALLOWED_HOSTS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const defaultExternalHost = 'gladiator-web.loca.lt'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow external tunneling host
    allowedHosts: [defaultExternalHost, ...envAllowed],
    hmr: {
      protocol: 'wss',
      host: process.env.HMR_HOST || defaultExternalHost,
      clientPort: Number(process.env.HMR_PORT || 443),
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
