#!/bin/bash
# Verify data integrity after D1 import

set -e

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-bookmarks}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-zh1234}"

D1_DATABASE="${D1_DATABASE:-yaji-bookmarks}"
D1_ENVIRONMENT="${D1_ENVIRONMENT:-production}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_FILE="${SCRIPT_DIR}/../migration-data/verification-report.txt"

echo "=== Data Verification ==="
echo ""

if ! command -v wrangler &> /dev/null; then
    echo "✗ Error: wrangler CLI not found"
    echo "  Install with: npm install -g wrangler"
    exit 1
fi

if ! wrangler whoami &> /dev/null; then
    echo "✗ Error: Not authenticated with Cloudflare"
    echo "  Run: wrangler login"
    exit 1
fi

{
    echo "=== Data Verification Report ==="
    echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""

    echo "--- Record Counts ---"
    MYSQL_CATEGORIES=$(mysql --host="${MYSQL_HOST}" --port="${MYSQL_PORT}" --user="${MYSQL_USER}" --password="${MYSQL_PASSWORD}" -sN -e "SELECT COUNT(*) FROM categories;" "${MYSQL_DATABASE}")
    MYSQL_BOOKMARKS=$(mysql --host="${MYSQL_HOST}" --port="${MYSQL_PORT}" --user="${MYSQL_USER}" --password="${MYSQL_PASSWORD}" -sN -e "SELECT COUNT(*) FROM bookmarks;" "${MYSQL_DATABASE}")

    D1_CATEGORIES=$(wrangler d1 execute "${D1_DATABASE}" --command "SELECT COUNT(*) FROM categories;" --env="${D1_ENVIRONMENT}" 2>/dev/null | grep -oP '\d+' | tail -1)
    D1_BOOKMARKS=$(wrangler d1 execute "${D1_DATABASE}" --command "SELECT COUNT(*) FROM bookmarks;" --env="${D1_ENVIRONMENT}" 2>/dev/null | grep -oP '\d+' | tail -1)

    echo "MySQL Categories: ${MYSQL_CATEGORIES}"
    echo "D1 Categories: ${D1_CATEGORIES}"
    echo "Categories Match: $([ "${MYSQL_CATEGORIES}" = "${D1_CATEGORIES}" ] && echo "✓ YES" || echo "✗ NO")"
    echo ""
    echo "MySQL Bookmarks: ${MYSQL_BOOKMARKS}"
    echo "D1 Bookmarks: ${D1_BOOKMARKS}"
    echo "Bookmarks Match: $([ "${MYSQL_BOOKMARKS}" = "${D1_BOOKMARKS}" ] && echo "✓ YES" || echo "✗ NO")"
    echo ""

    echo "--- Data Integrity Checks ---"

    D1_NULL_TITLES=$(wrangler d1 execute "${D1_DATABASE}" --command "SELECT COUNT(*) FROM bookmarks WHERE title IS NULL OR title = '';" --env="${D1_ENVIRONMENT}" 2>/dev/null | grep -oP '\d+' | tail -1)
    echo "Bookmarks with NULL/empty title: ${D1_NULL_TITLES}"

    D1_NULL_URLS=$(wrangler d1 execute "${D1_DATABASE}" --command "SELECT COUNT(*) FROM bookmarks WHERE url IS NULL OR url = '';" --env="${D1_ENVIRONMENT}" 2>/dev/null | grep -oP '\d+' | tail -1)
    echo "Bookmarks with NULL/empty URL: ${D1_NULL_URLS}"

    D1_INVALID_CATEGORY=$(wrangler d1 execute "${D1_DATABASE}" --command "SELECT COUNT(*) FROM bookmarks WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories);" --env="${D1_ENVIRONMENT}" 2>/dev/null | grep -oP '\d+' | tail -1)
    echo "Bookmarks with invalid category_id: ${D1_INVALID_CATEGORY}"

    D1_DUPLICATE_URLS=$(wrangler d1 execute "${D1_DATABASE}" --command "SELECT COUNT(*) FROM (SELECT url, COUNT(*) as cnt FROM bookmarks GROUP BY url HAVING cnt > 1);" --env="${D1_ENVIRONMENT}" 2>/dev/null | grep -oP '\d+' | tail -1)
    echo "Duplicate URLs: ${D1_DUPLICATE_URLS}"

    echo ""

    echo "--- Sample Data ---"
    echo "First 3 categories:"
    wrangler d1 execute "${D1_DATABASE}" --command "SELECT id, name, color FROM categories LIMIT 3;" --env="${D1_ENVIRONMENT}" 2>/dev/null
    echo ""
    echo "First 3 bookmarks:"
    wrangler d1 execute "${D1_DATABASE}" --command "SELECT id, title, url, category_id FROM bookmarks LIMIT 3;" --env="${D1_ENVIRONMENT}" 2>/dev/null

    echo ""
    echo "--- Verification Summary ---"
    TOTAL_ERRORS=0
    [ "${MYSQL_CATEGORIES}" != "${D1_CATEGORIES}" ] && TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    [ "${MYSQL_BOOKMARKS}" != "${D1_BOOKMARKS}" ] && TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    [ "${D1_NULL_TITLES}" != "0" ] && TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    [ "${D1_NULL_URLS}" != "0" ] && TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    [ "${D1_INVALID_CATEGORY}" != "0" ] && TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    [ "${D1_DUPLICATE_URLS}" != "0" ] && TOTAL_ERRORS=$((TOTAL_ERRORS + 1))

    if [ ${TOTAL_ERRORS} -eq 0 ]; then
        echo "✓ All verification checks passed"
    else
        echo "✗ Found ${TOTAL_ERRORS} issue(s)"
    fi
} | tee "${REPORT_FILE}"

echo ""
echo "Report saved to: ${REPORT_FILE}"
