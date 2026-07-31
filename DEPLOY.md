# 部署说明 · ARM64 离线交付

> 适用分支：`rtdemo`（客户交付版）
> 目标环境：**ARM64 架构** Linux 服务器（鲲鹏 / 飞腾 / 倚天 / Apple Silicon 等）

---

## 一、交付物

| 文件 | 说明 |
| --- | --- |
| `rt-asset-arm64-images.tar` | 离线镜像包，含下方两个镜像，`docker load` 还原 |

| 镜像 | 大小 | 架构 | 作用 |
| --- | --- | --- | --- |
| `rt-asset-valuation-web:latest` | 81.6 MB | `linux/arm64` | 前端 Nginx 静态站点，**自带全部演示数据** |
| `rt-asset-valuation-api:latest` | 245 MB | `linux/arm64` | 后端 Express + SQLite，**可选**（仅情报站/爬虫落库用） |

> **关键事实**：225 资产 / 325 竞品 / 876 历史成交 / 26 POI 等核心数据在构建时已打包进 web 镜像（前端直接读取静态 JSON）。因此**只跑 web 一个容器，估价系统即可完整演示**，无需后端、无需数据库初始化。

---

## 二、部署步骤

### 1. 传输镜像包到客户主机

```bash
scp rt-asset-arm64-images.tar user@<客户主机>:/tmp/
```

### 2. 加载镜像

```bash
docker load -i /tmp/rt-asset-arm64-images.tar

# 校验（应输出 linux/arm64）
docker inspect --format '{{.RepoTags}} {{.Os}}/{{.Architecture}}' \
  rt-asset-valuation-web:latest rt-asset-valuation-api:latest
```

### 3a. 最简部署（推荐）

仅前端，覆盖全部估价演示功能：

```bash
docker run -d --name rt-web --restart unless-stopped -p 80:80 \
  rt-asset-valuation-web:latest
```

访问：`http://<客户主机IP>/`

健康检查：`curl http://<客户主机IP>/healthz` → `ok`

### 3b. 全栈部署（含后端情报站/爬虫持久化）

新建 `docker-compose.prod.yml`（引用已加载的镜像，不现场构建）：

```yaml
services:
  api:
    image: rt-asset-valuation-api:latest
    container_name: rt-asset-api
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - rt-asset-db:/app/data          # SQLite 持久化
    environment:
      - PORT=3001
      - DB_PATH=/app/data/rt_asset.db
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  web:
    image: rt-asset-valuation-web:latest
    container_name: rt-asset-valuation
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--spider", "http://localhost/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  rt-asset-db:
```

启动：

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

首次启动后灌入后端样例数据（表结构与 Hedonic 模型在服务启动时已自动创建）：

```bash
docker exec rt-asset-api node dist/scripts/seedDemo.js
```

> `seedDemo` 只灌少量样例记录用于后端接口演示；**前端展示的 225 资产全量数据不依赖它**。

正常启动日志应形如：

```
[db] SQLite 已连接: /app/data/rt_asset.db
[db] 表结构初始化完成
[training-samples] 已 seed 10 条内置训练样本
[server] 数据后端已启动: http://localhost:3001
```

若看到 `SqliteError: no such table: hedonic_models`，说明用的是 2026-07-31 之前的旧 api 镜像（空数据卷首启会崩），请更新镜像包后重新 `docker load`。

---

## 三、必读注意事项

### 1. 架构限制

镜像为 **arm64 专用**，在 x86_64 主机上无法启动（报 `exec format error`）。如需 x86 版本请另行构建：

```bash
docker buildx build --platform linux/amd64 --load -t rt-asset-valuation-web:latest .
```

### 2. 高德地图 Key 白名单（最常见的"地图空白"原因）

当前镜像已把开发用 Key 编译进 bundle。**客户访问域名/IP 必须加入该 Key 的 Referer 白名单**，否则地图瓦片被高德拦截。

若客户使用自有 Key，需重新构建 web 镜像：

```bash
docker buildx build --platform linux/arm64 --load \
  -t rt-asset-valuation-web:latest \
  --build-arg VITE_AMAP_KEY=<客户Key> \
  --build-arg VITE_AMAP_SECURITY=<客户安全密钥> .
```

### 3. 后端地址是构建期固化的

前端 API 地址由 `VITE_API_BASE_URL` 在**构建时**内联进 bundle，默认 `http://localhost:3001/api` —— 只在"浏览器与后端在同一台机器"时可用。

若采用 3b 全栈部署且客户从**其他机器**用浏览器访问，必须带上真实地址重新构建 web 镜像：

```bash
docker buildx build --platform linux/arm64 --load \
  -t rt-asset-valuation-web:latest \
  --build-arg VITE_AMAP_KEY=<Key> \
  --build-arg VITE_AMAP_SECURITY=<安全密钥> \
  --build-arg VITE_API_BASE_URL=http://<客户主机IP>:3001/api .
```

> 仅采用 3a 最简部署时，此项无需关心。

### 4. 端口占用

`80` 被占用时改映射即可，例如 `-p 8080:80`，访问 `http://<IP>:8080/`。

---

## 四、重新构建镜像（开发侧）

```bash
# 前端
docker buildx build --platform linux/arm64 --load \
  -t rt-asset-valuation-web:latest \
  --build-arg VITE_AMAP_KEY=$VITE_AMAP_KEY \
  --build-arg VITE_AMAP_SECURITY=$VITE_AMAP_SECURITY .

# 后端
docker buildx build --platform linux/arm64 --load \
  -t rt-asset-valuation-api:latest ./server

# 打包交付
docker save rt-asset-valuation-web:latest rt-asset-valuation-api:latest \
  -o rt-asset-arm64-images.tar
```

### 已知构建坑：镜像加速源

本地 Docker 若配置了失效的镜像加速源（如 `docker.m.daocloud.io` 返回 401），`buildx` 会直接失败且不回退。绕过方式——先用经典 `docker pull`（会回退直连 docker.io）把基础镜像拉到本地缓存，再构建：

```bash
docker pull --platform linux/arm64 node:20-alpine
docker pull --platform linux/arm64 nginx:1.27-alpine
```

> 注：Docker Desktop 每次重启会还原 `~/.docker/daemon.json`，手动删除坏镜像源不持久。

---

## 五、运维常用命令

```bash
# 查看日志
docker logs -f rt-web
docker logs -f rt-asset-api

# 重启
docker restart rt-web

# 备份后端数据库
docker run --rm -v rt-asset-db:/data -v $(pwd):/backup alpine \
  tar czf /backup/rt-asset-db-$(date +%Y%m%d).tar.gz -C /data .

# 卸载（保留数据卷）
docker compose -f docker-compose.prod.yml down
```
