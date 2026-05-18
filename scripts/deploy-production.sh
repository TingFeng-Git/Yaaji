#!/bin/bash
set -e

# ============================================
# 雅集 (Yaji) - 生产环境部署脚本
# ============================================
# 使用方法:
#   ./scripts/deploy-production.sh           # 完整部署
#   ./scripts/deploy-production.sh workers    # 仅部署 Workers
#   ./scripts/deploy-production.sh frontend   # 仅部署前端
#   ./scripts/deploy-production.sh setup-db   # 仅设置数据库
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKERS_DIR="$PROJECT_ROOT/bookmarks-workers"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# ============================================
# Step 0: 检查认证
# ============================================
check_auth() {
    log "检查 Cloudflare 认证状态..."
    if ! npx wrangler whoami >/dev/null 2>&1; then
        error "Wrangler 未认证。请先运行 'wrangler login' 或设置 CLOUDFLARE_API_TOKEN 环境变量。"
    fi
    success "Cloudflare 认证通过"
}

# ============================================
# Step 1: 创建生产环境 D1 数据库
# ============================================
setup_database() {
    log "设置生产环境 D1 数据库..."

    cd "$WORKERS_DIR"

    # 检查是否已有生产数据库
    local existing_db
    existing_db=$(npx wrangler d1 list 2>/dev/null | grep "yaji-bookmarks" || true)

    if [ -n "$existing_db" ]; then
        warn "已存在名为 yaji-bookmarks 的数据库"
        log "现有数据库列表:"
        npx wrangler d1 list
        echo ""
        read -p "是否使用现有数据库? (y/n): " use_existing
        if [ "$use_existing" != "y" ]; then
            log "创建新的生产数据库..."
            create_production_db
        else
            log "使用现有数据库"
            read -p "请输入数据库 ID: " db_id
            update_wrangler_db_id "$db_id"
        fi
    else
        create_production_db
    fi
}

create_production_db() {
    log "创建新的 D1 数据库: yaji-bookmarks-prod..."
    local output
    output=$(npx wrangler d1 create yaji-bookmarks-prod 2>&1)
    echo "$output"

    local db_id
    db_id=$(echo "$output" | grep -oP 'database_id = "\K[^"]+' || true)

    if [ -z "$db_id" ]; then
        error "无法提取数据库 ID，请手动创建并更新 wrangler.toml"
    fi

    success "数据库创建成功，ID: $db_id"
    update_wrangler_db_id "$db_id"

    log "初始化数据库 Schema..."
    npx wrangler d1 execute yaji-bookmarks-prod --env production --file=schema.sql
    success "数据库 Schema 初始化完成"
}

update_wrangler_db_id() {
    local db_id="$1"

    # 更新生产环境的 database_id
    if grep -q "YOUR_PRODUCTION_DATABASE_ID" "$WORKERS_DIR/wrangler.toml"; then
        sed -i "s/YOUR_PRODUCTION_DATABASE_ID/$db_id/" "$WORKERS_DIR/wrangler.toml"
        success "wrangler.toml 已更新，生产数据库 ID: $db_id"
    else
        warn "wrangler.toml 中未找到占位符，请手动更新 env.production.d1_databases.database_id"
    fi
}

# ============================================
# Step 2: 部署 Workers
# ============================================
deploy_workers() {
    log "部署 Workers 到生产环境..."

    cd "$WORKERS_DIR"

    # TypeScript 类型检查
    log "运行 TypeScript 类型检查..."
    npx tsc --noEmit
    success "类型检查通过"

    # 运行测试
    log "运行测试..."
    npm test
    success "所有测试通过"

    # 部署到生产环境
    log "正在部署到 Cloudflare Workers (production)..."
    npx wrangler deploy --env production 2>&1 | tee /tmp/workers-deploy.txt

    local worker_url
    worker_url=$(grep -oP 'https://[^\s]+' /tmp/workers-deploy.txt | head -1 || true)

    if [ -n "$worker_url" ]; then
        success "Workers 部署成功: $worker_url"
    else
        success "Workers 部署完成"
    fi
}

# ============================================
# Step 3: 构建并部署前端到 Pages
# ============================================
deploy_frontend() {
    log "构建并部署前端到 Cloudflare Pages..."

    cd "$FRONTEND_DIR"

    # 安装依赖
    log "安装前端依赖..."
    npm install

    # 运行测试
    log "运行前端测试..."
    npm test
    success "前端测试通过"

    # 构建
    log "构建前端..."
    npm run build
    success "前端构建完成"

    # 部署到 Pages
    log "正在部署到 Cloudflare Pages..."
    npx wrangler pages deploy dist --project-name bookmarks-frontend 2>&1 | tee /tmp/pages-deploy.txt

    local pages_url
    pages_url=$(grep -oP 'https://[^\s]+\.pages\.dev' /tmp/pages-deploy.txt | head -1 || true)

    if [ -n "$pages_url" ]; then
        success "前端部署成功: $pages_url"
    else
        success "前端部署完成"
    fi
}

# ============================================
# Step 4: 验证部署
# ============================================
verify_deployment() {
    log "验证部署..."

    # 从部署输出中获取 URL
    local worker_url pages_url
    worker_url=$(grep -oP 'https://[^\s]+' /tmp/workers-deploy.txt 2>/dev/null | head -1 || echo "")
    pages_url=$(grep -oP 'https://[^\s]+\.pages\.dev' /tmp/pages-deploy.txt 2>/dev/null | head -1 || echo "")

    if [ -n "$worker_url" ]; then
        log "测试 Workers API..."
        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" "$worker_url" 2>/dev/null || echo "000")
        if [ "$response" = "200" ]; then
            success "Workers API 响应正常 (HTTP $response)"
        else
            warn "Workers API 响应: HTTP $response"
        fi
    fi

    if [ -n "$pages_url" ]; then
        log "测试前端页面..."
        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" "$pages_url" 2>/dev/null || echo "000")
        if [ "$response" = "200" ]; then
            success "前端页面响应正常 (HTTP $response)"
        else
            warn "前端页面响应: HTTP $response"
        fi
    fi
}

# ============================================
# Step 5: 输出配置指南
# ============================================
print_guide() {
    echo ""
    echo "=========================================="
    echo "  部署完成！后续配置指南"
    echo "=========================================="
    echo ""
    echo "1. 配置自定义域名 (Workers):"
    echo "   - 访问 Cloudflare Dashboard → Workers & Pages"
    echo "   - 选择 yaji-bookmarks → Settings → Domains & Routes"
    echo "   - 添加自定义域名 (如 api.yourdomain.com)"
    echo ""
    echo "2. 配置自定义域名 (Pages):"
    echo "   - 访问 Cloudflare Dashboard → Workers & Pages"
    echo "   - 选择 bookmarks-frontend → Custom domains"
    echo "   - 添加自定义域名 (如 yourdomain.com)"
    echo ""
    echo "3. 更新前端 API URL:"
    echo "   - 在 Pages 项目设置中添加环境变量:"
    echo "   - VITE_API_URL = https://api.yourdomain.com/api"
    echo "   - 重新部署前端以应用新的环境变量"
    echo ""
    echo "4. SSL/TLS:"
    echo "   - Cloudflare 自动为自定义域名提供 SSL 证书"
    echo "   - 在 Cloudflare Dashboard → SSL/TLS 确认加密模式为 'Full (strict)'"
    echo ""
    echo "5. CORS 配置:"
    echo "   - 更新 wrangler.toml 中 env.production.vars.CORS_ORIGIN"
    echo "   - 设置为你的前端域名 (如 https://yourdomain.com)"
    echo "   - 重新部署 Workers: npx wrangler deploy --env production"
    echo ""
    echo "=========================================="
}

# ============================================
# 主流程
# ============================================
main() {
    local target="${1:-all}"

    echo "=========================================="
    echo "  雅集 (Yaji) - 生产环境部署"
    echo "=========================================="
    echo ""

    check_auth

    case "$target" in
        setup-db)
            setup_database
            ;;
        workers)
            deploy_workers
            ;;
        frontend)
            deploy_frontend
            ;;
        all)
            setup_database
            deploy_workers
            deploy_frontend
            verify_deployment
            print_guide
            ;;
        verify)
            verify_deployment
            ;;
        *)
            error "未知命令: $target\n可用命令: all, setup-db, workers, frontend, verify"
            ;;
    esac

    success "操作完成！"
}

main "$@"
