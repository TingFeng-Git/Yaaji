# Cloudflare 全栈迁移计划

## TL;DR

> **目标**: 将书签管理系统从 Spring Boot + Vue 迁移到完全基于 Cloudflare 的架构
> 
> **技术栈变更**:
> - 后端: Spring Boot (Java) → Cloudflare Workers (TypeScript)
> - 数据库: MySQL → Cloudflare D1 (SQLite)
> - 前端: Vue 3 → Cloudflare Pages (静态部署)
> - HTML解析: Jsoup → Cheerio
> 
> **预计工作量**: 4-6 周
> **并行执行**: YES - 4 个 Wave

---

## Context

### 原始架构

| 组件 | 技术栈 | 部署位置 |
|------|--------|----------|
| 后端 | Spring Boot 3.2, Java 17, Maven, JPA | 本地/服务器 |
| 数据库 | MySQL 8.0 | 本地/服务器 |
| 前端 | Vue 3, Vite, Axios | 本地开发服务器 |
| Chrome扩展 | Vue 3, Vite, Manifest V3 | Chrome浏览器 |

### 目标架构

| 组件 | 技术栈 | 部署位置 |
|------|--------|----------|
| 后端 | Cloudflare Workers, TypeScript, Hono | Cloudflare Edge |
| 数据库 | Cloudflare D1 (SQLite) | Cloudflare Edge |
| 前端 | Vue 3, Vite | Cloudflare Pages |
| Chrome扩展 | Vue 3, Vite, Manifest V3 | Chrome Web Store |

### 功能差异分析（Chrome扩展 vs 后端/前端）

**Chrome扩展有但后端/前端缺失的功能：**

1. **clickCount字段** - Chrome扩展追踪点击次数，后端只有lastClickedAt
2. **最近访问书签** - Chrome扩展popup显示最近访问的5个书签
3. **选择性导出** - Chrome扩展可以只导出勾选的书签
4. **客户端HTML解析** - Chrome扩展使用DOMParser，前端使用服务端Jsoup

**前端有但Chrome扩展缺失的功能：**

1. **异步导入进度** - 前端有详细的导入进度条（上传、导入阶段）
2. **路由导航** - 前端使用Vue Router，Chrome扩展使用事件

**迁移决策：**

- ✅ 采用Chrome扩展的clickCount字段
- ✅ 采用Chrome扩展的最近访问功能
- ✅ 统一导入导出功能（客户端解析 + 服务端异步处理）
- ✅ 保留前端的异步导入进度追踪

### 关键挑战

1. **运行时差异**: Java → TypeScript，需要完全重写业务逻辑
2. **数据库迁移**: MySQL → SQLite，需要调整SQL语法和数据类型
3. **异步处理**: Workers无状态，需要重构导入逻辑
4. **HTML解析**: Jsoup → Cheerio，API完全不同
5. **执行时间限制**: Workers最大30秒，长任务需要拆分
6. **功能对齐**: 需要基于Chrome扩展最新功能进行迁移

---

## Work Objectives

### 核心目标

将书签管理系统完全迁移到Cloudflare平台，保持所有现有功能，提升全球访问性能。

### 具体交付物

1. **Cloudflare Workers后端**
   - TypeScript重写的REST API
   - D1数据库集成
   - Cheerio HTML解析
   - 异步导入处理（使用Durable Objects或Queues）

2. **Cloudflare D1数据库**
   - 从MySQL迁移的数据结构
   - 迁移脚本
   - 数据验证

3. **Cloudflare Pages前端**
   - Vue 3静态构建
   - API代理配置
   - 环境变量管理

4. **CI/CD流水线**
   - GitHub Actions自动部署
   - 数据库迁移自动化
   - 测试验证

### 完成定义

- [ ] 所有API端点功能正常
- [ ] 书签导入导出功能正常
- [ ] 前端在Cloudflare Pages上运行
- [ ] 数据库迁移完成，数据完整
- [ ] CI/CD流水线正常工作

### 必须实现（基于Chrome扩展最新功能）

**核心API：**
- 书签CRUD API（包含clickCount字段）
- 分类管理API
- 书签导入导出（支持选择性导出）
- 异步导入进度追踪
- URL标题抓取

**Chrome扩展新增功能：**
- clickCount点击次数追踪
- 最近访问书签API
- 选择性导出功能
- 客户端HTML解析（DOMParser）

**前端增强功能：**
- 最近访问书签展示
- 导入进度可视化
- 搜索过滤优化

### 必须不实现（边界）

- 用户认证系统（保持现状：无认证）
- 实时同步功能
- 离线支持
- 多语言支持

---

## Verification Strategy

### 测试决策

- **基础设施**: 无现有测试
- **自动化测试**: 测试后实现（Tests-after）
- **框架**: Vitest（Workers测试）
- **策略**: 每个任务实现后添加测试

### QA策略

每个任务必须包含可执行的QA场景：
- **API**: 使用curl测试端点
- **前端**: 使用Playwright测试UI
- **数据库**: 使用D1 CLI验证数据
- **集成**: 端到端测试

---

## Execution Strategy

### 并行执行波次

```
Wave 1 (基础设施 - 立即开始):
├── Task 1: Cloudflare Workers项目初始化 [quick]
├── Task 2: D1数据库Schema设计 [quick]
├── Task 3: 前端Cloudflare Pages配置 [quick]
└── Task 4: 开发环境搭建 [quick]

Wave 2 (核心API - 依赖Wave 1):
├── Task 5: 书签CRUD API (依赖: 1, 2) [unspecified-high]
├── Task 6: 分类管理API (依赖: 1, 2) [unspecified-high]
├── Task 7: 数据库迁移脚本 (依赖: 2) [unspecified-high]
└── Task 8: API集成测试 (依赖: 5, 6) [unspecified-high]

Wave 3 (高级功能 - 依赖Wave 2):
├── Task 9: 书签导入功能 (依赖: 5, 2) [deep]
├── Task 10: 书签导出功能 (依赖: 5) [unspecified-high]
├── Task 11: URL标题抓取 (依赖: 1) [unspecified-high]
└── Task 12: 异步处理实现 (依赖: 9) [deep]

Wave 4 (前端迁移 - 依赖Wave 2):
├── Task 13: 前端API适配 (依赖: 5, 6) [unspecified-high]
├── Task 14: 前端构建优化 (依赖: 3) [quick]
└── Task 15: 前端集成测试 (依赖: 13, 14) [unspecified-high]

Wave 5 (部署与验证 - 依赖Wave 3, 4):
├── Task 16: 生产环境部署 (依赖: 所有) [unspecified-high]
├── Task 17: 性能优化 (依赖: 16) [unspecified-high]
└── Task 18: 文档更新 (依赖: 16) [writing]

Wave FINAL (验证 - 依赖所有任务):
├── Task F1: 计划合规审计 [oracle]
├── Task F2: 代码质量审查 [unspecified-high]
├── Task F3: 实际QA测试 [unspecified-high]
└── Task F4: 范围保真度检查 [deep]
```

### 依赖矩阵

| Task | 依赖 | 被依赖 | Wave |
|------|------|--------|------|
| 1 | - | 5, 6, 8, 11 | 1 |
| 2 | - | 5, 6, 7, 9 | 1 |
| 3 | - | 14 | 1 |
| 4 | - | 所有 | 1 |
| 5 | 1, 2 | 8, 9, 10, 13 | 2 |
| 6 | 1, 2 | 8, 13 | 2 |
| 7 | 2 | 16 | 2 |
| 8 | 5, 6 | 16 | 2 |
| 9 | 5, 2 | 12 | 3 |
| 10 | 5 | 16 | 3 |
| 11 | 1 | 16 | 3 |
| 12 | 9 | 16 | 3 |
| 13 | 5, 6 | 15 | 4 |
| 14 | 3 | 15 | 4 |
| 15 | 13, 14 | 16 | 4 |
| 16 | 所有 | F1-F4 | 5 |
| 17 | 16 | F1-F4 | 5 |
| 18 | 16 | F1-F4 | 5 |

### Agent分配

- **Wave 1**: 4个任务 → quick
- **Wave 2**: 4个任务 → unspecified-high
- **Wave 3**: 4个任务 → deep, unspecified-high
- **Wave 4**: 3个任务 → unspecified-high, quick
- **Wave 5**: 3个任务 → unspecified-high, writing
- **FINAL**: 4个任务 → oracle, unspecified-high, deep

---

## TODOs

- [x] 1. Cloudflare Workers项目初始化

  **What to do**:
  - 创建Cloudflare Workers项目结构
  - 配置TypeScript和Wrangler
  - 设置开发环境
  - 创建基础Hono应用
  - 配置CORS和中间件

  **Must NOT do**:
  - 不要实现业务逻辑
  - 不要连接数据库

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5, 6, 8, 11
  - **Blocked By**: None

  **References**:
  - `backend/src/main/java/com/bookmarks/controller/` - API端点参考
  - `backend/src/main/resources/application.yml` - 配置参考
  - `chrome-extension/` - Chrome扩展项目结构参考

  **Acceptance Criteria**:
  - [ ] Workers项目结构创建完成
  - [ ] TypeScript配置正确
  - [ ] Wrangler配置完成
  - [ ] 基础Hono应用运行正常

  **QA Scenarios**:
  ```
  Scenario: Workers项目初始化验证
    Tool: Bash
    Preconditions: Node.js已安装
    Steps:
      1. cd bookmarks-workers && npm install
      2. npx wrangler dev
      3. curl http://localhost:8787/
    Expected Result: 返回200状态码
    Evidence: .sisyphus/evidence/task-1-init.txt
  ```

  **Commit**: YES
  - Message: `feat(workers): 初始化Cloudflare Workers项目`
  - Files: `bookmarks-workers/`

- [x] 2. D1数据库Schema设计（基于Chrome扩展最新功能）

  **What to do**:
  - 分析现有MySQL Schema
  - 分析Chrome扩展数据结构（包含clickCount字段）
  - 设计D1兼容的SQLite Schema
  - 添加clickCount字段（Chrome扩展新增）
  - 创建迁移脚本
  - 设置D1数据库

  **Must NOT do**:
  - 不要迁移数据（仅Schema）
  - 不要创建索引（后续优化）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5, 6, 7, 9
  - **Blocked By**: None

  **References**:
  - `backend/src/main/java/com/bookmarks/entity/Bookmark.java` - Bookmark实体
  - `backend/src/main/java/com/bookmarks/entity/Category.java` - Category实体
  - `chrome-extension/shared/store/bookmarkStore.js` - Chrome扩展数据结构（包含clickCount）

  **Acceptance Criteria**:
  - [ ] D1 Schema创建完成
  - [ ] 包含clickCount字段
  - [ ] 迁移脚本可执行
  - [ ] D1数据库创建成功

  **QA Scenarios**:
  ```
  Scenario: D1 Schema验证
    Tool: Bash
    Preconditions: Wrangler已配置
    Steps:
      1. npx wrangler d1 create bookmarks-db
      2. npx wrangler d1 execute bookmarks-db --file=schema.sql
      3. npx wrangler d1 execute bookmarks-db "SELECT name FROM sqlite_master WHERE type='table';"
      4. npx wrangler d1 execute bookmarks-db "PRAGMA table_info(bookmarks);"
    Expected Result: 返回bookmarks和categories表，bookmarks表包含clickCount字段
    Evidence: .sisyphus/evidence/task-2-schema.txt
  ```

  **Commit**: YES
  - Message: `feat(db): 设计D1数据库Schema（包含clickCount）`
  - Files: `bookmarks-workers/schema.sql`

- [x] 3. 前端Cloudflare Pages配置

  **What to do**:
  - 配置Vite构建输出
  - 设置环境变量
  - 配置API代理
  - 创建Pages部署配置

  **Must NOT do**:
  - 不要修改业务逻辑
  - 不要添加新依赖

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 14
  - **Blocked By**: None

  **References**:
  - `frontend/vite.config.js` - 当前Vite配置
  - `frontend/package.json` - 构建脚本

  **Acceptance Criteria**:
  - [ ] Vite配置更新完成
  - [ ] 环境变量配置完成
  - [ ] 构建脚本正常工作

  **QA Scenarios**:
  ```
  Scenario: 前端构建验证
    Tool: Bash
    Preconditions: Node.js已安装
    Steps:
      1. cd frontend && npm run build
      2. ls -la dist/
    Expected Result: dist目录包含index.html和静态资源
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): 配置Cloudflare Pages部署`
  - Files: `frontend/vite.config.js`, `frontend/.env`

- [x] 4. 开发环境搭建

  **What to do**:
  - 创建开发文档
  - 设置本地开发环境
  - 配置测试环境
  - 创建开发脚本

  **Must NOT do**:
  - 不要部署到生产环境

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 所有
  - **Blocked By**: None

  **References**:
  - `AGENTS.md` - 项目文档

  **Acceptance Criteria**:
  - [ ] 开发文档创建完成
  - [ ] 本地开发环境可运行
  - [ ] 测试环境配置完成

  **QA Scenarios**:
  ```
  Scenario: 开发环境验证
    Tool: Bash
    Preconditions: Node.js和Wrangler已安装
    Steps:
      1. npm install
      2. npx wrangler dev
      3. curl http://localhost:8787/
    Expected Result: 本地开发服务器正常运行
    Evidence: .sisyphus/evidence/task-4-dev.txt
  ```

  **Commit**: YES
  - Message: `docs: 搭建开发环境`
  - Files: `README.md`, `package.json`

- [x] 5. 书签CRUD API（包含clickCount）

  **What to do**:
  - 实现书签列表API（包含clickCount字段）
  - 实现书签详情API
  - 实现书签创建API
  - 实现书签更新API
  - 实现书签删除API
  - 实现批量删除API
  - 实现URL检查API
  - 实现点击记录API（更新clickCount和lastClickedAt）
  - 实现最近访问书签API（按lastClickedAt排序）

  **Must NOT do**:
  - 不要实现导入导出（Task 9, 10）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8, 9, 10, 13
  - **Blocked By**: 1, 2

  **References**:
  - `backend/src/main/java/com/bookmarks/controller/BookmarkController.java` - API参考
  - `backend/src/main/java/com/bookmarks/service/BookmarkService.java` - 业务逻辑参考
  - `chrome-extension/shared/store/bookmarkStore.js` - Chrome扩展clickCount实现

  **Acceptance Criteria**:
  - [ ] 所有书签API端点实现完成
  - [ ] 包含clickCount字段
  - [ ] 点击记录API正常工作
  - [ ] 最近访问API正常工作
  - [ ] API响应格式与原有系统一致
  - [ ] 错误处理正确

  **QA Scenarios**:
  ```
  Scenario: 书签CRUD API测试
    Tool: Bash (curl)
    Preconditions: Workers运行中，D1数据库已初始化
    Steps:
      1. curl -X POST http://localhost:8787/api/bookmarks -d '{"title":"Test","url":"https://example.com"}'
      2. curl http://localhost:8787/api/bookmarks
      3. curl http://localhost:8787/api/bookmarks/1
      4. curl -X PUT http://localhost:8787/api/bookmarks/1 -d '{"title":"Updated"}'
      5. curl -X DELETE http://localhost:8787/api/bookmarks/1
    Expected Result: 所有API返回正确状态码和数据
    Evidence: .sisyphus/evidence/task-5-crud.txt

  Scenario: 点击记录测试
    Tool: Bash (curl)
    Preconditions: 存在书签
    Steps:
      1. curl -X POST http://localhost:8787/api/bookmarks/1/click
      2. curl http://localhost:8787/api/bookmarks/1
    Expected Result: clickCount增加，lastClickedAt更新
    Evidence: .sisyphus/evidence/task-5-click.txt

  Scenario: 最近访问测试
    Tool: Bash (curl)
    Preconditions: 存在多个书签，部分已点击
    Steps:
      1. curl http://localhost:8787/api/bookmarks/recent
    Expected Result: 返回按lastClickedAt排序的书签列表
    Evidence: .sisyphus/evidence/task-5-recent.txt

  Scenario: 批量删除测试
    Tool: Bash (curl)
    Preconditions: 存在多个书签
    Steps:
      1. curl -X POST http://localhost:8787/api/bookmarks/batch-delete -d '[1,2,3]'
    Expected Result: 返回成功删除数量
    Evidence: .sisyphus/evidence/task-5-batch.txt
  ```

  **Commit**: YES
  - Message: `feat(api): 实现书签CRUD API（包含clickCount）`
  - Files: `bookmarks-workers/src/routes/bookmarks.ts`

- [x] 6. 分类管理API

  **What to do**:
  - 实现分类列表API
  - 实现分类详情API
  - 实现分类创建API
  - 实现分类更新API
  - 实现分类删除API
  - 实现批量删除API
  - 实现删除空分类API

  **Must NOT do**:
  - 不要实现分类统计

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8, 13
  - **Blocked By**: 1, 2

  **References**:
  - `backend/src/main/java/com/bookmarks/controller/CategoryController.java` - API参考
  - `backend/src/main/java/com/bookmarks/service/CategoryService.java` - 业务逻辑参考

  **Acceptance Criteria**:
  - [ ] 所有分类API端点实现完成
  - [ ] API响应格式与原有系统一致
  - [ ] 错误处理正确

  **QA Scenarios**:
  ```
  Scenario: 分类CRUD API测试
    Tool: Bash (curl)
    Preconditions: Workers运行中，D1数据库已初始化
    Steps:
      1. curl -X POST http://localhost:8787/api/categories -d '{"name":"Test","color":"#667eea"}'
      2. curl http://localhost:8787/api/categories
      3. curl http://localhost:8787/api/categories/1
      4. curl -X PUT http://localhost:8787/api/categories/1 -d '{"name":"Updated"}'
      5. curl -X DELETE http://localhost:8787/api/categories/1
    Expected Result: 所有API返回正确状态码和数据
    Evidence: .sisyphus/evidence/task-6-categories.txt
  ```

  **Commit**: YES
  - Message: `feat(api): 实现分类管理API`
  - Files: `bookmarks-workers/src/routes/categories.ts`

- [x] 7. 数据库迁移脚本

  **What to do**:
  - 创建MySQL导出脚本
  - 创建数据转换脚本
  - 创建D1导入脚本
  - 创建数据验证脚本

  **Must NOT do**:
  - 不要直接修改生产数据库

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 16
  - **Blocked By**: 2

  **References**:
  - `backend/src/main/resources/application.yml` - 数据库配置

  **Acceptance Criteria**:
  - [ ] 迁移脚本创建完成
  - [ ] 数据转换正确
  - [ ] 验证脚本可执行

  **QA Scenarios**:
  ```
  Scenario: 数据迁移验证
    Tool: Bash
    Preconditions: MySQL数据库可访问
    Steps:
      1. ./scripts/export-mysql.sh
      2. ./scripts/convert-data.sh
      3. ./scripts/import-d1.sh
      4. ./scripts/verify-data.sh
    Expected Result: 数据迁移成功，记录数一致
    Evidence: .sisyphus/evidence/task-7-migration.txt
  ```

  **Commit**: YES
  - Message: `feat(db): 创建数据库迁移脚本`
  - Files: `scripts/`

- [x] 8. API集成测试

  **What to do**:
  - 创建API测试套件
  - 测试所有端点
  - 测试错误场景
  - 测试边界条件

  **Must NOT do**:
  - 不要测试性能

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 16
  - **Blocked By**: 5, 6

  **References**:
  - Task 5, 6的实现

  **Acceptance Criteria**:
  - [ ] 测试套件创建完成
  - [ ] 所有测试通过
  - [ ] 覆盖率>80%

  **QA Scenarios**:
  ```
  Scenario: API集成测试
    Tool: Bash
    Preconditions: Workers运行中
    Steps:
      1. npm test
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-8-tests.txt
  ```

  **Commit**: YES
  - Message: `test(api): 添加API集成测试`
  - Files: `bookmarks-workers/tests/`

- [x] 9. 书签导入功能

  **What to do**:
  - 实现HTML解析（使用Cheerio）
  - 实现书签导入逻辑
  - 实现分类自动创建
  - 实现进度追踪

  **Must NOT do**:
  - 不要实现异步处理（Task 12）

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 12
  - **Blocked By**: 5, 2

  **References**:
  - `backend/src/main/java/com/bookmarks/service/BookmarkService.java` - 导入逻辑参考

  **Acceptance Criteria**:
  - [ ] HTML解析正确
  - [ ] 书签导入成功
  - [ ] 分类自动创建

  **QA Scenarios**:
  ```
  Scenario: 书签导入测试
    Tool: Bash (curl)
    Preconditions: Workers运行中，示例HTML文件存在
    Steps:
      1. curl -X POST -F "file=@sample.html" http://localhost:8787/api/bookmarks/import
      2. curl http://localhost:8787/api/bookmarks
    Expected Result: 书签导入成功，数量正确
    Evidence: .sisyphus/evidence/task-9-import.txt
  ```

  **Commit**: YES
  - Message: `feat(api): 实现书签导入功能`
  - Files: `bookmarks-workers/src/services/import.ts`

- [x] 10. 书签导出功能（支持选择性导出）

  **What to do**:
  - 实现HTML导出格式
  - 实现分类分组
  - 实现文件下载
  - 实现选择性导出（基于Chrome扩展功能）

  **Must NOT do**:
  - 不要实现其他格式

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 16
  - **Blocked By**: 5

  **References**:
  - `backend/src/main/java/com/bookmarks/service/BookmarkService.java` - 导出逻辑参考
  - `chrome-extension/options/views/BookmarkList.vue` - Chrome扩展选择性导出实现

  **Acceptance Criteria**:
  - [ ] HTML格式正确
  - [ ] 分类分组正确
  - [ ] 文件下载正常
  - [ ] 支持选择性导出（传入书签ID列表）

  **QA Scenarios**:
  ```
  Scenario: 书签导出测试
    Tool: Bash (curl)
    Preconditions: 存在书签数据
    Steps:
      1. curl http://localhost:8787/api/bookmarks/export -o bookmarks.html
      2. cat bookmarks.html
    Expected Result: HTML格式正确，包含所有书签
    Evidence: .sisyphus/evidence/task-10-export.txt

  Scenario: 选择性导出测试
    Tool: Bash (curl)
    Preconditions: 存在多个书签
    Steps:
      1. curl -X POST http://localhost:8787/api/bookmarks/export -d '{"ids":[1,2,3]}' -o selected.html
      2. cat selected.html
    Expected Result: 只导出指定的书签
    Evidence: .sisyphus/evidence/task-10-export-selected.txt
  ```

  **Commit**: YES
  - Message: `feat(api): 实现书签导出功能（支持选择性导出）`
  - Files: `bookmarks-workers/src/services/export.ts`

- [x] 11. URL标题抓取

  **What to do**:
  - 实现URL抓取
  - 实现标题解析
  - 实现错误处理

  **Must NOT do**:
  - 不要缓存结果

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 16
  - **Blocked By**: 1

  **References**:
  - `backend/src/main/java/com/bookmarks/service/UrlTitleService.java` - 抓取逻辑参考

  **Acceptance Criteria**:
  - [ ] URL抓取正常
  - [ ] 标题解析正确
  - [ ] 错误处理完善

  **QA Scenarios**:
  ```
  Scenario: URL标题抓取测试
    Tool: Bash (curl)
    Preconditions: Workers运行中
    Steps:
      1. curl "http://localhost:8787/api/url/title?url=https://example.com"
    Expected Result: 返回页面标题
    Evidence: .sisyphus/evidence/task-11-title.txt
  ```

  **Commit**: YES
  - Message: `feat(api): 实现URL标题抓取`
  - Files: `bookmarks-workers/src/routes/url.ts`

- [x] 12. 异步处理实现

  **What to do**:
  - 实现Durable Objects或Queues
  - 实现进度追踪
  - 实现任务状态管理

  **Must NOT do**:
  - 不要使用轮询

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 16
  - **Blocked By**: 9

  **References**:
  - `backend/src/main/java/com/bookmarks/service/ImportProgressService.java` - 进度追踪参考

  **Acceptance Criteria**:
  - [ ] 异步处理正常
  - [ ] 进度追踪准确
  - [ ] 任务状态正确

  **QA Scenarios**:
  ```
  Scenario: 异步导入测试
    Tool: Bash (curl)
    Preconditions: Workers运行中
    Steps:
      1. curl -X POST -F "file=@large.html" http://localhost:8787/api/bookmarks/import
      2. curl http://localhost:8787/api/bookmarks/import/progress?taskId=xxx
    Expected Result: 返回进度信息
    Evidence: .sisyphus/evidence/task-12-async.txt
  ```

  **Commit**: YES
  - Message: `feat(api): 实现异步处理`
  - Files: `bookmarks-workers/src/services/async.ts`

- [x] 13. 前端API适配（包含最近访问功能）

  **What to do**:
  - 更新API基础URL
  - 更新API调用方式
  - 更新错误处理
  - 更新类型定义
  - 添加最近访问书签API调用
  - 添加最近访问书签展示组件

  **Must NOT do**:
  - 不要修改其他UI

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 15
  - **Blocked By**: 5, 6

  **References**:
  - `frontend/src/services/api.js` - 当前API服务
  - `chrome-extension/popup/App.vue` - Chrome扩展最近访问实现
  - `chrome-extension/shared/store/bookmarkStore.js` - Chrome扩展数据获取方式

  **Acceptance Criteria**:
  - [ ] API调用正常
  - [ ] 错误处理正确
  - [ ] 类型定义完整
  - [ ] 最近访问API调用正常
  - [ ] 最近访问组件展示正常

  **QA Scenarios**:
  ```
  Scenario: 前端API适配验证
    Tool: Playwright
    Preconditions: 前端运行中
    Steps:
      1. 打开浏览器
      2. 访问书签列表
      3. 创建新书签
    Expected Result: API调用成功，UI更新正常
    Evidence: .sisyphus/evidence/task-13-api.png

  Scenario: 最近访问功能验证
    Tool: Playwright
    Preconditions: 前端运行中，存在书签数据
    Steps:
      1. 打开浏览器
      2. 点击书签链接
      3. 返回首页
      4. 查看最近访问区域
    Expected Result: 最近访问的书签显示在列表中
    Evidence: .sisyphus/evidence/task-13-recent.png
  ```

  **Commit**: YES
  - Message: `feat(frontend): 适配新API（包含最近访问）`
  - Files: `frontend/src/services/api.js`, `frontend/src/components/RecentBookmarks.vue`

- [x] 14. 前端构建优化

  **What to do**:
  - 优化构建配置
  - 配置缓存策略
  - 配置CDN
  - 配置环境变量

  **Must NOT do**:
  - 不要修改业务逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 15
  - **Blocked By**: 3

  **References**:
  - `frontend/vite.config.js` - 当前配置

  **Acceptance Criteria**:
  - [ ] 构建配置优化完成
  - [ ] 缓存策略正确
  - [ ] 环境变量配置完成

  **QA Scenarios**:
  ```
  Scenario: 前端构建验证
    Tool: Bash
    Preconditions: Node.js已安装
    Steps:
      1. cd frontend && npm run build
      2. ls -la dist/
    Expected Result: 构建成功，文件优化
    Evidence: .sisyphus/evidence/task-14-build.txt
  ```

  **Commit**: YES
  - Message: `perf(frontend): 优化构建配置`
  - Files: `frontend/vite.config.js`

- [x] 15. 前端集成测试

  **What to do**:
  - 测试所有页面
  - 测试所有功能
  - 测试错误场景
  - 测试响应式设计

  **Must NOT do**:
  - 不要测试性能

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 16
  - **Blocked By**: 13, 14

  **References**:
  - Task 13, 14的实现

  **Acceptance Criteria**:
  - [ ] 所有页面测试通过
  - [ ] 所有功能测试通过
  - [ ] 错误场景处理正确

  **QA Scenarios**:
  ```
  Scenario: 前端集成测试
    Tool: Playwright
    Preconditions: 前端运行中
    Steps:
      1. 测试书签列表页面
      2. 测试书签创建页面
      3. 测试分类管理页面
      4. 测试导入导出功能
    Expected Result: 所有功能正常
    Evidence: .sisyphus/evidence/task-15-integration.png
  ```

  **Commit**: YES
  - Message: `test(frontend): 添加集成测试`
  - Files: `frontend/tests/`

- [x] 16. 生产环境部署

  **What to do**:
  - 配置生产环境
  - 部署Workers
  - 部署Pages
  - 配置域名
  - 配置SSL

  **Must NOT do**:
  - 不要跳过测试

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: 所有

  **References**:
  - Cloudflare文档

  **Acceptance Criteria**:
  - [ ] Workers部署成功
  - [ ] Pages部署成功
  - [ ] 域名配置正确
  - [ ] SSL证书有效

  **QA Scenarios**:
  ```
  Scenario: 生产环境验证
    Tool: Bash (curl)
    Preconditions: 部署完成
    Steps:
      1. curl https://your-domain.com/api/bookmarks
      2. curl https://your-domain.com/
    Expected Result: API和前端正常访问
    Evidence: .sisyphus/evidence/task-16-production.txt
  ```

  **Commit**: YES
  - Message: `deploy: 部署到生产环境`
  - Files: `wrangler.toml`

- [x] 17. 性能优化

  **What to do**:
  - 优化API响应时间
  - 优化数据库查询
  - 优化前端加载速度
  - 配置CDN缓存

  **Must NOT do**:
  - 不要牺牲功能

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: 16

  **References**:
  - Cloudflare性能文档

  **Acceptance Criteria**:
  - [ ] API响应时间<200ms
  - [ ] 前端加载时间<2s
  - [ ] CDN缓存命中率>80%

  **QA Scenarios**:
  ```
  Scenario: 性能测试
    Tool: Bash
    Preconditions: 生产环境运行中
    Steps:
      1. 使用curl测试API响应时间
      2. 使用Lighthouse测试前端性能
    Expected Result: 性能指标达标
    Evidence: .sisyphus/evidence/task-17-performance.txt
  ```

  **Commit**: YES
  - Message: `perf: 性能优化`
  - Files: 多个文件

- [x] 18. 文档更新

  **What to do**:
  - 更新README
  - 更新AGENTS.md
  - 创建部署文档
  - 创建API文档

  **Must NOT do**:
  - 不要删除现有文档

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: 16

  **References**:
  - 现有文档

  **Acceptance Criteria**:
  - [ ] 文档更新完成
  - [ ] 部署文档清晰
  - [ ] API文档完整

  **QA Scenarios**:
  ```
  Scenario: 文档验证
    Tool: Bash
    Preconditions: 文档更新完成
    Steps:
      1. 阅读README
      2. 按照部署文档操作
    Expected Result: 文档清晰，可操作
    Evidence: .sisyphus/evidence/task-18-docs.txt
  ```

  **Commit**: YES
  - Message: `docs: 更新项目文档`
  - Files: `README.md`, `AGENTS.md`, `docs/`

---

## Final Verification Wave

- [ ] F1. **计划合规审计** — `oracle`
  读取整个计划。对于每个"必须实现"：验证实现存在。对于每个"必须不实现"：搜索代码库中的禁止模式。检查证据文件存在于.sisyphus/evidence/。比较交付物与计划。
  输出: `必须实现 [N/N] | 必须不实现 [N/N] | 任务 [N/N] | 判定: 通过/拒绝`

- [ ] F2. **代码质量审查** — `unspecified-high`
  运行TypeScript编译检查 + linter + 测试。审查所有更改的文件：检查`as any`、空catch、console.log、注释掉的代码、未使用的导入。检查AI代码：过度注释、过度抽象、通用名称。
  输出: `构建 [通过/失败] | Lint [通过/失败] | 测试 [N通过/N失败] | 文件 [N干净/N问题] | 判定`

- [ ] F3. **实际QA测试** — `unspecified-high`
  从干净状态开始。执行每个任务的每个QA场景 - 按照确切步骤操作，捕获证据。测试跨任务集成（功能协同工作，而非隔离）。测试边缘情况：空状态、无效输入、快速操作。保存到.sisyphus/evidence/final-qa/。
  输出: `场景 [N/N通过] | 集成 [N/N] | 边缘案例 [N测试] | 判定`

- [ ] F4. **范围保真度检查** — `deep`
  对于每个任务：读取"要做什么"，读取实际diff（git log/diff）。验证1:1 - 规范中的所有内容都已构建（无遗漏），规范之外的内容未构建（无蔓延）。检查"必须不实现"合规性。检测跨任务污染：任务N触及任务M的文件。标记未 accounted 的更改。
  输出: `任务 [N/N合规] | 污染 [干净/N问题] | 未accounted [干净/N文件] | 判定`

---

## Commit Strategy

| Wave | 任务 | 提交信息 | 文件 |
|------|------|----------|------|
| 1 | 1-4 | `feat: 初始化Cloudflare迁移基础设施` | 多个 |
| 2 | 5-8 | `feat: 实现核心API` | `bookmarks-workers/src/routes/` |
| 3 | 9-12 | `feat: 实现高级功能` | `bookmarks-workers/src/services/` |
| 4 | 13-15 | `feat: 前端适配与测试` | `frontend/` |
| 5 | 16-18 | `deploy: 生产环境部署与优化` | 多个 |

---

## Success Criteria

### 验证命令

```bash
# Workers部署验证
npx wrangler deploy
curl https://your-workers-domain.com/api/bookmarks

# Pages部署验证
npx wrangler pages deploy ./dist --project-name bookmarks-frontend
curl https://your-pages-domain.com/

# 数据库验证
npx wrangler d1 execute bookmarks-db "SELECT COUNT(*) FROM bookmarks;"

# 测试验证
npm test
```

### 最终检查清单

- [ ] 所有"必须实现"功能正常
- [ ] 所有"必须不实现"功能不存在
- [ ] 所有测试通过
- [ ] 生产环境部署成功
- [ ] 性能指标达标
- [ ] 文档更新完成
