# Draft: 雅集 (Yaji) 全面评估与优化

## 项目状态概要

### 构建状态
| 模块 | 状态 | 详情 |
|------|------|------|
| 后端 Workers | ✅ 通过 | TypeScript 编译通过，无错误 |
| 前端 Frontend | ✅ 通过 | Vite 构建成功，48个模块 |
| 前端测试 | ⚠️ 通过但有警告 | 90 tests passed, 15 unhandled errors |
| 后端测试 | ✅ 通过 | 52 tests passed, 0 failures |
| Chrome Extension | ✅ 通过 | 构建成功 |

## 发现的关键问题

### 🔴 严重问题

1. **`process.env.JWT_SECRET` 在 Workers 中不可用**
   - `middleware/auth.ts` 和 `routes/auth.ts` 使用 `process.env.JWT_SECRET`
   - Cloudflare Workers 运行时没有 `process.env`，环境变量通过 `c.env` 传入
   - 这将导致认证在高版本 Workers 运行时完全失效
   - 需改为通过 `c.env.JWT_SECRET` 获取

2. **`exportBookmarks` 未按用户过滤**
   - `src/services/export.ts` 导出时没有 `WHERE user_id = ?` 条件
   - 用户 A 可以导出所有用户的书签，这是一个安全问题

3. **前端 Categories 响应未做 camelCase 转换**
   - Bookmark 路由使用 `mapBookmark()` 将 snake_case 转为 camelCase
   - Category 路由直接返回 D1 原始 snake_case 数据
   - 前端期望 camelCase（如 `createdAt`），但获取到的是 `created_at`

### 🟡 中等问题

4. **前端使用 `fetch` 而非 `axios`**
   - `package.json` 中依赖了 `axios`，但 `api.js` 使用原生 `fetch`
   - 导致 `CategoryManager.vue` 中的错误处理使用了 axios 模式 (`err.response?.data?.error`)，在 fetch 中不工作

5. **`RecentBookmarks.vue` 无防御性检查**
   - 模板中 `recentBookmarks.length` 在初始值为 `undefined` 时会报错
   - 导致测试中 15 个 unhandled errors

6. **前端无 TypeScript**
   - 所有文件为 `.js`/`.vue`，缺少类型安全
   - 与后端 TypeScript 方向不一致

### 🟢 低等问题

7. **CategoryManager 颜色重复** - `'#fa709a'` 出现两次
8. **Frontend logger 功能过于简单** - 只有开发环境 console
9. **`api.js` 中有重复方法** - `importBookmarks/import`、`exportBookmarks/export` 等功能重复

## 用户需求确认

- [x] **全面测试** - 已完成构建+测试覆盖
- [x] **判断可用性** - 功能完整可用，但存在生产环境阻塞问题
- [ ] **架构优化** - 需要修复上述问题
- [ ] **页面展示** - UI 可优化
- [ ] **允许提交（不push）** - 允许 git commit

## 用户决策记录

- **前端 TypeScript**: 不迁移
- **优化范围**: 全部做（Bug修复+架构+UI）
- **API格式**: 统一 camelCase
- **测试**: TDD 模式
- **密码哈希**: 推迟处理，标记为技术债务
- **登出**: 简化为客户端清除，移除后端黑名单逻辑
- **URL唯一性**: 改为按用户唯一 (url + user_id 组合约束)

## 最终范围定义

### IN (本次做)
1. JWT_SECRET 使用 c.env 代替 process.env
2. Export 数据按用户过滤
3. Categories API camelCase 映射
4. Auth /me camelCase 映射
5. 登出简化为客户端清除
6. URL 唯一约束改为按用户
7. CategoryManager 错误处理修复 (err.response → err.message)
8. RecentBookmarks 加载/空/错误状态
9. api.js 重复方法清理
10. axios 依赖移除
11. CategoryManager 颜色去重
12. CategoryManager 确认弹窗复用 ConfirmDialog 组件
13. api.js fetch 错误处理对齐
14. Chrome Extension: 仅结构模式修复（不接入后端）
15. 数据库 Schema 排序问题修复

### OUT (本次不做)
- Chrome Extension 接入 Workers 后端
- 密码哈希升级 (Web Crypto API)
- 前端 TypeScript 迁移
- 新增 API 端点
- 引入 zod 等校验库
- Token 刷新机制
