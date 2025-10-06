#!/bin/bash

# Get current date
DATE=$(date +'%B %d, %Y')

# Add all changed files
git add data/links.json public/data/links.json

# Commit changes
git commit -m "Mediaeater Digest - $DATE"

# Push to GitHub
git push origin main

echo "Published Mediaeater Digest for $DATE"