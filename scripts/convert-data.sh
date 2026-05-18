#!/bin/bash
# Convert MySQL export data to D1/SQLite format
# Handles: datetime format conversion, column mapping, click_count addition

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_DIR="${SCRIPT_DIR}/../migration-data"
OUTPUT_DIR="${INPUT_DIR}/d1-import"
mkdir -p "${OUTPUT_DIR}"

echo "=== Data Conversion: MySQL → D1 ==="
echo "Input: ${INPUT_DIR}"
echo "Output: ${OUTPUT_DIR}"
echo ""

if [ ! -f "${INPUT_DIR}/categories.csv" ] || [ ! -f "${INPUT_DIR}/bookmarks.csv" ]; then
    echo "✗ Error: CSV files not found in ${INPUT_DIR}"
    echo "  Run export-mysql.sh first"
    exit 1
fi

convert_datetime() {
    local dt="$1"
    if [ -z "$dt" ] || [ "$dt" = "NULL" ] || [ "$dt" = "null" ]; then
        echo "NULL"
        return
    fi
    # MySQL format: 2024-01-15 10:30:00 → SQLite format: 2024-01-15T10:30:00
    echo "$dt" | sed "s/ /T/g" | sed "s/\.[0-9]*$//"
}

escape_sql() {
    local str="$1"
    if [ -z "$str" ] || [ "$str" = "NULL" ] || [ "$str" = "null" ]; then
        echo "NULL"
        return
    fi
    # Escape single quotes for SQL
    echo "'$(echo "$str" | sed "s/'/''/g")'"
}

echo "Converting categories..."
CATEGORIES_SQL="${OUTPUT_DIR}/categories.sql"
echo "PRAGMA foreign_keys = ON;" > "${CATEGORIES_SQL}"
echo "BEGIN TRANSACTION;" >> "${CATEGORIES_SQL}"

# Skip header line, process CSV
tail -n +2 "${INPUT_DIR}/categories.csv" | while IFS=$'\t' read -r id name color created_at; do
    # Clean up carriage returns
    id=$(echo "$id" | tr -d '\r')
    name=$(echo "$name" | tr -d '\r')
    color=$(echo "$color" | tr -d '\r')
    created_at=$(echo "$created_at" | tr -d '\r')

    name_escaped=$(escape_sql "$name")
    color_escaped=$(escape_sql "$color")
    created_at_converted=$(convert_datetime "$created_at")

    if [ "$created_at_converted" = "NULL" ]; then
        created_at_converted="'$(date -u +%Y-%m-%dT%H:%M:%S)'"
    fi

    echo "INSERT INTO categories (id, name, color, created_at) VALUES (${id}, ${name_escaped}, ${color_escaped}, ${created_at_converted});" >> "${CATEGORIES_SQL}"
done

echo "COMMIT;" >> "${CATEGORIES_SQL}"

CATEGORIES_COUNT=$(tail -n +3 "${CATEGORIES_SQL}" | grep -c "INSERT" || echo "0")
echo "✓ Categories converted: ${CATEGORIES_COUNT} records"

echo "Converting bookmarks..."
BOOKMARKS_SQL="${OUTPUT_DIR}/bookmarks.sql"
echo "PRAGMA foreign_keys = ON;" > "${BOOKMARKS_SQL}"
echo "BEGIN TRANSACTION;" >> "${BOOKMARKS_SQL}"

# Skip header line, process CSV
tail -n +2 "${INPUT_DIR}/bookmarks.csv" | while IFS=$'\t' read -r id title url description category_id created_at updated_at last_clicked_at; do
    # Clean up carriage returns
    id=$(echo "$id" | tr -d '\r')
    title=$(echo "$title" | tr -d '\r')
    url=$(echo "$url" | tr -d '\r')
    description=$(echo "$description" | tr -d '\r')
    category_id=$(echo "$category_id" | tr -d '\r')
    created_at=$(echo "$created_at" | tr -d '\r')
    updated_at=$(echo "$updated_at" | tr -d '\r')
    last_clicked_at=$(echo "$last_clicked_at" | tr -d '\r')

    title_escaped=$(escape_sql "$title")
    url_escaped=$(escape_sql "$url")
    description_escaped=$(escape_sql "$description")
    created_at_converted=$(convert_datetime "$created_at")
    updated_at_converted=$(convert_datetime "$updated_at")
    last_clicked_at_converted=$(convert_datetime "$last_clicked_at")

    if [ "$category_id" = "NULL" ] || [ "$category_id" = "null" ] || [ -z "$category_id" ]; then
        category_id="NULL"
    fi

    if [ "$created_at_converted" = "NULL" ]; then
        created_at_converted="'$(date -u +%Y-%m-%dT%H:%M:%S)'"
    fi

    if [ "$updated_at_converted" = "NULL" ]; then
        updated_at_converted="${created_at_converted}"
    fi

    echo "INSERT INTO bookmarks (id, title, url, description, category_id, click_count, created_at, updated_at, last_clicked_at) VALUES (${id}, ${title_escaped}, ${url_escaped}, ${description_escaped}, ${category_id}, 0, ${created_at_converted}, ${updated_at_converted}, ${last_clicked_at_converted});" >> "${BOOKMARKS_SQL}"
done

echo "COMMIT;" >> "${BOOKMARKS_SQL}"

BOOKMARKS_COUNT=$(tail -n +3 "${BOOKMARKS_SQL}" | grep -c "INSERT" || echo "0")
echo "✓ Bookmarks converted: ${BOOKMARKS_COUNT} records"

echo ""
echo "=== Conversion Summary ==="
echo "Categories: ${CATEGORIES_COUNT} records"
echo "Bookmarks: ${BOOKMARKS_COUNT} records"
echo ""
echo "Files created:"
echo "  - ${OUTPUT_DIR}/categories.sql"
echo "  - ${OUTPUT_DIR}/bookmarks.sql"
echo ""
echo "Next step: Run import-d1.sh to import into Cloudflare D1"
