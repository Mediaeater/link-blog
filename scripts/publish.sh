#!/bin/bash

# Get current date in newspaper style format
DATE=$(date +'%B %d, %Y')

# Force add the links.json file
git add -f public/data/links.json

# Commit changes
git commit -m "Mediaeater Digest - $DATE"

# Push to GitHub
git push origin main

echo "Published Mediaeater Digest for $DATE"