FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Khởi tạo Prisma & Build Next.js
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy các file cần thiết để chạy
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/migration-bootstrap.mjs ./scripts/migration-bootstrap.mjs
COPY --from=builder /app/scripts/docker-migrate.sh ./scripts/docker-migrate.sh
RUN chmod +x ./scripts/docker-migrate.sh

# Expose port mặc định của Next.js (bên trong container)
EXPOSE 3000

# Chỉ áp dụng migration đã được kiểm soát; tuyệt đối không dùng db push trên production.
CMD ["sh", "./scripts/docker-migrate.sh", "npm", "start"]
