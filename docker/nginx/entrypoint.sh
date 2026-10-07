#!/bin/sh
set -e

CERT_DIR="/etc/letsencrypt/live/cas.atleelabs.tech"

# Ensure the cert directory and www directory exist
mkdir -p "$CERT_DIR"
mkdir -p /var/www/certbot

# If certificate files do not exist yet, generate a temporary self-signed certificate
# so Nginx can start up safely without error and allow Certbot to request the real certificate
if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "[Entrypoint] SSL certificate not found at $CERT_DIR. Generating temporary self-signed certificate..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=cas.atleelabs.tech"
    echo "[Entrypoint] Temporary certificate generated successfully."
fi

exec "$@"
