#!/usr/bin/env bash
set -euo pipefail
# Inputs have already passed CI. This only packages files; never loads environment files.
output=${1:?Pass a new output directory}
mkdir "$output"
tar -czf "$output/flowcraft-client.tar.gz" -C client/dist .
cp compose.prod.yaml "$output/"
cp .env.prod.example "$output/env.prod.example"
cp .env.bootstrap.example "$output/env.bootstrap.example"
cp nginx/business.conf.example "$output/flowcraft.nginx.conf.example"
cp docs/operations/docker-deployment.md "$output/DEPLOYMENT.md"
