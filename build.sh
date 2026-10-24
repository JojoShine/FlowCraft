#!/usr/bin/env bash
# Local acceptance bundle only. Production images and releases come from GitHub Actions.
set -euo pipefail
cd "$(dirname "$0")"
npm --prefix server ci
npm --prefix client ci
npm --prefix server exec -- prisma generate --schema server/prisma/schema.prisma
npm --prefix server run build
npm --prefix client run build
revision=$(git rev-parse HEAD)
docker build --target runtime --build-arg VCS_REF="$revision" -t "flowcraft-local:$revision" .
scripts/verify-image.sh "flowcraft-local:$revision"
mkdir -p deploy
output="deploy/local-build-$(date +%Y%m%d%H%M%S)-$$"
scripts/package-release.sh "$output"
printf 'Local bundle: %s (not a published release)\n' "$output"
