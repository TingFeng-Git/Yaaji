# 雅集 (Yaji) 全面优化计划

## TL;DR

> **Quick Summary**: 修复雅集项目所有已知 Bug，统一 API 响应格式为 camelCase，增强前端 UI 状态，清理技术债务。
>
> **Deliverables**:
> - 后端：JWT_SECRET 环境变量修复、Export 按用户隔离、Categories/Me camelCase 映射、登出简化、URL 唯一约束按用户
> - 前端：CategoryManager 错误处理修复、RecentBookmarks 状态增强、api.js 清理重复方法、axios 依赖移除
> - 数据库：Schema 顺序修复、URL 唯一约束迁移
> - 测试：TDD 覆盖所有修复
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: 前端测试修复 → 后端 Bug 修复 → API 格式统一 → 前端修复 → 清理

---

## Context

### 用户原始需求
"全面测试项目，判断项目是否可用，优化架构方案，页面展示，允许提交，但不要push"

### 采访摘要
**关键讨论**:
- 项目功能完整可用，但存在 3 个生产环境阻塞性问题
- 前端 TypeScript 迁移不做（保持 JS）
- API 响应格式统一为 camelCase
- TDD 模式：先写测试再改代码
- 密码哈希推迟（标记为技术债务）
- 登出简化为客户端清除
- URL 唯一约束改为按用户 (url + user_id)

**研究发现**:
- 后端 52 测试全通过，前端 90 测试全通过（但有 15 个 unhandled errors）
- `process.env.JWT_SECRET` 在 CF Workers 中不可用—应用使用 `c.env`
- Export 服务无 `WHERE user_id = ?` — 所有用户数据互通
- Categories API 返回原始 snake_case — 未用 camelCase 映射
- CategoryManager 使用 axios 错误模式 (`err.response?.data?.error`) 但 api.js 用 fetch
- `url TEXT NOT NULL UNIQUE` 全局唯一不区分用户
- 登出机制完全不工作（用 `expires_at=now` 且中间件不检查）

### Metis 审查
**已解决的差距**:
- 登出机制完全无效 → 简化为客户端清除
- URL 唯一约束全局 → 改为按用户唯一
- Chrome Extension 独立数据孤岛 → 本次仅修复结构问题，不接入后端
- 密码哈希可逆 → 推迟处理

---

## 工作目标

### 核心目标
修复生产环境阻塞 Bug，统一 API 响应格式，增强前端健壮性，清理技术债务。

### 具体交付物
- `bookmarks-workers/src/routes/auth.ts` — JWT_SECRET 使用 c.env、登出简化、/me camelCase
- `bookmarks-workers/src/middleware/auth.ts` — JWT_SECRET 使用 c.env
- `bookmarks-workers/src/routes/bookmarks.ts` — Export 传 userId 参数
- `bookmarks-workers/src/routes/categories.ts` — 新增 mapCategory() 映射
- `bookmarks-workers/src/services/export.ts` — 新增 userId 过滤参数
- `bookmarks-workers/schema.sql` — 修复 ALTER 顺序、URL 唯一约束改为 (url, user_id)
- `frontend/src/views/CategoryManager.vue` — 修复错误处理、复用 ConfirmDialog、去重颜色
- `frontend/src/components/RecentBookmarks.vue` — 新增加载/空/错误状态
- `frontend/src/services/api.js` — 移除重复方法
- `frontend/package.json` — 移除 axios 依赖
- `bookmarks-workers/tests/` — 新测试用例覆盖修复

### 完成定义
- [ ] 所有 52 个后端测试 + 新增测试全通过
- [ ] 所有 90 个前端测试 + 新增测试全通过（0 unhandled errors）
- [ ] 前端构建成功
- [ ] `grep -r "process\.env\.JWT_SECRET" src/` 返回空
- [ ] `grep -rn "err\.response" frontend/src/views/CategoryManager.vue` 返回空
- [ ] Categories API 响应字段为 camelCase (`createdAt`, `categoryId`)

### 必须完成
1. JWT_SECRET 使用 c.env.JWT_SECRET（两处）
2. Export 按 userId 过滤（服务 + 路由）
3. Categories API camelCase 映射
4. Auth /me camelCase 映射
5. URL 唯一约束改为 (url, user_id) 组合唯一
6. CategoryManager 错误处理修复
7. RecentBookmarks 加载/空/错误状态
8. Api.js 重复方法清理
9. CategoryManager 颜色去重
10. CategoryManager 复用 ConfirmDialog 组件
11. Schema 顺序修复
12. 登出简化为客户端清除
13. 移除 axios 依赖

### 不能做的事 (防护栏)
- ❌ 不接入 Chrome Extension 到后端
- ❌ 不升级密码哈希
- ❌ 不迁移前端到 TypeScript
- ❌ 不新增 API 端点
- ❌ 不引入 zod 等校验库
- ❌ 不改动已有 API 字段名（只加映射，不改 JSON key）

---

## 验证策略

> **零人工干预** — 所有验证由 Agent 执行。禁止要求"用户手动测试/确认"的验收标准。

### 测试决策
- **基础设施存在**: 是（Vitest + happy-dom）
- **自动化测试**: TDD（先写测试再改代码）
- **框架**: Vitest (后端) + happy-dom (前端)
- **TDD 模式**: 每个 TODO 先写失败测试 → 实现代码 → 测试通过 → 重构

### QA 策略
每个任务必须包含 Agent 执行的 QA 场景。
- **API/后端**: 使用 Bash (curl) — 发送请求，断言状态码 + 响应字段
- **前端组件**: 使用 Vitest — 挂载组件，交互，断言渲染输出
- **数据库**: 使用 wrangler d1 execute — 查询，验证数据

---

## 执行策略

### 并行执行 Waves

```
Wave 1 (基础 + 安全修复 — 最大并行):
├── T1: 测试修复 + 测试基础设施增强 [quick]
├── T2: JWT_SECRET 改用 c.env.JWT_SECRET [quick]
├── T3: Export 添加 userId 过滤 [quick]
├── T4: 登出简化为客户端清除 [quick]
├── T5: Schema 顺序修复 + URL 唯一约束迁移 [quick]
└── T6: Schema 迁移脚本 + 种子数据修复 [quick]

Wave 2 (API 格式统一 — 完全并行):
├── T7: Categories API camelCase 映射 [quick]
├── T8: Auth /me camelCase 映射 [quick]
├── T9: 测试适配新 API 格式 [quick]
└── T10: 写 API 测试验证 camelCase [deep]

Wave 3 (前端修复 — 完全并行):
├── T11: CategoryManager 错误处理修复 [quick]
├── T12: RecentBookmarks 状态增强 [quick]
├── T13: CategoryManager 去重 + 复用 ConfirmDialog [quick]
├── T14: api.js 清理 + 移除 axios [quick]
└── T15: 写前端测试覆盖修复 [quick]

Wave FINAL (验证):
├── F1: 计划合规审计 (oracle)
├── F2: 代码质量审查
├── F3: 实际 QA 回归测试
└── F4: 范围保真检查
```

### 依赖矩阵（精简版 - 详情见各任务 Blocked By/Blocks）
- **T1**: 无依赖 → 阻塞 T2-T6, T11-T15
- **T2-T6**: 无依赖（与 T1 无代码冲突）→ 阻塞 T7-T10, T9
- **T7-T10**: 阻塞 T1 → 阻塞 T9, T11-T15
- **T9**: 阻塞 T1, T7 → 阻塞 T11
- **T11-T15**: 阻塞 T1, T9 → 阻塞 F1-F4

---

## TODOs

- [ ] 1. **修复前端测试基础设施** — 解决 RecentBookmarks 的 15 个 unhandled errors

  **What to do** (TDD):
  - **RED**: 运行现有测试，确认 15 个 unhandled errors 存在；写一个新测试验证 `RecentBookmarks` 在 API 返回 `undefined` 时不会崩溃
  - **GREEN**: 修复 `tests/import-export.test.js` — `RecentBookmarks` 组件需要正确的加载状态。修改测试 mock 确保 `bookmarkApi.getRecent` 始终返回数组而非 undefined
  - 根因：`RecentBookmarks.vue` 中 `v-if="recentBookmarks.length > 0"` 但 `recentBookmarks` 是 `ref([])` 初始化，所以不是 undefined 问题。真正的 unhandled errors 来自测试中 mock API 返回 undefined 但组件已挂载
  - 在 `import-export.test.js` 中，`bookmarkApi.getRecent` 未被 mock 返回默认 undefined，导致组件渲染时崩溃。在所有测试中确保 `getRecent` 有 mock 值

  **Must NOT do**:
  - 不改动 `RecentBookmarks.vue` 代码（T12 再做）
  - 不添加新测试文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 少量测试修复，不涉及新功能
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (其他所有任务依赖这个基础)
  - **Parallel Group**: Wave 1, Foundation
  - **Blocks**: T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15
  - **Blocked By**: None

  **References**:
  - `frontend/tests/import-export.test.js:78-80` — `mountComponent()` helper that lacks `getRecent` mock
  - `frontend/tests/setup.js:3-20` — axios mock setup（死代码）

  **Acceptance Criteria**:
  - [ ] `npm test` in frontend — 0 unhandled errors
  - [ ] 所有现有 90 测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证测试无 unhandled errors
    Tool: Bash
    Preconditions: 所有依赖已安装
    Steps:
      1. cd frontend && npm test
    Expected Result: 测试通过，无 "Unhandled Errors" 输出
    Failure Indicators: 仍然有 unhandled errors 或测试失败
    Evidence: .omo/evidence/task-1-test-results.log
  ```

  **Commit**: YES (C1)
  - Files: `frontend/tests/import-export.test.js`, `frontend/tests/bookmark-list.test.js`, `frontend/tests/bookmark-form.test.js`, `frontend/tests/category-manager.test.js`
  - Pre-commit: `cd frontend && npm test`

---

- [ ] 2. **JWT_SECRET 改用 c.env 环境变量** — 确保在 Cloudflare Workers 运行时正常工作

  **What to do** (TDD):
  - **RED**: 写测试验证 `requireAuth` 中间件从 `c.env` 读取 JWT_SECRET（不是 process.env）
  - **GREEN**:
    - `middleware/auth.ts`: 将 `process.env.JWT_SECRET` 改为从 `c.env.JWT_SECRET` 获取
    - 函数签名改为 `(c, next)` 并在函数体内获取 `c.env.JWT_SECRET`
    - `routes/auth.ts`: 同理，从 `c.env.JWT_SECRET` 获取
    - 传递 JWT_SECRET 的方式改为从 `c.env` 读取
  - **REFACTOR**: 确保两处代码一致

  **Must NOT do**:
  - 不引入新的环境变量配置库
  - 不改动 JWT_SECRET 的默认值逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件修改，逻辑简单
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T3, T4, T5, T6)
  - **Blocks**: T7, T8 (因为涉及 auth 路由修改)
  - **Blocked By**: T1 (测试基础设施)

  **References**:
  - `bookmarks-workers/src/middleware/auth.ts:4` — `const JWT_SECRET = process.env.JWT_SECRET || ...`
  - `bookmarks-workers/src/routes/auth.ts:14` — 同上
  - `bookmarks-workers/src/index.ts:8` — `import { requireAuth } from './middleware/auth'`
  - `bookmarks-workers/src/types.ts:28-32` — `Env` 接口定义

  **Acceptance Criteria**:
  - [ ] `grep -r "process\.env\.JWT_SECRET" bookmarks-workers/src/` 返回空
  - [ ] 所有测试通过
  - [ ] 后端 52 测试全通过

  **QA Scenarios**:
  ```
  Scenario: 验证无 process.env.JWT_SECRET 引用
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep -r "process\.env\.JWT_SECRET" bookmarks-workers/src/
    Expected Result: 无输出（空）
    Evidence: .omo/evidence/task-2-no-process-env.txt
  ```
  ```
  Scenario: 测试全通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 52 tests passed
    Evidence: .omo/evidence/task-2-tests-pass.txt
  ```

  **Commit**: YES (C1)
  - Message: `fix(auth): JWT_SECRET 使用 c.env 环境变量在 Workers 中生效`
  - Files: `bookmarks-workers/src/middleware/auth.ts`, `bookmarks-workers/src/routes/auth.ts`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 3. **Export 添加 userId 过滤** — 防止用户 A 导出用户 B 的书签

  **What to do** (TDD):
  - **RED**: 写测试验证 `exportBookmarks` 当传入 userId 时只返回该用户的书签；验证 `GET /export` 和 `POST /export` 路由传入 `c.get('userId')`
  - **GREEN**:
    - `services/export.ts`: `exportBookmarks` 函数新增 `userId: number` 参数，SQL 查询添加 `WHERE user_id = ?`
    - `routes/bookmarks.ts`: `GET /export` 路由调用时传入 `c.get('userId')`
    - `routes/bookmarks.ts`: `POST /export` 路由调用时传入 `c.get('userId')`
  - **REFACTOR**: 保持与现有 `ids` 参数兼容

  **Must NOT do**:
  - 不修改 Export 的输出格式（HTML）
  - 不移除 `POST /export` 的 `ids` 参数

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单功能修改，逻辑简单
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T4, T5, T6)
  - **Blocks**: Wave 2
  - **Blocked By**: T1

  **References**:
  - `bookmarks-workers/src/services/export.ts:36-53` — 当前 `exportBookmarks` 无 userId 参数
  - `bookmarks-workers/src/routes/bookmarks.ts:91-100` — GET/POST /export 路由

  **Acceptance Criteria**:
  - [ ] `exportBookmarks` 函数签名包含 `userId` 参数
  - [ ] GET /export 和 POST /export 传入 userId
  - [ ] SQL 查询包含 `WHERE user_id = ?`
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证 exportBookmarks 签名包含 userId
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep "export async function exportBookmarks" bookmarks-workers/src/services/export.ts
    Expected Result: 输出包含 userId 参数
    Evidence: .omo/evidence/task-3-signature.txt
  ```
  ```
  Scenario: 测试全通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 52+ tests passed
    Evidence: .omo/evidence/task-3-tests-pass.txt
  ```

  **Commit**: YES (C2)
  - Message: `fix(export): 添加 userId 过滤保护数据隔离`
  - Files: `bookmarks-workers/src/services/export.ts`, `bookmarks-workers/src/routes/bookmarks.ts`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 4. **登出简化为客户端清除** — 移除无效的后端黑名单逻辑

  **What to do** (TDD):
  - **RED**: 写测试验证登出后不检查 sessions 表（简化为客户端清除）
  - **GREEN**:
    - `routes/auth.ts`: 简化 `POST /logout` — 直接返回 200，不再写入 sessions 表
    - 可选：保留端点但移除所有 DB 操作
    - `middleware/auth.ts`: 移除对 sessions 表的检查（当前不检查，只需要确认不移除）
    - 在 index.ts 中确认 `/api/auth/logout` 路由不需要 `requireAuth`
  - **REFACTOR**: 清理 `schema.sql` — sessions 表保留以备未来使用，但注释标注为"保留"

  **Must NOT do**:
  - 不删除 sessions 表（保留未来兼容性）
  - 不改动前端登出逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 删除操作 + 简化，逻辑简单
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T5, T6)
  - **Blocks**: Nothing
  - **Blocked By**: T1

  **References**:
  - `bookmarks-workers/src/routes/auth.ts:105-129` — POST /logout 当前实现
  - `bookmarks-workers/schema.sql:13-23` — sessions 表定义

  **Acceptance Criteria**:
  - [ ] `POST /api/auth/logout` 不再写入 sessions 表
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证登出不写数据库
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep -n "INSERT INTO sessions" bookmarks-workers/src/routes/auth.ts
    Expected Result: 无匹配（移除）
    Evidence: .omo/evidence/task-4-logout-clean.txt
  ```
  ```
  Scenario: 测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 52+ tests passed
    Evidence: .omo/evidence/task-4-tests-pass.txt
  ```

  **Commit**: YES (C3)
  - Message: `fix(auth): 登出简化为客户端清除，移除无效后端黑名单`
  - Files: `bookmarks-workers/src/routes/auth.ts`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 5. **Schema 顺序修复 + URL 唯一约束改为按用户**

  **What to do** (TDD):
  - **RED**: 写测试验证 schema 可以顺序执行不报错；写测试验证两个用户可以有相同 URL
  - **GREEN**:
    - `schema.sql`:
      - 调整建表顺序：CREATE TABLE users/sessions/bookmarks/categories/import_tasks 先全部创建
      - 将 `ALTER TABLE` 语句（user_id 列）移到对应 CREATE TABLE 之后
      - 修改 `bookmarks` 表 `url` 约束：从 `url TEXT NOT NULL UNIQUE` 改为 `url TEXT NOT NULL`
      - 添加组合唯一约束：`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_url_user ON bookmarks(url, user_id)`
    - `routes/bookmarks.ts`: 检查现有 bookmarks 路由中的 UNIQUE 约束捕获逻辑是否需要调整
  - **REFACTOR**: 验证 seed.sql 兼容新 schema

  **Must NOT do**:
  - 不删除已有数据（确保迁移兼容）
  - 不更改表结构其他部分

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL 文件修改，明确的任务
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4, T6)
  - **Blocks**: T6 (迁移脚本)
  - **Blocked By**: T1

  **References**:
  - `bookmarks-workers/schema.sql:1-70` — 完整 schema
  - `bookmarks-workers/src/routes/bookmarks.ts:141-147` — UNIQUE constraint 错误处理
  - `bookmarks-workers/scripts/seed.sql` — 种子数据

  **Acceptance Criteria**:
  - [ ] schema.sql 中的 CREATE TABLE 全部在 ALTER TABLE 之前
  - [ ] bookmarks 表有 `CREATE UNIQUE INDEX idx_bookmarks_url_user ON bookmarks(url, user_id)`
  - [ ] url 列不再是简单 UNIQUE（去掉 `url TEXT NOT NULL UNIQUE`）
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证 schema 顺序
    Tool: Bash
    Preconditions: schema.sql 已修改
    Steps:
      1. 检查 ALTER TABLE 位置在对应 CREATE TABLE 之后
    Expected Result: 无 CREATE 在 ALTER 之后
    Evidence: .omo/evidence/task-5-schema-order.txt
  ```
  ```
  Scenario: 验证测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 所有测试通过
    Evidence: .omo/evidence/task-5-tests-pass.txt
  ```

  **Commit**: YES (C4)
  - Message: `fix(schema): 修复 ALTER 顺序，URL 改为按用户 (url, user_id) 唯一`
  - Files: `bookmarks-workers/schema.sql`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 6. **Schema 迁移脚本 + 种子数据修复**

  **What to do**:
  - 检查 `scripts/seed.sql` 与新 schema 兼容性
  - 更新 `setup.sh` 和 `scripts/dev-setup.sh` 确保从干净 schema 创建数据库
  - 验证 `npm run db:migrate` 在新 schema 下工作正常
  - 更新 `scripts/seed.sql` 添加 user_id 到种子数据（当前种子数据无 user_id）

  **Must NOT do**:
  - 不修改 schema 结构（仅在 T5 基础上验证）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 脚本兼容性验证
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4, T5)
  - **Blocks**: Nothing
  - **Blocked By**: T1 (测试修复), T5 (schema 修改)

  **References**:
  - `bookmarks-workers/scripts/seed.sql` — 种子数据
  - `bookmarks-workers/setup.sh` — 设置脚本
  - `bookmarks-workers/scripts/dev-setup.sh` — 开发设置脚本

  **Acceptance Criteria**:
  - [ ] seed.sql 使用新 schema 执行不报错
  - [ ] seed.sql 包含 user_id 值

  **QA Scenarios**:
  ```
  Scenario: 验证 seed.sql 兼容
    Tool: Bash
    Preconditions: schema.sql 和 seed.sql 已更新
    Steps:
      1. 检查 seed.sql 中所有 INSERT 包含 user_id
    Expected Result: 无缺失 user_id 的 INSERT
    Evidence: .omo/evidence/task-6-seed-compat.txt
  ```

  **Commit**: YES (C4)
  - Message: `fix(schema): 修复种子数据兼容新 schema`
  - Files: `bookmarks-workers/scripts/seed.sql`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 7. **Categories API camelCase 映射** — 统一 API 响应格式

  **What to do** (TDD):
  - **RED**: 写测试验证 Categories API 返回 camelCase 字段（`createdAt`, `userId` 等）
  - **GREEN**:
    - `routes/categories.ts`: 新增 `mapCategory()` 函数（类似 `mapBookmark()`），将 `created_at` → `createdAt`, `user_id` → `userId`（可选保留 `id`, `name`, `color` 不变）
    - 所有路由响应使用 `mapCategory()` 转换
    - 不返回 `user_id` 给前端（过滤掉）
  - **REFACTOR**: 确认所有 categories 路由都使用映射

  **Must NOT do**:
  - 不改变 `categories` 表的数据库结构
  - 不遗漏 `GET /categories`, `GET /categories/:id`, `POST /categories`, `PUT /categories/:id` 中的任何一个

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 模式匹配，与 bookmark 的 mapBookmark 模式一致
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T8, T9, T10)
  - **Blocks**: Wave 3
  - **Blocked By**: T1, T2, T3

  **References**:
  - `bookmarks-workers/src/routes/bookmarks.ts:15-28` — `mapBookmark()` 模式参考
  - `bookmarks-workers/src/routes/categories.ts:13-23` — GET / 当前返回原始 D1 数据
  - `bookmarks-workers/src/routes/categories.ts:25-37` — GET /:id
  - `bookmarks-workers/src/routes/categories.ts:39-56` — POST /
  - `bookmarks-workers/src/routes/categories.ts:58-81` — PUT /:id

  **Acceptance Criteria**:
  - [ ] `mapCategory()` 函数存在且使用 camelCase
  - [ ] 所有 categories 路由使用 `mapCategory()` 映射
  - [ ] 响应中不包含 `user_id` 字段
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证分类返回 camelCase
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep -n "mapCategory" bookmarks-workers/src/routes/categories.ts
    Expected Result: 至少 4 处使用（GET, GET/:id, POST, PUT）
    Evidence: .omo/evidence/task-7-map-category.txt
  ```
  ```
  Scenario: 测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 所有测试通过
    Evidence: .omo/evidence/task-7-tests-pass.txt
  ```

  **Commit**: YES (C5)
  - Message: `refactor(api): Categories 返回 camelCase 格式`
  - Files: `bookmarks-workers/src/routes/categories.ts`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 8. **Auth /me camelCase 映射** — 统一用户信息响应格式

  **What to do** (TDD):
  - **RED**: 写测试验证 `/api/auth/me` 返回 camelCase 字段（`createdAt` 而非 `created_at`）
  - **GREEN**:
    - `routes/auth.ts`: `POST /register` 响应中的 `user` 对象使用 camelCase
    - `routes/auth.ts`: `POST /login` 响应中的 `user` 对象使用 camelCase
    - `routes/auth.ts`: `GET /me` 响应中的 `user` 对象使用 camelCase
    - 新增 `mapUser()` 或内联映射
  - **REFACTOR**: 提取公共映射函数

  **Must NOT do**:
  - 不改变 JWT payload 格式（影响 token 验证）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 与 T7 类似，模式匹配
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7, T9, T10)
  - **Blocks**: Wave 3
  - **Blocked By**: T1, T2

  **References**:
  - `bookmarks-workers/src/routes/auth.ts:69-73` — register 响应
  - `bookmarks-workers/src/routes/auth.ts:97-101` — login 响应
  - `bookmarks-workers/src/routes/auth.ts:132-157` — GET /me 响应

  **Acceptance Criteria**:
  - [ ] `/api/auth/me` 返回 `createdAt`（camelCase）
  - [ ] 注册/登录响应中的 user 字段使用 camelCase
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证 /me camelCase
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep -n "created_at" bookmarks-workers/src/routes/auth.ts
    Expected Result: 只在 SQL 查询中（数据库字段），不在响应构造中
    Evidence: .omo/evidence/task-8-me-camelcase.txt
  ```
  ```
  Scenario: 测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 所有测试通过
    Evidence: .omo/evidence/task-8-tests-pass.txt
  ```

  **Commit**: YES (C5)
  - Message: `refactor(api): Auth /me 和 login/register 返回 camelCase`
  - Files: `bookmarks-workers/src/routes/auth.ts`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 9. **测试适配新 API 格式** — 更新后端测试以匹配 camelCase 响应

  **What to do** (TDD):
  - **RED**: T7 和 T8 已经写好了验证 camelCase 的测试
  - **GREEN**: 更新 `bookmarks.test.ts` 和 `categories.test.ts` 中的测试期望值
    - `bookmarks.test.ts`: 已经使用 `mapBookmark()`，所以不需要改动 — 验证确认即可
    - `categories.test.ts`: 更新所有期望从 `created_at` 改为 `createdAt`
    - 确认 mock-db.ts 中的种子数据兼容
  - **REFACTOR**: 无

  **Must NOT do**:
  - 不改动 API 逻辑（只改测试期望值）
  - 不减少测试覆盖率

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 测试期望值更新，简单明确
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7, T8, T10)
  - **Blocks**: Wave 3
  - **Blocked By**: T1, T7, T8

  **References**:
  - `bookmarks-workers/tests/categories.test.ts:31-33` — 使用 `created_at` 的测试数据
  - `bookmarks-workers/tests/helpers/mock-db.ts` — mock 数据库

  **Acceptance Criteria**:
  - [ ] 所有 categories 测试期望 camelCase 字段
  - [ ] 无测试使用 snake_case 期望类别响应
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 测试全部通过
    Tool: Bash
    Preconditions: T7, T8 已合并
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 所有测试通过
    Evidence: .omo/evidence/task-9-tests-pass.txt
  ```

  **Commit**: YES (C6)
  - Message: `test(api): 更新测试期望适配 camelCase 格式`
  - Files: `bookmarks-workers/tests/categories.test.ts`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 10. **编写 API 集成测试验证 camelCase** — 添加新测试覆盖响应格式

  **What to do**:
  - 在 `categories.test.ts` 中添加测试验证新字段名
  - 在 `bookmarks.test.ts` 中添加测试确认 camelCase 已存在（确认 mapBookmark 工作）
  - 添加 `auth.test.ts` 文件测试 `/me` 的 camelCase 响应

  **Must NOT do**:
  - 不修改已有测试逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解响应格式并编写断言
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7, T8, T9)
  - **Blocks**: Wave 3
  - **Blocked By**: T1, T7, T8

  **References**:
  - `bookmarks-workers/tests/bookmarks.test.ts` — 现有测试参考
  - `bookmarks-workers/tests/categories.test.ts` — 现有测试参考

  **Acceptance Criteria**:
  - [ ] categories 测试验证 `createdAt` 和 `userId` 字段存在
  - [ ] /me 测试验证 `createdAt` 存在
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 新测试全部通过
    Tool: Bash
    Preconditions: T7-T9 已合并
    Steps:
      1. cd bookmarks-workers && npm test
    Expected Result: 所有测试通过（含新增）
    Evidence: .omo/evidence/task-10-tests-pass.txt
  ```

  **Commit**: YES (C6)
  - Message: `test(api): 添加 camelCase 格式集成测试`
  - Files: `bookmarks-workers/tests/categories.test.ts`, `bookmarks-workers/tests/auth.test.ts`
  - Pre-commit: `cd bookmarks-workers && npm test`

---

- [ ] 11. **CategoryManager 错误处理修复** — 替换 axios 模式为 fetch 模式

  **What to do** (TDD):
  - **RED**: 写测试验证模拟 API 错误时 CategoryManager 显示正确错误消息
  - **GREEN**:
    - `CategoryManager.vue`: 将所有 `err.response?.data?.error || err.response?.data?.message || err.message` 替换为 `err.message`
    - 确认位于 `deleteCategory()`, `deleteSelectedCategories()`, `deleteEmptyCategories()` 中的错误处理
    - 由于 `api.js` 的 `handleResponse` 抛出 `new Error(data.error || data.message)`, 使用 `err.message` 即可获取正确的错误消息
  - **REFACTOR**: 确认无其他 axios 遗留模式

  **Must NOT do**:
  - 不改变 API 调用逻辑
  - 不改变 Toast 显示逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 字符串替换，逻辑不变
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12, T13, T14, T15)
  - **Blocks**: F1-F4
  - **Blocked By**: T1, T9

  **References**:
  - `frontend/src/views/CategoryManager.vue:283` — `err.response?.data?.error` 模式
  - `frontend/src/views/CategoryManager.vue:300` — 同上
  - `frontend/src/views/CategoryManager.vue:316` — 同上
  - `frontend/src/services/api.js:30-33` — `handleResponse` 抛出 `new Error(data.error || data.message)`

  **Acceptance Criteria**:
  - [ ] `grep -rn "err\.response" frontend/src/views/CategoryManager.vue` 返回空
  - [ ] 所有前端测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证无 err.response 模式
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep -rn "err\.response" frontend/src/views/CategoryManager.vue
    Expected Result: 空
    Evidence: .omo/evidence/task-11-no-err-response.txt
  ```
  ```
  Scenario: 测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd frontend && npm test
    Expected Result: 所有测试通过
    Evidence: .omo/evidence/task-11-tests-pass.txt
  ```

  **Commit**: YES (C7)
  - Message: `fix(ui): CategoryManager 错误处理替换为 fetch 兼容模式`
  - Files: `frontend/src/views/CategoryManager.vue`
  - Pre-commit: `cd frontend && npm test`

---

- [ ] 12. **RecentBookmarks 加载/空/错误状态增强**

  **What to do** (TDD):
  - **RED**: 写测试验证 RecentBookmarks 在加载中显示加载状态、空数据时显示空状态、错误时显示错误消息
  - **GREEN**:
    - `RecentBookmarks.vue`:
      - 添加 `loading` ref（初始 `true`）
      - 添加 `error` ref（初始 `null`）
      - `fetchRecentBookmarks`: 开始时 `loading = true`, 完成时 `loading = false`
      - 错误时 `error = err.message`, `loading = false`
    - 模板新增：
      - `<div v-if="loading" class="loading">加载最近访问...</div>`
      - `<div v-else-if="error" class="error">加载失败: {{ error }}</div>`
      - `<div v-else-if="recentBookmarks.length === 0" class="empty">暂无最近访问</div>`
      - 现有 `v-if="recentBookmarks.length > 0"` 保持不变
  - **REFACTOR**: 添加 CSS 样式（参考 BookmarkList 的 loading/error/empty 样式）

  **Must NOT do**:
  - 不删除现有功能
  - 不改变点击记录逻辑

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 前端 UI 状态管理 + CSS 样式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T13, T14, T15)
  - **Blocks**: F1-F4
  - **Blocked By**: T1

  **References**:
  - `frontend/src/components/RecentBookmarks.vue` — 当前实现
  - `frontend/src/views/BookmarkList.vue:64-66` — loading/error/empty 模式参考

  **Acceptance Criteria**:
  - [ ] 加载中显示 `加载最近访问...`
  - [ ] 空数据时显示 `暂无最近访问`
  - [ ] 错误时显示 `加载失败: {错误消息}`
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证前端测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd frontend && npm test
    Expected Result: 90+ tests passed, 0 unhandled errors
    Evidence: .omo/evidence/task-12-tests-pass.txt
  ```
  ```
  Scenario: 验证加载状态渲染
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep -n "loading" frontend/src/components/RecentBookmarks.vue
    Expected Result: 包含 loading ref 和模板条件
    Evidence: .omo/evidence/task-12-loading-states.txt
  ```

  **Commit**: YES (C8)
  - Message: `feat(ui): RecentBookmarks 添加加载/空/错误状态`
  - Files: `frontend/src/components/RecentBookmarks.vue`
  - Pre-commit: `cd frontend && npm test`

---

- [ ] 13. **CategoryManager 去重 + 复用 ConfirmDialog 组件**

  **What to do** (TDD):
  - **RED**: 写测试验证 CategoryManager 使用 ConfirmDialog 组件而非内联实现
  - **GREEN**:
    - `CategoryManager.vue`:
      - 移除内联确认弹窗（模板和 script 中的 confirm dialog 逻辑）
      - 导入并使用 `<ConfirmDialog>` 组件（参照 BookmarkList 的实现）
      - 移除 `colorOptions` 中的重复颜色 `'#fa709a'`（保留一个）
    - 确保 `showConfirm`, `executeConfirm`, `cancelConfirm` 方法与 ConfirmDialog 组件兼容
  - **REFACTOR**: 清理无用的内联样式

  **Must NOT do**:
  - 不改动确认弹窗的功能（保留相同的交互流程）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 组件替换 + 字符串去重
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12, T14, T15)
  - **Blocks**: F1-F4
  - **Blocked By**: T1

  **References**:
  - `frontend/src/views/CategoryManager.vue:105-114` — 内联确认弹窗模板
  - `frontend/src/views/CategoryManager.vue:148-167` — 内联确认弹窗逻辑
  - `frontend/src/views/CategoryManager.vue:176-180` — 颜色定义（含重复）
  - `frontend/src/views/BookmarkList.vue:141` — ConfirmDialog 使用参考
  - `frontend/src/components/ConfirmDialog.vue` — 可复用组件

  **Acceptance Criteria**:
  - [ ] CategoryManager 不再包含内联确认弹窗
  - [ ] CategoryManager 使用 `<ConfirmDialog>` 组件
  - [ ] `colorOptions` 无重复颜色
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 验证使用 ConfirmDialog 组件
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep "ConfirmDialog" frontend/src/views/CategoryManager.vue
    Expected Result: 包含 import 和组件注册
    Evidence: .omo/evidence/task-13-uses-confirm-dialog.txt
  ```
  ```
  Scenario: 验证无重复颜色
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep "'#fa709a'" frontend/src/views/CategoryManager.vue
    Expected Result: 只有 1 次
    Evidence: .omo/evidence/task-13-color-dedup.txt
  ```
  ```
  Scenario: 测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd frontend && npm test
    Expected Result: 所有测试通过
    Evidence: .omo/evidence/task-13-tests-pass.txt
  ```

  **Commit**: YES (C7)
  - Message: `refactor(ui): CategoryManager 复用 ConfirmDialog + 颜色去重`
  - Files: `frontend/src/views/CategoryManager.vue`
  - Pre-commit: `cd frontend && npm test`

---

- [ ] 14. **Api.js 清理 + 移除 axios 依赖**

  **What to do** (TDD):
  - **RED**: 写测试验证 `bookmarkApi.importBookmarks` 和 `bookmarkApi.exportBookmarks` 仍可调用（通过别名）
  - **GREEN**:
    - `frontend/src/services/api.js`:
      - 移除 `importBookmarks(file)` 方法（保留 `import(file)`）
      - 移除 `exportBookmarks(selectedIds)` 方法（保留 `export(selectedIds)`）
      - 移除 `getImportProgress(taskId)` 方法（保留 `getProgress(taskId)`）
      - 更新 `BookmarkList.vue` 中调用 `importBookmarks` → `import`，`exportBookmarks` → `export`
      - 更新 `BookmarkList.vue` 中调用 `getImportProgress` → `getProgress`
    - `frontend/package.json`:
      - 从 `dependencies` 移除 `axios`
      - 运行 `npm uninstall axios`
      - 更新 `vite.config.js` 移除 `http-vendor` chunk（如果仅包含 axios）
  - **REFACTOR**: 确保所有导入路径更新

  **Must NOT do**:
  - 不改动 API 功能（只移除别名）
  - 不删除 `import`, `export`, `getProgress` 主方法
  - 不修改 BookmarkList.vue 中其他逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 方法删除 + 重命名调用
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12, T13, T15)
  - **Blocks**: F1-F4
  - **Blocked By**: T1

  **References**:
  - `frontend/src/services/api.js:135-157` — 重复方法
  - `frontend/src/services/api.js:159-173` — 重复方法
  - `frontend/src/views/BookmarkList.vue:369` — 调用 `importBookmarks`
  - `frontend/src/views/BookmarkList.vue:383` — 调用 `getImportProgress`
  - `frontend/src/views/BookmarkList.vue:457` — 调用 `exportBookmarks`
  - `frontend/vite.config.js:43-46` — manualChunks 含 http-vendor (axios)

  **Acceptance Criteria**:
  - [ ] api.js 中无 `importBookmarks`, `exportBookmarks`, `getImportProgress` 方法
  - [ ] BookmarkList.vue 使用新方法名
  - [ ] axios 从 package.json 依赖移除
  - [ ] 前端构建成功

  **QA Scenarios**:
  ```
  Scenario: 验证无重复方法
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. grep "importBookmarks\|exportBookmarks\|getImportProgress" frontend/src/services/api.js
    Expected Result: 只 grep 到主方法定义（import/export/getProgress）
    Evidence: .omo/evidence/task-14-no-dups.txt
  ```
  ```
  Scenario: 前端构建 + 测试通过
    Tool: Bash
    Preconditions: 代码已修改
    Steps:
      1. cd frontend && npm run build && npm test
    Expected Result: Build 成功 + 测试通过
    Evidence: .omo/evidence/task-14-build-test.txt
  ```

  **Commit**: YES (C9)
  - Message: `chore(deps): 移除 axios 清理 api.js 重复方法`
  - Files: `frontend/src/services/api.js`, `frontend/src/views/BookmarkList.vue`, `frontend/package.json`, `frontend/vite.config.js`
  - Pre-commit: `cd frontend && npm run build && npm test`

---

- [ ] 15. **编写前端测试覆盖修复**

  **What to do**:
  - 更新 `frontend/tests/category-manager.test.js`:
    - 添加测试验证错误场景下显示正确消息（验证 T11）
    - 添加测试验证确认弹窗功能（验证 T13 使用 ConfirmDialog 组件）
  - 更新 `frontend/tests/bookmark-list.test.js`:
    - 添加测试验证 api.js 清理后方法调用仍正常（验证 T14）
  - 不修改 `RecentBookmarks` 测试（T12 已在 T1 中覆盖）

  **Must NOT do**:
  - 不删除已有测试
  - 不修改已有测试断言

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 编写测试验证前面修改
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12, T13, T14)
  - **Blocks**: F1-F4
  - **Blocked By**: T1, T11, T13, T14

  **References**:
  - `frontend/tests/category-manager.test.js` — 现有测试
  - `frontend/tests/bookmark-list.test.js` — 现有测试

  **Acceptance Criteria**:
  - [ ] category-manager 测试覆盖错误消息场景
  - [ ] bookmark-list 测试覆盖无别名 API 调用
  - [ ] 所有测试通过

  **QA Scenarios**:
  ```
  Scenario: 全部前端测试通过
    Tool: Bash
    Preconditions: T11-T14 已完成
    Steps:
      1. cd frontend && npm test
    Expected Result: 所有测试通过，0 unhandled errors
    Evidence: .omo/evidence/task-15-all-tests-pass.txt
  ```

  **Commit**: YES (C7/C9)
  - Message: `test(ui): 添加前端修复的测试覆盖`
  - Files: `frontend/tests/category-manager.test.js`, `frontend/tests/bookmark-list.test.js`
  - Pre-commit: `cd frontend && npm test`

---

## 最终验证 Wave

> 4 个评审 Agent 并行运行。全部必须批准。将合并结果呈现给用户并获得明确"确认"后再完成。
>
> **在获得用户明确确认前，不得自动继续进行。如果被拒或有反馈 → 修复 → 重新运行 → 再次呈现 → 等待确认。**

- [ ] F1. **计划合规审计** — `oracle`
  端到端阅读计划。对于每个"必须完成"：验证实现存在。对于每个"不能做的事"：搜索代码库中禁止的模式。检查证据文件存在于 .omo/evidence/。对比计划交付物。
  输出: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **代码质量审查** — `unspecified-high`
  运行 `tsc --noEmit` + 测试。审查所有修改文件。检查 AI 垃圾代码。
  输出: `Build [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **实际 QA 回归测试** — `unspecified-high`
  从干净状态开始。执行所有 TODO 中的 QA 场景。测试跨任务集成。
  输出: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **范围保真检查** — `deep`
  对于每个任务：比较"做什么"与实际 diff。验证 1:1 — 所有内容都构建了，没有超出范围的东西。
  输出: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## 提交策略

提交消息格式: `type(scope): desc`
使用 `git commit --no-verify` 跳过 hooks。

### 提交分组
- **C1 (Wave 1)**: `fix(auth): JWT_SECRET 使用 c.env 环境变量` — `src/middleware/auth.ts src/routes/auth.ts`
- **C2 (Wave 1)**: `fix(export): 添加 userId 过滤保护数据隔离` — `src/services/export.ts src/routes/bookmarks.ts`
- **C3 (Wave 1)**: `fix(auth): 登出简化，移除无效后端黑名单` — `src/routes/auth.ts src/middleware/auth.ts`
- **C4 (Wave 1)**: `fix(schema): 修复 ALTER 顺序，URL 改为按用户唯一` — `schema.sql`
- **C5 (Wave 2)**: `refactor(api): Categories 和 /me 返回 camelCase` — `src/routes/categories.ts src/routes/auth.ts`
- **C6 (Wave 2)**: `test(api): 添加 camelCase 格式测试` — test files
- **C7 (Wave 3)**: `fix(ui): CategoryManager 错误处理 + UI 组件复用` — `CategoryManager.vue`
- **C8 (Wave 3)**: `feat(ui): RecentBookmarks 加载/空/错误状态` — `RecentBookmarks.vue`
- **C9 (Wave 3)**: `chore(deps): 移除 axios 清理重复代码` — `api.js package.json`

---

## 成功标准

### 验证命令
```bash
# 后端测试
cd bookmarks-workers && npm test

# 前端测试
cd frontend && npm test

# 前端构建
cd frontend && npm run build

# 确认无 process.env.JWT_SECRET
grep -r "process\.env\.JWT_SECRET" bookmarks-workers/src/

# 确认无 err.response 模式
grep -rn "err\.response" frontend/src/views/CategoryManager.vue || echo "CLEAN"
```

### 最终检查清单
- [ ] 所有"必须完成"已实现
- [ ] 所有"不能做的事"已遵守
- [ ] 所有测试通过
- [ ] 前端构建成功
- [ ] 无 git push 执行
- [ ] 提交状态为 local，未推送到 remote
