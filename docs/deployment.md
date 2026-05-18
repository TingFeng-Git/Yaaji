# 部署指南

本指南介绍如何将雅集 (Yaji) 书签管理工具部署到 Cloudflare 生产环境。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Workers    │  │     D1       │  │   Durable    │      │
│  │   (API)      │──│  (Database)  │  │   Objects    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│          │                                                  │
│          ▼                                                  │
│  ┌──────────────┐                                          │
│  │    Pages     │                                          │
│  │  (Frontend)  │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

## 前置条件

1. **Cloudflare 账户**
   - 注册 [Cloudflare](https://dash.cloudflare.com/sign-up) 账户
   - 获取 Account ID（在 Dashboard 右侧边栏）

2. **API Token**
   - 访问 [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - 创建 Token，权限：
     - Account > D1 > Edit
     - Account > Workers Scripts > Edit
     - Account > Workers KV Storage > Edit
     - Account > Durable Objects > Edit

3. **本地环境**
   - Node.js >= 18.0.0
   - npm >= 9.0.0
   - Wrangler CLI: `npm install -g wrangler`

## 部署步骤

### 1. 配置环境变量

创建 `.env` 文件：

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
D1_DATABASE_ID=your_database_id
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建 D1 数据库

```bash
cd bookmarks-workers

# 创建数据库
wrangler d1 create yaji-bookmarks

# 记录输出的 database_id
# 更新 wrangler.toml 中的 database_id
```

更新 `bookmarks-workers/wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "yaji-bookmarks"
database_id = "your_database_id_here"
```

### 4. 初始化数据库 Schema

```bash
cd bookmarks-workers

# 应用数据库结构
wrangler d1 execute yaji-bookmarks --file=schema.sql

# 验证表创建
wrangler d1 execute yaji-bookmarks --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### 5. 部署 Workers

```bash
cd bookmarks-workers

# 构建 TypeScript
npm run build

# 部署到 Cloudflare
npm run deploy

# 或部署到生产环境
npm run deploy:prod
```

部署成功后，会看到类似输出：

```
Published bookmarks-workers (1.23 sec)
  https://your-worker.your-subdomain.workers.dev
```

### 6. 部署前端到 Pages

```bash
cd frontend

# 构建前端
npm run build

# 部署到 Pages
npx wrangler pages deploy dist --project-name bookmarks-frontend
```

或者使用根目录脚本：

```bash
npm run deploy:frontend
```

### 7. 配置前端环境变量

在 Cloudflare Pages Dashboard：

1. 进入 Pages 项目
2. Settings > Environment variables
3. 添加：
   - `VITE_API_URL`: `https://your-worker.your-subdomain.workers.dev/api`

### 8. 验证部署

```bash
# 测试 Workers API
curl https://your-worker.your-subdomain.workers.dev/api/bookmarks

# 测试前端
curl https://your-pages.pages.dev/
```

## 生产环境配置

### 自定义域名（可选）

#### Workers 自定义域名

1. 在 Workers Dashboard > Triggers > Custom Domains
2. 添加域名（如 `api.your-domain.com`）
3. 配置 DNS 记录

#### Pages 自定义域名

1. 在 Pages Dashboard > Custom domains
2. 添加域名（如 `your-domain.com`）
3. 配置 DNS 记录

### 环境变量管理

#### Workers 环境变量

在 `wrangler.toml` 中配置：

```toml
[vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "https://your-domain.com"
```

或使用 Secrets（敏感信息）：

```bash
wrangler secret put MY_SECRET
```

#### Pages 环境变量

在 Pages Dashboard > Settings > Environment variables 中配置。

## 数据迁移

### 从 MySQL 迁移

项目提供了迁移脚本：

```bash
# 1. 导出 MySQL 数据
./scripts/export-mysql.sh

# 2. 转换为 D1 格式
./scripts/convert-data.sh

# 3. 导入到 D1
./scripts/import-d1.sh

# 4. 验证数据
./scripts/verify-data.sh
```

### 手动导入数据

```bash
# 导入 SQL 文件
wrangler d1 execute yaji-bookmarks --file=data.sql

# 验证数据
wrangler d1 execute yaji-bookmarks --command "SELECT COUNT(*) FROM bookmarks;"
```

## 监控和日志

### Workers 日志

```bash
# 实时日志
npm run tail

# 生产环境日志
npm run tail:prod
```

### D1 查询

```bash
# 执行查询
wrangler d1 execute yaji-bookmarks --command "SELECT * FROM bookmarks LIMIT 10;"

# 查看表结构
wrangler d1 execute yaji-bookmarks --command "PRAGMA table_info(bookmarks);"
```

### 错误排查

1. **Workers 部署失败**
   - 检查 `wrangler.toml` 配置
   - 确认 API Token 权限
   - 查看错误日志

2. **D1 连接失败**
   - 确认 `database_id` 正确
   - 检查 D1 数据库是否存在
   - 验证 Schema 是否应用

3. **前端无法访问 API**
   - 检查 `VITE_API_URL` 环境变量
   - 确认 CORS 配置
   - 验证 Workers 是否正常运行

## 回滚

### Workers 回滚

```bash
# 查看部署历史
wrangler deployments list

# 回滚到指定版本
wrangler rollback [deployment-id]
```

### Pages 回滚

在 Pages Dashboard > Deployments 中选择之前的版本进行回滚。

## 成本估算

### Cloudflare Workers

- 免费额度：100,000 请求/天
- 付费计划：$5/月，包含 10M 请求

### Cloudflare D1

- 免费额度：
  - 5M 读取/天
  - 100K 写入/天
  - 1GB 存储
- 付费计划：$5/月

### Cloudflare Pages

- 免费额度：
  - 500 构建/月
  - 无限请求
  - 无限带宽

## 安全建议

1. **API 认证**
   - 当前 API 完全开放
   - 建议添加 JWT 或 API Key 认证

2. **CORS 配置**
   - 生产环境限制允许的源
   - 不要使用 `*`

3. **Rate Limiting**
   - 配置 Workers Rate Limiting
   - 防止滥用

4. **数据备份**
   - 定期导出 D1 数据
   - 使用 `wrangler d1 export` 备份

## 相关文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Hono 框架文档](https://hono.dev/)
