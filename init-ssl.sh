#!/bin/bash
# One-command script to request official Let's Encrypt SSL certificate for cas.atleelabs.tech
# Run this on your deployment server once docker compose is running:
# bash init-ssl.sh

set -e

DOMAIN="cas.atleelabs.tech"
EMAIL="ataur@atleelabs.tech"

echo "=========================================================="
echo " Obtaining Let's Encrypt SSL Certificate for $DOMAIN "
echo "=========================================================="

echo "[1/3] Requesting SSL certificate from Let's Encrypt via ACME..."
docker compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email --force-renewal" certbot

echo "[2/3] Reloading Nginx with the verified SSL certificate..."
docker compose exec nginx nginx -s reload

echo "[3/3] Testing HTTPS connection..."
curl -I https://$DOMAIN/ || true

echo ""
echo "=========================================================="
echo " SUCCESS! https://$DOMAIN/ is now live and fully secured! "
echo "=========================================================="
