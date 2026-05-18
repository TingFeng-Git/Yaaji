# 雅集 (Yaji) - 待办任务清单

> 生成时间: 2026-05-18
> 数据来源: `.sisyphus/plans/cloudflare-migration.md`, `.sisyphus/notepads/`, `.sisyphus/evidence/`

---

## 📊 项目状态概览

| 指标 | 状态 |
|------|------|
| 迁移计划 (18个主任务) | ✅ 全部完成 |
| 最终验证 (F1-F4) | ⏳ 待执行 |
| 测试通过率 | 127/127 (100%) |
| 源代码 TODO/FIXME | 0 个 |

---

## ⏳ 待执行任务

### 最终验证波次 (Final Verification Wave)

以下4个任务尚未执行，是计划中唯一未完成的部分：

- [ ] **F1. 计划合规审计** — `oracle`
  - 读取整个计划，验证每个"必须实现"功能是否存在
  - 检查"必须不实现"功能是否确实未实现
  - 验证证据文件存在于 `.sisyphus/evidence/`
  - 输出格式: `必须实现 [N/N] | 必须不实现 [N/N] | 任务 [N/N] | 判定: 通过/拒绝`

- [ ] **F2. 代码质量审查** — `unspecified-high`
  - 运行 TypeScript 编译检查 + linter + 测试
  - 审查所有更改文件：检查 `as any`、空 catch、console.log、注释代码、未使用导入
  - 检查 AI 代码问题：过度注释、过度抽象、通用名称
  - 输出格式: `构建 [通过/失败] | Lint [通过/失败] | 测试 [N通过/N失败] | 文件 [N干净/N问题] | 判定`

- [ ] **F3. 实际 QA 测试** — `unspecified-high`
  - 从干净状态开始，执行每个任务的 QA 场景
  - 测试跨任务集成（功能协同工作）
  - 测试边缘情况：空状态、无效输入、快速操作
  - 保存证据到 `.sisyphus/evidence/final-qa/`

- [ ] **F4. 范围保真度检查** — `deep`
  - 对每个任务：读取"要做什么"，读取实际 diff
  - 验证 1:1 - 规范内容都已构建（无遗漏），规范外内容未构建（无蔓延）
  - 检查"必须不实现"合规性
  - 检测跨任务污染
  - 输出格式: `任务 [N/N合规] | 污染 [干净/N问题] | 未accounted [干净/N文件] | 判定`

---

## 🔧 已知问题（需修复）

从代码质量审计中发现的问题：

### 高优先级

| 问题 | 文件 | 描述 |
|------|------|------|
| 重复路由定义 | `bookmarks-workers/src/routes/bookmarks.ts` | Task 9 和 Task 12 都定义了 `/import` 和 `/import/progress` 路由 (lines 55-90 vs 262-314) |
| 空 catch 块 | `bookmarks-workers/src/services/async.ts:122` | 静默吞掉错误，应添加错误处理 |

### 中优先级

| 问题 | 文件 | 描述 |
|------|------|------|
| console.error 语句 | 前端 5 个文件 | 共 22 处 `console.error`，生产环境应移除或使用 logger |
| 类型断言 | `bookmarks-workers/src/services/export.ts` | 3 处 `as unknown as` 类型断言 |
| 组件过大 | `frontend/src/components/BookmarkList.vue` | 1351 行，需要拆分 |

### 低优先级

| 问题 | 描述 |
|------|------|
| 未配置 ESLint | 项目缺少 linting 配置 |
| 前端代理配置 | `vite.config.js` 代理目标仍指向 `localhost:8080` (Spring Boot)，应改为 `8787` (Workers) |
| 测试覆盖缺失 | 后端集成测试缺少导入/导出测试 |
| Schema 不一致 | `import_tasks` 表在 `schema.sql` 和 `import.ts` 中字段名不同 (`imported_count` vs `imported`) |

---

## 📋 已完成任务清单

### Wave 1 - 基础设施 ✅
- [x] Task 1: Cloudflare Workers 项目初始化
- [x] Task 2: D1 数据库 Schema 设计
- [x] Task 3: 前端 Cloudflare Pages 配置
- [x] Task 4: 开发环境搭建

### Wave 2 - 核心 API ✅
- [x] Task 5: 书签 CRUD API (包含 clickCount)
- [x] Task 6: 分类管理 API
- [x] Task 7: 数据库迁移脚本
- [x] Task 8: API 集成测试

### Wave 3 - 高级功能 ✅
- [x] Task 9: 书签导入功能
- [x] Task 10: 书签导出功能 (支持选择性导出)
- [x] Task 11: URL 标题抓取
- [x] Task 12: 异步处理实现

### Wave 4 - 前端迁移 ✅
- [x] Task 13: 前端 API 适配 (包含最近访问功能)
- [x] Task 14: 前端构建优化
- [x] Task 15: 前端集成测试

### Wave 5 - 部署与验证 ✅
- [x] Task 16: 生产环境部署
- [x] Task 17: 性能优化
- [x] Task 18: 文档更新

---

## 🎯 建议的下一步

1. **执行最终验证波次 (F1-F4)** — 这是计划中唯一未完成的部分
2. **修复高优先级问题** — 重复路由和空 catch 块
3. **更新前端代理配置** — 将 `localhost:8080` 改为 `localhost:8787`
4. **考虑添加 ESLint** — 提高代码质量一致性

---

## 📁 相关文件

- 计划文件: `.sisyphus/plans/cloudflare-migration.md`
- 实施记录: `.sisyphus/notepads/cloudflare-migration/learnings.md`
- 测试报告: `.sisyphus/evidence/final-qa/final-report.md`
- 活动状态: `.sisyphus/boulder.json`
