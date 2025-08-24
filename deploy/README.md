# Gladiator Deployment Guide (Nginx + WS)

## 1) Prerequisites

- Ubuntu 22.04 LTS or similar
- Nginx, Certbot
- Node.js 20+

## 2) Fastify Server

```
# On server
export CORS_ORIGIN=https://web.example.com
export AP_REGEN_MS=6000
export PORT=5174
# run with PM2 or systemd
```

## 3) Web Build

```
cd apps/web
# set VITE_SERVER_ORIGIN in .env.production
VITE_SERVER_ORIGIN=https://api.example.com npm run build
# copy dist to /var/www/battle-web/dist
```

## 4) Nginx

- Put `deploy/nginx/battle.conf` into `/etc/nginx/sites-available/battle.conf`
- Symlink to sites-enabled and reload

```
sudo ln -s /etc/nginx/sites-available/battle.conf /etc/nginx/sites-enabled/battle.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 5) TLS

- Issue certs via certbot

```
sudo certbot --nginx -d api.example.com -d web.example.com
```

## 6) Notes

- Socket.IO needs `proxy_http_version 1.1` and `Upgrade/Connection` headers
- Prefer WebSocket transport in production (client auto picks)
- Disable compression on the app server to reduce latency
