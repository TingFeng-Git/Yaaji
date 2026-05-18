#!/bin/bash
# Import converted data into Cloudflare D1 database

set -e

D1_DATABASE="${D1_DATABASE:-yaji-bookmarks}"
D1_ENVIRONMENT="${D1_ENVIRONMENT:-production}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_DIR="${SCRIPT_DIR}/../migration-data/d1-import"

echo "=== D1 Data Import ==="
echo "Database: ${D1_DATABASE}"
echo "Environment: ${D1_ENVIRONMENT}"
echo "Input: ${INPUT_DIR}"
echo ""

if [ ! -f "${INPUT_DIR}/categories.sql" ] || [ ! -f "${INPUT_DIR}/bookmarks.sql" ]; then
    echo "✗ Error: SQL files not found in ${INPUT_DIR}"
    echo "  Run convert-data.sh first"
    exit 1
fi

if ! command -v wrangler &> /dev/null; then
    echo "✗ Error: wrangler CLI not found"
    echo "  Install with: npm install -g wrangler"
    exit 1
fi

echo "Verifying wrangler authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "✗ Error: Not authenticated with Cloudflare"
    echo "  Run: wrangler login"
    exit 1
fi
echo "✓ Authenticated"
echo ""

echo "Importing categories..."
if wrangler d1 execute "${D1_DATABASE}" --file="${INPUT_DIR}/categories.sql" --env="${D1_ENVIRONMENT}"; then
    echo "✓ Categories imported successfully"
else
    echo "✗ Failed to import categories"
    exit 1
fi

echo ""
echo "Importing bookmarks..."
if wrangler d1 execute "${D1_DATABASE}" --file="${INPUT_DIR}/bookmarks.sql" --env="${D1_ENVIRONMENT}"; then
    echo "✓ Bookmarks imported successfully"
else
    echo "✗ Failed to import bookmarks"
    exit 1
fi

echo ""
echo "=== Import Complete ==="
echo "Data has been imported into D1 database: ${D1_DATABASE}"
echo ""
echo "Next step: Run verify-data.sh to verify data integrity"
