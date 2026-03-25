#!/bin/bash
set -e
cd "$(dirname "$0")"

# Create package.json with valid name
cat > package.json << 'EOF'
{
  "name": "ai-tag",
  "private": true,
  "type": "module"
}
EOF

npm install playwright
npx playwright install chromium
echo "Done! Run: source .env && node check.mjs"
