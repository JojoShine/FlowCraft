#!/bin/bash
set -e

# Load nvm for non-interactive shells
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$PROJECT_ROOT/deploy"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "=== FlowCraft Build ==="

# Clean previous deploy
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 1. Client
echo ""
echo "[1/2] Building client..."
cd "$PROJECT_ROOT/client"
npm install --silent
npm run build
mkdir -p "$DIST_DIR/client"
cp -r dist "$DIST_DIR/client/dist"
echo "  -> deploy/client/dist/"

# 2. Server
echo ""
echo "[2/2] Building server..."
cd "$PROJECT_ROOT/server"
npm install --silent
npm run build

mkdir -p "$DIST_DIR/server/logs"
cp -r dist "$DIST_DIR/server/dist"
cp package.json "$DIST_DIR/server/"
cp ecosystem.config.js "$DIST_DIR/server/"
[ -f .env ] && cp .env "$DIST_DIR/server/"
[ -f .env.example ] && cp .env.example "$DIST_DIR/server/"
[ -f prisma/schema.prisma ] && {
  mkdir -p "$DIST_DIR/server/prisma"
  cp prisma/schema.prisma "$DIST_DIR/server/prisma/"
}
echo "  -> deploy/server/"

# 3. Nginx
cp "$PROJECT_ROOT/nginx.conf" "$DIST_DIR/"

# 4. Package
echo ""
echo "[3/3] Packaging..."
cd "$DIST_DIR"
tar -czf "flowcraft-${TIMESTAMP}.tar.gz" client server nginx.conf
echo "  -> deploy/flowcraft-${TIMESTAMP}.tar.gz"

echo ""
echo "=== Build complete ==="
echo ""
echo "Package contents:"
echo "  client/dist/          - frontend static files"
echo "  server/dist/          - compiled backend"
echo "  server/package.json   - production dependencies"
echo "  server/ecosystem.config.js - PM2 config"
echo "  server/.env           - environment config"
echo "  nginx.conf            - nginx reverse proxy"
echo ""
echo "Deploy:"
echo "  1. scp deploy/flowcraft-${TIMESTAMP}.tar.gz <server>:/opt/"
echo "  2. ssh <server> 'cd /opt && tar xzf flowcraft-${TIMESTAMP}.tar.gz && mv client server nginx.conf /opt/flowcraft/'"
echo "  3. cd /opt/flowcraft/server && npm install --production"
echo "  4. [ -f prisma/schema.prisma ] && npx prisma generate"
echo "  5. cp nginx.conf /etc/nginx/sites-enabled/flowcraft.conf"
echo "  6. nginx -t && systemctl reload nginx"
echo "  7. pm2 start ecosystem.config.js --env production"
echo "  8. pm2 save && pm2 startup"
