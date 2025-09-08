#!/bin/bash

# Simple publish script for link-blog
echo "🚀 Publishing your links to GitHub Pages..."

# Step 1: Copy the exported JSON to the data directory
echo "📋 Step 1: Looking for your exported links file..."
LATEST_EXPORT=$(ls -t ~/Downloads/link-blog-export-*.json 2>/dev/null | head -1)

if [ -z "$LATEST_EXPORT" ]; then
    echo "❌ No exported file found in Downloads"
    echo "👉 Please export your links from the admin interface first"
    exit 1
fi

echo "✅ Found: $(basename "$LATEST_EXPORT")"
cp "$LATEST_EXPORT" public/data/links.json
echo "✅ Copied to public/data/links.json"

# Step 2: Commit the changes
echo ""
echo "📝 Step 2: Saving changes to git..."
git add public/data/links.json
git commit -m "Update links - $(date '+%Y-%m-%d %H:%M')" || echo "✅ No new changes to commit"

# Step 3: Build and deploy
echo ""
echo "🔨 Step 3: Building and deploying to GitHub Pages..."
npm run deploy

echo ""
echo "✨ Done! Your links will be live in 2-5 minutes at:"
echo "👉 https://mediaeater.github.io/link-blog/"