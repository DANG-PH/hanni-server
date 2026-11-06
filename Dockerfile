# Image chạy Hanni trên k8s. VPS hiện tại vẫn deploy bằng pm2, không dùng file này.
#   docker build --target api   -t hanni-api:lab .     API + worker (cùng image, khác APP_ROLE)
#   docker build --target tools -t hanni-tools:lab .   migrate, seed, tạo tài khoản giả: cần tsx nên giữ devDependencies

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS tools
COPY . .
USER node

FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# OpenTelemetry chỉ nằm trong image: app không phụ thuộc bản SDK nào, chạy pm2 trên VPS không đổi gì.
FROM node:22-slim AS otel
WORKDIR /otel
COPY infra/otel/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY infra/otel/tracing.js ./

FROM node:22-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/assets ./assets
COPY --from=otel /otel /otel
USER node
EXPOSE 8000
CMD ["node", "dist/src/main"]
