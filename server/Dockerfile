# ===== Stage 1: build =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ===== Stage 2: runtime =====
FROM node:20-alpine

LABEL maintainer="XX地产"
LABEL description="租金地图评估系统 - 数据后端（SQLite + Express）"

# 安装 better-sqlite3 运行时依赖（仅 talloc，alpine 默认已有）
# better-sqlite3 是预编译二进制，node:20-alpine 兼容
# 同时安装 python3 + numpy：Hedonic 重训脚本 fit_hedonic.py 由 /refit 接口调用
# （node:20-alpine 默认无 Python，会导致 spawn python3 ENOENT）

WORKDIR /app

# 安装 Python 与 numpy（py3-numpy 来自 alpine community 源）
RUN apk add --no-cache python3 py3-numpy

# 复制 package.json 并安装 production 依赖
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# 复制编译产物（tsc 不会拷贝 .sql，故 dist/ 与 src/ 各放一份，保证 initSchema 能找到）
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/schema.sql ./dist/schema.sql
COPY --from=builder /app/src/schema.sql ./src/schema.sql

# 复制 Hedonic 拟合脚本到 /refit 接口期望的路径（dist/routes → ../scripts）
COPY --from=builder /app/src/scripts/fit_hedonic.py ./dist/scripts/fit_hedonic.py

# 数据持久化目录
RUN mkdir -p /app/data
VOLUME /app/data

ENV PORT=3001
ENV DB_PATH=/app/data/rt_asset.db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
