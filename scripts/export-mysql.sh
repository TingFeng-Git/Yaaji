#!/bin/bash
# MySQL Data Export Script
# Exports bookmarks and categories tables from MySQL database

set -e

# Configuration
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-bookmarks}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-zh1234}"

# Output directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../migration-data"
mkdir -p "${OUTPUT_DIR}"

echo "=== MySQL Data Export ==="
echo "Host: ${MYSQL_HOST}:${MYSQL_PORT}"
echo "Database: ${MYSQL_DATABASE}"
echo "Output: ${OUTPUT_DIR}"
echo ""

# Export categories table
echo "Exporting categories..."
mysqldump \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --no-create-info \
    --skip-triggers \
    --skip-lock-tables \
    --complete-insert \
    --skip-extended-insert \
    --result-file="${OUTPUT_DIR}/categories.sql" \
    "${MYSQL_DATABASE}" \
    categories

if [ $? -eq 0 ]; then
    echo "✓ Categories exported successfully"
else
    echo "✗ Failed to export categories"
    exit 1
fi

# Export bookmarks table
echo "Exporting bookmarks..."
mysqldump \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --no-create-info \
    --skip-triggers \
    --skip-lock-tables \
    --complete-insert \
    --skip-extended-insert \
    --result-file="${OUTPUT_DIR}/bookmarks.sql" \
    "${MYSQL_DATABASE}" \
    bookmarks

if [ $? -eq 0 ]; then
    echo "✓ Bookmarks exported successfully"
else
    echo "✗ Failed to export bookmarks"
    exit 1
fi

# Export as CSV for easier processing
echo ""
echo "Exporting as CSV..."

# Categories CSV
echo "Exporting categories CSV..."
mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --batch \
    --raw \
    -e "SELECT id, name, color, created_at FROM categories ORDER BY id;" \
    "${MYSQL_DATABASE}" > "${OUTPUT_DIR}/categories.csv"

if [ $? -eq 0 ]; then
    echo "✓ Categories CSV exported successfully"
else
    echo "✗ Failed to export categories CSV"
    exit 1
fi

# Bookmarks CSV
echo "Exporting bookmarks CSV..."
mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --batch \
    --raw \
    -e "SELECT id, title, url, description, category_id, created_at, updated_at, last_clicked_at FROM bookmarks ORDER BY id;" \
    "${MYSQL_DATABASE}" > "${OUTPUT_DIR}/bookmarks.csv"

if [ $? -eq 0 ]; then
    echo "✓ Bookmarks CSV exported successfully"
else
    echo "✗ Failed to export bookmarks CSV"
    exit 1
fi

# Count records
CATEGORIES_COUNT=$(mysql --host="${MYSQL_HOST}" --port="${MYSQL_PORT}" --user="${MYSQL_USER}" --password="${MYSQL_PASSWORD}" -sN -e "SELECT COUNT(*) FROM categories;" "${MYSQL_DATABASE}")
BOOKMARKS_COUNT=$(mysql --host="${MYSQL_HOST}" --port="${MYSQL_PORT}" --user="${MYSQL_USER}" --password="${MYSQL_PASSWORD}" -sN -e "SELECT COUNT(*) FROM bookmarks;" "${MYSQL_DATABASE}")

echo ""
echo "=== Export Summary ==="
echo "Categories: ${CATEGORIES_COUNT} records"
echo "Bookmarks: ${BOOKMARKS_COUNT} records"
echo ""
echo "Files created:"
echo "  - ${OUTPUT_DIR}/categories.sql"
echo "  - ${OUTPUT_DIR}/bookmarks.sql"
echo "  - ${OUTPUT_DIR}/categories.csv"
echo "  - ${OUTPUT_DIR}/bookmarks.csv"
echo ""
echo "Next step: Run convert-data.sh to convert to D1 format"
