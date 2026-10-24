#!/usr/bin/env bash
set -euo pipefail
image=${1:?Pass the locally built runtime image}
prefix="flowcraft-image-check-${GITHUB_RUN_ID:-$$}"
network="$prefix-network"; db="$prefix-db"; storage="$prefix-minio"; app="$prefix-app"
cleanup() { docker rm -fv "$app" "$storage" "$db" >/dev/null 2>&1 || true; docker network rm "$network" >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'echo "Image acceptance failed at line $LINENO" >&2; docker logs "$app" --tail 30 2>/dev/null || true' ERR
docker network create "$network" >/dev/null
docker run -d --name "$db" --network "$network" -e POSTGRES_USER=flowcraft_test -e POSTGRES_PASSWORD=image-test-only -e POSTGRES_DB=flowcraft_test postgres:16.15-alpine >/dev/null
for attempt in {1..45}; do if docker exec "$db" pg_isready -U flowcraft_test -d flowcraft_test >/dev/null 2>&1; then break; fi; sleep 1; done
docker exec "$db" psql -U flowcraft_test -d flowcraft_test -v ON_ERROR_STOP=1 <<<'SELECT 1' >/dev/null
migration_url="postgresql://flowcraft_test:image-test-only@$db:5432/flowcraft_test"
runtime_url="postgresql://flowcraft_runtime:image-test-runtime@$db:5432/flowcraft_test"
docker exec -i "$db" psql -U flowcraft_test -d flowcraft_test -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE flowcraft_runtime LOGIN PASSWORD 'image-test-runtime';
GRANT CONNECT ON DATABASE flowcraft_test TO flowcraft_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO flowcraft_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO flowcraft_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO flowcraft_runtime;
SQL
# A reviewed old schema can retain its legacy Document table without naming collisions.
docker exec "$db" createdb -U flowcraft_test flowcraft_legacy
legacy_url="postgresql://flowcraft_test:image-test-only@$db:5432/flowcraft_legacy"
docker run --rm --network "$network" -e DATABASE_URL="$legacy_url" "$image" node node_modules/prisma/build/index.js db execute --file prisma/migrations/00000000000000_baseline/migration.sql --schema prisma/schema.prisma
docker exec -i "$db" psql -U flowcraft_test -d flowcraft_legacy -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE "Document" (id text PRIMARY KEY, title text NOT NULL, content text NOT NULL);
INSERT INTO "Document" VALUES ('legacy-document','Existing document','Keep existing bytes');
SQL
docker run --rm --network "$network" -e DATABASE_URL="$legacy_url" "$image" node node_modules/prisma/build/index.js migrate resolve --applied 00000000000000_baseline
docker run --rm --network "$network" -e DATABASE_URL="$legacy_url" "$image" /app/bin/migrate
[[ "$(docker exec "$db" psql -U flowcraft_test -d flowcraft_legacy -At -c 'SELECT content FROM "Document"')" == 'Keep existing bytes' ]]
[[ "$(docker exec "$db" psql -U flowcraft_test -d flowcraft_legacy -At -c "SELECT to_regclass('public.\"ContentDocument\"') IS NOT NULL")" == t ]]

# Both invocations use the same immutable local image; no schema push or baseline auto-resolution.
for attempt in 1 2; do docker run --rm --network "$network" -e DATABASE_URL="$migration_url" "$image" /app/bin/migrate; done
if docker exec "$db" psql -U flowcraft_runtime -d flowcraft_test -v ON_ERROR_STOP=1 -c 'CREATE TABLE forbidden_ddl(id int)' >/dev/null 2>&1; then echo 'Runtime unexpectedly has DDL permissions' >&2; exit 1; fi
if docker run --rm --network "$network" -e DATABASE_URL="$runtime_url" "$image" /app/bin/bootstrap; then echo 'Bootstrap accepted missing secrets' >&2; exit 1; fi
docker run --rm --network "$network" -e DATABASE_URL="$runtime_url" -e BOOTSTRAP_USERNAME=first-admin -e BOOTSTRAP_PASSWORD=image-test-password "$image" /app/bin/bootstrap
snapshot() { docker exec "$db" psql -U flowcraft_test -d flowcraft_test -At -c 'SELECT row_to_json(u)::text FROM "User" u ORDER BY id'; }
before=$(snapshot)
docker exec "$db" psql -U flowcraft_test -d flowcraft_test -v ON_ERROR_STOP=1 -c 'INSERT INTO "Project" (id,name,type,"ownerId","updatedAt") SELECT '\''preserved-project'\'','\''Preserved'\'','\''other'\'',id,now() FROM "User"' >/dev/null
docker run --rm --network "$network" -e DATABASE_URL="$runtime_url" -e BOOTSTRAP_USERNAME=another-admin -e BOOTSTRAP_PASSWORD=different-test-password "$image" /app/bin/bootstrap
[[ "$before" == "$(snapshot)" ]]
[[ "$(docker exec "$db" psql -U flowcraft_test -d flowcraft_test -At -c 'SELECT count(*) FROM "Project"')" == 1 ]]
docker run -d --name "$storage" --network "$network" --tmpfs /data -e MINIO_ROOT_USER=image-test-storage -e MINIO_ROOT_PASSWORD=image-test-storage-password flowcraft-minio-test:2025-04-22 server /data >/dev/null
docker run -d --name "$app" --network "$network" -e BASE_PATH=/flowcraft -e DATABASE_URL="$runtime_url" -e JWT_SECRET=image-test-jwt-secret -e MINIO_ENDPOINT="$storage" -e MINIO_ACCESS_KEY=image-test-storage -e MINIO_SECRET_KEY=image-test-storage-password -e MINIO_BUCKET=image-test -e DEEPSEEK_API_KEY=image-test-disabled -e DEEPSEEK_BASE_URL=http://127.0.0.1:9 "$image" >/dev/null
[[ "$(docker exec "$app" id -u)" != 0 ]]
for attempt in {1..45}; do if docker exec "$app" /app/bin/healthcheck; then break; fi; if [[ "$(docker inspect "$app" --format '{{.State.Running}}')" != true ]]; then docker logs "$app" >&2; exit 1; fi; sleep 1; done
docker exec "$app" /app/bin/healthcheck
docker exec "$app" node -e 'if(process.env.BOOTSTRAP_PASSWORD) process.exit(1); fetch("http://127.0.0.1:8080/flowcraft/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"first-admin",password:"image-test-password"})}).then(async r=>{const body=await r.json();if(!r.ok||!body.data?.token) process.exit(1);}).catch(()=>process.exit(1));'
docker stop "$db" >/dev/null
if docker exec "$app" /app/bin/healthcheck; then echo 'Health accepted database outage' >&2; exit 1; fi
docker exec "$app" node -e 'fetch("http://127.0.0.1:8080/flowcraft/healthz",{signal:AbortSignal.timeout(15000)}).then(async r=>{if(r.status!==503||(await r.json()).status!=="unavailable") process.exit(1);}).catch(()=>process.exit(1));'
docker start "$db" >/dev/null
for attempt in {1..30}; do if docker exec "$app" /app/bin/healthcheck; then break; fi; sleep 1; done
docker exec "$app" /app/bin/healthcheck
[[ "$before" == "$(snapshot)" ]]
echo 'Image acceptance passed: migrations, repeat bootstrap, preserved data, non-root, login, database outage and recovery.'
