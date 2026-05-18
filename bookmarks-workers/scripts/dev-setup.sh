#!/bin/bash
set -e

DB_NAME="yaaji-bookmarks"

echo "=== 初始化本地开发 D1 数据库 ==="
echo "数据库: $DB_NAME"

# 1. 创建本地 D1 数据库（如果不存在）
echo ""
echo "[1/3] 确保本地 D1 数据库存在..."
npx wrangler d1 create "$DB_NAME" 2>/dev/null || echo "  数据库已存在，跳过创建"

# 2. 应用 schema
echo ""
echo "[2/3] 应用 schema..."
npx wrangler d1 execute "$DB_NAME" --local --file=schema.sql

# 3. 导入种子数据
echo ""
echo "[3/3] 导入种子数据..."
npx wrangler d1 execute "$DB_NAME" --local --file=scripts/seed.sql

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "启动本地服务:"
echo "  cd bookmarks-workers && npm run dev"
echo "  cd frontend && npm run dev"
echo ""
echo "访问: http://localhost:3000"
