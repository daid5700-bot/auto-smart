FROM node:20.19-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM node:20.19-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
ARG ENABLE_HSTS=false
ENV ENABLE_HSTS=$ENABLE_HSTS
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Khởi tạo Prisma & Build Next.js
RUN npx prisma generate
RUN npm run build

FROM builder AS production-deps
# Prisma CLI is a runtime dependency because the container applies controlled
# migrations before starting Next.js. All other development tools are removed.
RUN npm prune --omit=dev && npm cache clean --force

FROM node:20.19-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone contains only the modules traced as necessary at runtime.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Keep the Prisma migration CLI and its engine helpers. @prisma/client and the
# generated client are already included by Next.js standalone tracing.
COPY --from=production-deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=production-deps /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=production-deps /app/node_modules/@prisma/engines-version ./node_modules/@prisma/engines-version
COPY --from=production-deps /app/node_modules/@prisma/debug ./node_modules/@prisma/debug
COPY --from=production-deps /app/node_modules/@prisma/fetch-engine ./node_modules/@prisma/fetch-engine
COPY --from=production-deps /app/node_modules/@prisma/get-platform ./node_modules/@prisma/get-platform
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/migration-bootstrap.mjs ./scripts/migration-bootstrap.mjs
COPY --from=builder /app/scripts/docker-migrate.sh ./scripts/docker-migrate.sh
RUN chmod +x ./scripts/docker-migrate.sh

# Expose port mặc định của Next.js (bên trong container)
EXPOSE 3000

# Chỉ áp dụng migration đã được kiểm soát; tuyệt đối không dùng db push trên production.
CMD ["sh", "./scripts/docker-migrate.sh", "node", "server.js"]
