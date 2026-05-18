# API 文档

雅集 (Yaji) 书签管理工具 API 文档。

## 概览

- **Base URL**: `/api`
- **Content-Type**: `application/json`
- **认证**: 无（当前完全开放）

## 书签 API

### 获取所有书签

```http
GET /api/bookmarks
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `categoryId` | number | 否 | 按分类过滤 |

**响应**

```json
[
  {
    "id": 1,
    "title": "Example",
    "url": "https://example.com",
    "description": "示例网站",
    "categoryId": 1,
    "clickCount": 5,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "lastClickedAt": "2024-01-15T12:00:00.000Z"
  }
]
```

### 获取最近访问的书签

```http
GET /api/bookmarks/recent
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | number | 否 | 返回数量，默认 5 |

**响应**

```json
[
  {
    "id": 1,
    "title": "Example",
    "url": "https://example.com",
    "clickCount": 5,
    "lastClickedAt": "2024-01-15T12:00:00.000Z"
  }
]
```

### 检查 URL 是否存在

```http
GET /api/bookmarks/check-url?url=https://example.com
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 要检查的 URL |

**响应**

```json
{
  "exists": true,
  "bookmark": {
    "id": 1,
    "title": "Example",
    "url": "https://example.com"
  }
}
```

或

```json
{
  "exists": false,
  "bookmark": null
}
```

### 获取单个书签

```http
GET /api/bookmarks/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 书签 ID |

**响应**

```json
{
  "id": 1,
  "title": "Example",
  "url": "https://example.com",
  "description": "示例网站",
  "categoryId": 1,
  "clickCount": 5,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "lastClickedAt": "2024-01-15T12:00:00.000Z"
}
```

**错误响应**

```json
{
  "error": "Bookmark not found"
}
```

### 创建书签

```http
POST /api/bookmarks
```

**请求体**

```json
{
  "title": "Example",
  "url": "https://example.com",
  "description": "示例网站",
  "categoryId": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 书签标题 |
| `url` | string | 是 | 书签 URL（唯一） |
| `description` | string | 否 | 书签描述 |
| `categoryId` | number | 否 | 分类 ID |

**响应**

```json
{
  "id": 1,
  "title": "Example",
  "url": "https://example.com",
  "description": "示例网站",
  "categoryId": 1,
  "clickCount": 0,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "lastClickedAt": null
}
```

**错误响应**

```json
{
  "error": "Title and URL are required"
}
```

或

```json
{
  "error": "URL already exists"
}
```

### 更新书签

```http
PUT /api/bookmarks/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 书签 ID |

**请求体**

```json
{
  "title": "Updated Title",
  "url": "https://example.com/updated",
  "description": "更新后的描述",
  "categoryId": 2
}
```

所有字段都是可选的，只更新提供的字段。

**响应**

```json
{
  "id": 1,
  "title": "Updated Title",
  "url": "https://example.com/updated",
  "description": "更新后的描述",
  "categoryId": 2,
  "clickCount": 5,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T08:00:00.000Z",
  "lastClickedAt": "2024-01-15T12:00:00.000Z"
}
```

**错误响应**

```json
{
  "error": "Bookmark not found"
}
```

或

```json
{
  "error": "URL already exists"
}
```

### 删除书签

```http
DELETE /api/bookmarks/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 书签 ID |

**响应**

- 状态码：`204 No Content`
- 无响应体

**错误响应**

```json
{
  "error": "Bookmark not found"
}
```

### 记录点击

```http
POST /api/bookmarks/:id/click
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 书签 ID |

**响应**

```json
{
  "id": 1,
  "title": "Example",
  "url": "https://example.com",
  "clickCount": 6,
  "lastClickedAt": "2024-01-16T10:00:00.000Z"
}
```

**错误响应**

```json
{
  "error": "Bookmark not found"
}
```

### 批量删除书签

```http
POST /api/bookmarks/batch-delete
```

**请求体**

```json
[1, 2, 3]
```

数组形式的书签 ID 列表。

**响应**

```json
{
  "success": true,
  "message": "成功删除 3 个书签"
}
```

**错误响应**

```json
{
  "success": false,
  "message": "No IDs provided"
}
```

### 导入书签

```http
POST /api/bookmarks/import
Content-Type: multipart/form-data
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | HTML 书签文件 |

**响应**

```json
{
  "success": true,
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "开始导入..."
}
```

**错误响应**

```json
{
  "error": "请选择要导入的文件"
}
```

### 查询导入进度

```http
GET /api/bookmarks/import/progress?taskId=550e8400-e29b-41d4-a716-446655440000
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | string | 是 | 任务 ID |

**响应**

```json
{
  "current": 50,
  "total": 100,
  "status": "processing",
  "message": "正在导入: 50/100",
  "percent": 50
}
```

**任务状态**

| 状态 | 说明 |
|------|------|
| `pending` | 等待处理 |
| `processing` | 正在处理 |
| `completed` | 完成 |
| `failed` | 失败 |

**错误响应**

```json
{
  "error": "taskId is required"
}
```

或

```json
{
  "error": "Task not found"
}
```

### 导出所有书签

```http
GET /api/bookmarks/export
```

**响应**

- Content-Type: `text/html`
- Content-Disposition: `attachment; filename="bookmarks_2024-01-16.html"`

返回 Netscape Bookmark File 格式的 HTML 文件。

### 选择性导出书签

```http
POST /api/bookmarks/export
Content-Type: application/json
```

**请求体**

```json
{
  "ids": [1, 2, 3]
}
```

**响应**

- Content-Type: `text/html`
- Content-Disposition: `attachment; filename="bookmarks_2024-01-16.html"`

返回包含指定书签的 HTML 文件。

## 分类 API

### 获取所有分类

```http
GET /api/categories
```

**响应**

```json
[
  {
    "id": 1,
    "name": "开发工具",
    "color": "#667eea",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### 获取单个分类

```http
GET /api/categories/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 分类 ID |

**响应**

```json
{
  "id": 1,
  "name": "开发工具",
  "color": "#667eea",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**错误响应**

```json
{
  "error": "Category not found with id: 1"
}
```

### 创建分类

```http
POST /api/categories
```

**请求体**

```json
{
  "name": "开发工具",
  "color": "#667eea"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 分类名称 |
| `color` | string | 否 | 颜色值，默认 `#667eea` |

**响应**

```json
{
  "id": 1,
  "name": "开发工具",
  "color": "#667eea",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**错误响应**

```json
{
  "error": "Category name is required"
}
```

### 更新分类

```http
PUT /api/categories/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 分类 ID |

**请求体**

```json
{
  "name": "更新后的名称",
  "color": "#ff6b6b"
}
```

**响应**

```json
{
  "id": 1,
  "name": "更新后的名称",
  "color": "#ff6b6b",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**错误响应**

```json
{
  "error": "Category not found with id: 1"
}
```

或

```json
{
  "error": "Category name is required"
}
```

### 删除分类

```http
DELETE /api/categories/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 分类 ID |

**响应**

- 状态码：`204 No Content`
- 无响应体

**错误响应**

```json
{
  "error": "Category not found with id: 1"
}
```

### 批量删除分类

```http
POST /api/categories/batch-delete
```

**请求体**

```json
[1, 2, 3]
```

数组形式的分类 ID 列表。

**响应**

- 状态码：`204 No Content`
- 无响应体

**错误响应**

```json
{
  "error": "IDs array is required"
}
```

### 删除空分类

```http
DELETE /api/categories/empty
```

删除所有没有关联书签的分类。

**响应**

```json
{
  "deletedCount": 3
}
```

## URL API

### 获取 URL 标题

```http
GET /api/url/title?url=https://example.com
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 要抓取的 URL |

**响应**

```json
{
  "title": "Example Domain"
}
```

或

```json
{
  "title": null
}
```

**错误响应**

```json
{
  "title": null,
  "error": "url parameter is required"
}
```

## 错误码

| 状态码 | 说明 |
|--------|------|
| `200` | 成功 |
| `201` | 创建成功 |
| `204` | 删除成功（无响应体） |
| `400` | 请求参数错误 |
| `404` | 资源不存在 |
| `409` | 冲突（如 URL 已存在） |
| `500` | 服务器内部错误 |

## 数据模型

### Bookmark

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 自增 ID |
| `title` | string | 标题 |
| `url` | string | URL（唯一） |
| `description` | string | 描述 |
| `categoryId` | number | 分类 ID |
| `clickCount` | number | 点击次数 |
| `createdAt` | string | 创建时间（ISO 8601） |
| `updatedAt` | string | 更新时间（ISO 8601） |
| `lastClickedAt` | string | 最后点击时间（ISO 8601） |

### Category

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 自增 ID |
| `name` | string | 名称 |
| `color` | string | 颜色值（HEX） |
| `createdAt` | string | 创建时间（ISO 8601） |

## 示例

### 创建书签

```bash
curl -X POST http://localhost:8787/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "GitHub",
    "url": "https://github.com",
    "description": "代码托管平台",
    "categoryId": 1
  }'
```

### 获取书签列表

```bash
curl http://localhost:8787/api/bookmarks
```

### 按分类过滤

```bash
curl "http://localhost:8787/api/bookmarks?categoryId=1"
```

### 导入书签

```bash
curl -X POST http://localhost:8787/api/bookmarks/import \
  -F "file=@bookmarks.html"
```

### 导出书签

```bash
curl http://localhost:8787/api/bookmarks/export -o bookmarks.html
```
