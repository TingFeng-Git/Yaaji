#!/bin/bash
set -e

DB_NAME="${1:-yaji-bookmarks}"

echo "🗄️  Setting up D1 database: $DB_NAME"

if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler not found. Install with: npm install -g wrangler"
    exit 1
fi

echo "📦 Creating D1 database..."
wrangler d1 create "$DB_NAME" 2>&1 | tee /tmp/d1-output.txt

DB_ID=$(grep -oP 'database_id = "\K[^"]+' /tmp/d1-output.txt)

if [ -z "$DB_ID" ]; then
    echo "❌ Failed to extract database ID"
    exit 1
fi

echo "✅ Database created with ID: $DB_ID"

if [ -f "wrangler.toml" ]; then
    sed -i "s/database_id = \".*\"/database_id = \"$DB_ID\"/" wrangler.toml
    echo "✅ Updated wrangler.toml with database ID"
fi

echo "📐 Applying schema..."
wrangler d1 execute "$DB_NAME" --file=schema.sql

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Database ID: $DB_ID"
echo "Database Name: $DB_NAME"
echo ""
echo "Next steps:"
echo "1. Add to wrangler.toml: [[d1_databases]]"
echo "   binding = \"DB\""
echo "   database_name = \"$DB_NAME\""
echo "   database_id = \"$DB_ID\""
echo "2. Test with: wrangler d1 execute $DB_NAME --command 'SELECT * FROM bookmarks'"
