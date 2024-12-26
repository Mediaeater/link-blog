#!/bin/bash

# Get current date in newspaper style format
DATE=$(date +'%B %d, %Y')

# Add and commit changes
git add public/data/links.json
git commit -m "Mediaeater Digest - $DATE"

# Push to GitHub
git push origin main

echo "Published Mediaeater Digest for $DATE"