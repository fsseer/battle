module.exports = {
  apps: [
    {
      name: 'gladiator-api',
      cwd: '../../apps/server',
      script: 'npm',
      args: 'run dev',
      env: {
        PORT: process.env.PORT || '5174',
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://web.example.com',
        AP_REGEN_MS: process.env.AP_REGEN_MS || '6000',
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
}
