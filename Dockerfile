# ===== Stage 1: build =====
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time 环境变量（AMap key 等）
# 用 ARG 时可在 docker build 时传入；
# 注意：这些变量会被 Vite inline 到 bundle 里，bundle 是公开分发的
# 应在 build 时用临时 key（或 build-arg 限制白名单 Referer）
ARG VITE_AMAP_KEY
ARG VITE_AMAP_SECURITY
ENV VITE_AMAP_KEY=$VITE_AMAP_KEY
ENV VITE_AMAP_SECURITY=$VITE_AMAP_SECURITY

# 后端 API 地址（仅情报站/爬虫功能需要）。不传时默认 http://localhost:3001/api，
# 只在"浏览器与后端同机"时可用；跨机部署须传入客户可访问的地址。
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 缓存依赖层（pom/package 变了才会重装）
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install

COPY . .

# 构建生产产物
RUN npm run build

# ===== Stage 2: runtime =====
# 阶段 2 用 nginx alpine 做静态托管
FROM nginx:1.27-alpine

LABEL maintainer="XX地产"
LABEL description="租金地图评估系统（MVP）— Nginx 静态托管"
LABEL org.opencontainers.image.source="https://github.com/gj122512597/rt-asset-valuation"
LABEL org.opencontainers.image.licenses="Proprietary"

# 把 SPA fallback / gzip / 安全头配置扔进去
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 把 build 产物搬到 nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 健康检查：每 30s 请求首页
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

EXPOSE 80

# 前台运行（容器必备）
CMD ["nginx", "-g", "daemon off;"]
