# 雅集 (Yaji) - 书签管理工具

优雅的书签管理工具，基于 Cloudflare 全栈架构。

## 技术栈

| 组件 | 技术栈 | 部署位置 |
|------|--------|----------|
| 后端 | Cloudflare Workers, TypeScript, Hono | Cloudflare Edge |
| 数据库 | Cloudflare D1 (SQLite) | Cloudflare Edge |
| 前端 | Vue 3, Vite | Cloudflare Pages |
| Chrome扩展 | Vue 3, Vite, Manifest V3 | Chrome Web Store |

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Wrangler CLI (Cloudflare Workers 开发工具)

### 安装 Wrangler

```bash
npm install -g wrangler
```

### 登录 Cloudflare

```bash
wrangler login
```

### 项目初始化

```bash
# 克隆项目
git clone <repository-url>
cd bookmarks

# 安装所有依赖
npm run install:all

# 或分别安装
cd bookmarks-workers && npm install
cd ../frontend && npm install
cd ../chrome-extension && npm install
```

## 开发环境搭建

### 1. 创建 D1 数据库

```bash
cd bookmarks-workers

# 创建数据库
wrangler d1 create yaji-bookmarks

# 复制输出的 database_id 到 wrangler.toml
# 更新 wrangler.toml 中的 database_id
```

### 2. 初始化数据库 Schema

```bash
cd bookmarks-workers

# 应用数据库结构
wrangler d1 execute yaji-bookmarks --file=schema.sql
```

### 3. 启动开发服务器

```bash
# 启动 Workers 后端 (端口 8787)
npm run dev:workers

# 启动前端开发服务器 (端口 3000)
npm run dev:frontend

# 或同时启动所有服务
npm run dev
```

### 4. 验证开发环境

```bash
# 测试 Workers API
curl http://localhost:8787/

# 测试数据库连接
wrangler d1 execute yaji-bookmarks --command "SELECT * FROM bookmarks"
```

## 项目结构

```
bookmarks/
├── bookmarks-workers/          # Cloudflare Workers 后端
│   ├── src/
│   │   ├── index.ts           # 入口文件
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 业务逻辑
│   │   ├── middleware/         # 中间件
│   │   └── types.ts           # 类型定义
│   ├── schema.sql             # D1 数据库 Schema
│   ├── setup.sh               # 数据库初始化脚本
│   ├── wrangler.toml          # Wrangler 配置
│   └── package.json
├── frontend/                   # Vue 3 前端
│   ├── src/
│   ├── vite.config.js
│   └── package.json
├── chrome-extension/           # Chrome 扩展
│   ├── src/
│   ├── public/
│   └── package.json
├── package.json                # 根目录配置 (Monorepo)
├── .env.example                # 环境变量示例
└── README.md
```

## 开发脚本

### 根目录脚本

```bash
# 开发
npm run dev                  # 启动 Workers 开发服务器
npm run dev:workers          # 仅启动 Workers
npm run dev:frontend         # 仅启动前端
npm run dev:extension        # 仅启动 Chrome 扩展

# 构建
npm run build                # 构建所有项目
npm run build:workers        # 仅构建 Workers
npm run build:frontend       # 仅构建前端
npm run build:extension      # 仅构建 Chrome 扩展

# 部署
npm run deploy               # 部署 Workers
npm run deploy:frontend      # 部署前端到 Pages

# 数据库
npm run db:setup             # 初始化数据库
npm run db:reset             # 重置数据库
npm run db:migrate           # 运行迁移
```

### Workers 脚本

```bash
cd bookmarks-workers

# 开发
npm run dev                  # 本地开发服务器
npm run dev:remote           # 远程开发模式

# 构建与部署
npm run build                # 构建
npm run deploy               # 部署到 Cloudflare
npm run deploy:prod          # 部署到生产环境

# 数据库管理
npm run db:create            # 创建数据库
npm run db:setup             # 初始化数据库
npm run db:migrate           # 应用 Schema
npm run db:query "SELECT * FROM bookmarks"  # 执行查询
npm run db:list              # 列出所有数据库

# 调试
npm run tail                 # 查看实时日志
npm run tail:prod            # 查看生产环境日志
npm run typecheck            # TypeScript 类型检查
```

## 环境变量

复制 `.env.example` 为 `.env` 并填入实际值：

```bash
cp .env.example .env
```

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | `your_account_id` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | `your_api_token` |
| `D1_DATABASE_ID` | D1 数据库 ID | `your_database_id` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ENVIRONMENT` | 运行环境 | `development` |
| `CORS_ORIGIN` | CORS 允许的源 | `http://localhost:3000` |
| `VITE_API_BASE_URL` | 前端 API 基础 URL | `http://localhost:8787` |

## API 端点

### 书签 API (`/api/bookmarks`)

- `GET /` - 获取所有书签
- `GET /{id}` - 获取单个书签
- `GET /recent` - 获取最近访问的书签
- `POST /` - 创建书签
- `PUT /{id}` - 更新书签
- `DELETE /{id}` - 删除书签
- `POST /batch-delete` - 批量删除
- `POST /{id}/click` - 记录点击
- `POST /import` - 导入书签
- `GET /import/progress` - 导入进度
- `GET /export` - 导出书签
- `POST /export` - 选择性导出

### 分类 API (`/api/categories`)

- `GET /` - 获取所有分类
- `GET /{id}` - 获取单个分类
- `POST /` - 创建分类
- `PUT /{id}` - 更新分类
- `DELETE /{id}` - 删除分类
- `POST /batch-delete` - 批量删除
- `DELETE /empty` - 删除空分类

### URL API (`/api/url`)

- `GET /title` - 获取 URL 标题

## 数据库管理

### 使用 Wrangler CLI

```bash
# 列出所有数据库
wrangler d1 list

# 创建新数据库
wrangler d1 create yaji-bookmarks

# 执行 SQL 查询
wrangler d1 execute yaji-bookmarks --command "SELECT * FROM bookmarks"

# 执行 SQL 文件
wrangler d1 execute yaji-bookmarks --file=schema.sql

# 交互式控制台
wrangler d1 execute yaji-bookmarks --command
```

### 常用查询

```sql
-- 查看所有表
SELECT name FROM sqlite_master WHERE type='table';

-- 查看表结构
PRAGMA table_info(bookmarks);

-- 统计书签数量
SELECT COUNT(*) FROM bookmarks;

-- 按分类统计
SELECT c.name, COUNT(b.id) as count 
FROM categories c 
LEFT JOIN bookmarks b ON c.id = b.category_id 
GROUP BY c.id;

-- 查看最近点击的书签
SELECT * FROM bookmarks 
WHERE last_clicked_at IS NOT NULL 
ORDER BY last_clicked_at DESC 
LIMIT 10;
```

## 部署

### 部署 Workers

```bash
# 部署到开发环境
npm run deploy

# 部署到生产环境
npm run deploy:prod
```

### 部署前端到 Pages

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name bookmarks-frontend
```

### 验证部署

```bash
# 测试 Workers
curl https://your-worker.your-subdomain.workers.dev/

# 测试 Pages
curl https://your-pages.pages.dev/
```

## 故障排除

### 常见问题

1. **Wrangler 未找到**
   ```bash
   npm install -g wrangler
   ```

2. **数据库未初始化**
   ```bash
   cd bookmarks-workers
   wrangler d1 create yaji-bookmarks
   # 更新 wrangler.toml 中的 database_id
   wrangler d1 execute yaji-bookmarks --file=schema.sql
   ```

3. **端口冲突**
   ```bash
   # 修改 wrangler.toml 中的端口配置
   [dev]
   port = 8788
   ```

4. **CORS 错误**
   - 检查 `wrangler.toml` 中的 `CORS_ORIGIN` 配置
   - 确保前端 URL 在允许列表中

### 调试

```bash
# 查看实时日志
npm run tail

# 查看生产环境日志
npm run tail:prod

# TypeScript 类型检查
npm run typecheck
```

## 相关文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Hono 框架文档](https://hono.dev/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 许可证

MIT License
