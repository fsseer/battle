#!/usr/bin/env bash
set -euo pipefail

# Usage: sudo bash server-setup.sh api.example.com web.example.com
API_DOMAIN=${1:-api.example.com}
WEB_DOMAIN=${2:-web.example.com}

apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Place nginx config (expects repo synced to /opt/gladiator)
cp /opt/gladiator/deploy/nginx/battle.conf /etc/nginx/sites-available/battle.conf
ln -sf /etc/nginx/sites-available/battle.conf /etc/nginx/sites-enabled/battle.conf
nginx -t && systemctl reload nginx

# TLS certificates (interactive)
certbot --nginx -d "$API_DOMAIN" -d "$WEB_DOMAIN"

echo "Done. Configure PM2 or systemd to run API and sync web dist to /var/www/battle-web/dist"

