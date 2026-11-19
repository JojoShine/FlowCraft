FROM node:20.19.5-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci
COPY server/tsconfig.json server/tsconfig.ops.json ./
COPY server/scripts/content-schema-preflight.ts ./scripts/content-schema-preflight.ts
COPY server/src ./src
RUN npm run build && ./node_modules/.bin/tsc -p tsconfig.ops.json && npm prune --omit=dev

FROM node:20.19.5-bookworm-slim AS runtime
ARG VCS_REF=unknown
LABEL org.opencontainers.image.source="https://github.com/JojoShine/FlowCraft" \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.version=$VCS_REF \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* && mkdir logs && chown node:node logs
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/ops ./ops
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --chown=node:node server/bin ./bin
RUN chmod 755 bin/*
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=12 CMD ["/app/bin/healthcheck"]
CMD ["node", "dist/index.js"]
