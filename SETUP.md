# Setup Guide for Link Blog

## Quick Start (New Machine/Location)

```bash
# 1. Clone the repository
git clone https://github.com/Mediaeater/link-blog
cd link-blog

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your admin password

# 4. Start development servers
npm run dev         # Frontend on port 5173/5174
node server.cjs     # Backend on port 3001
```

## Files Not in Repository (Gitignored)

These files are excluded from version control but may be needed for development:

### Essential Files to Recreate

| File | Purpose | How to Create |
|------|---------|---------------|
| `.env` | Admin password & config | Copy from `.env.example` and edit |
| `node_modules/` | Dependencies | Run `npm install` |
| `test-*.html` | Test bookmark files | Create as needed or use script below |
| `dist/` | Build output | Run `npm run build` |

### Environment Variables (.env)

```bash
# Create from template
cp .env.example .env

# Edit with your preferred editor
nano .env
# or
code .env

# Add your admin password
VITE_ADMIN_PASSWORD=your-secure-password-here
```

## Portable Development Setup

### Option 1: Setup Script (Recommended)

Create this script in the repo root as `setup-local.sh`:

```bash
#!/bin/bash
# setup-local.sh - Initialize local development environment

echo "🚀 Setting up Link Blog development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env - Please update VITE_ADMIN_PASSWORD"
else
    echo "✅ .env already exists"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Create test bookmark file
if [ ! -f test-bookmarks.html ]; then
    echo "Creating test bookmark file..."
    cat > test-bookmarks.html << 'EOF'
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Test Bookmarks</H1>
<DL><p>
    <DT><H3>Development</H3>
    <DL><p>
        <DT><A HREF="https://github.com">GitHub</A>
        <DT><A HREF="https://stackoverflow.com">Stack Overflow</A>
    </DL><p>
    <DT><H3>Documentation</H3>
    <DL><p>
        <DT><A HREF="https://developer.mozilla.org">MDN Web Docs</A>
        <DT><A HREF="https://nodejs.org/docs">Node.js Docs</A>
    </DL><p>
</DL><p>
EOF
    echo "✅ Test bookmark file created"
else
    echo "✅ Test bookmark file already exists"
fi

echo ""
echo "📋 Next steps:"
echo "1. Edit .env and set your VITE_ADMIN_PASSWORD"
echo "2. Run 'npm run dev' to start frontend"
echo "3. Run 'node server.cjs' to start backend"
echo "4. Access at http://localhost:5173/?admin=YourPassword"
echo ""
echo "✨ Setup complete!"
```

Then run:
```bash
chmod +x setup-local.sh
./setup-local.sh
```

### Option 2: Cloud Sync for Private Files

Store sensitive/local files in cloud storage and symlink:

```bash
# Example with Dropbox
mkdir -p ~/Dropbox/link-blog-private

# Move sensitive files to cloud
mv .env ~/Dropbox/link-blog-private/
mv test-bookmarks.html ~/Dropbox/link-blog-private/

# Create symlinks
ln -s ~/Dropbox/link-blog-private/.env .env
ln -s ~/Dropbox/link-blog-private/test-bookmarks.html test-bookmarks.html
```

### Option 3: Git Submodule for Private Config

Create a private repo for sensitive configs:

```bash
# Create private config repo
git init link-blog-private
cd link-blog-private
# Add .env and other private files
git add .
git commit -m "Private configuration"
git remote add origin https://github.com/yourusername/link-blog-private
git push -u origin main

# In main project, add as submodule
cd link-blog
git submodule add https://github.com/yourusername/link-blog-private private
ln -s private/.env .env
```

## Working Across Multiple Machines

### First Time Setup
```bash
git clone https://github.com/Mediaeater/link-blog
cd link-blog
npm install
cp .env.example .env
# Edit .env with your password
```

### Sync Changes
```bash
# Before starting work
git pull

# After making changes
git add .
git commit -m "Your changes"
git push
```

### Keep Private Files Synchronized

**Method 1: Manual Copy**
- Keep `.env` in secure location (password manager, encrypted drive)
- Copy when setting up new location

**Method 2: Encrypted Backup**
```bash
# Encrypt .env
openssl enc -aes-256-cbc -salt -in .env -out .env.enc

# Decrypt .env
openssl enc -aes-256-cbc -d -in .env.enc -out .env
```

**Method 3: Environment-Specific Configs**
```bash
# .env.home (home computer)
# .env.work (work computer)
# .env.laptop (laptop)

# Use specific config
cp .env.laptop .env
```

## Checklist for New Development Location

- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Create `.env` from `.env.example`
- [ ] Set `VITE_ADMIN_PASSWORD` in `.env`
- [ ] Create test bookmark file (optional)
- [ ] Verify Node.js version (18+ required)
- [ ] Test with `npm run dev`
- [ ] Verify backend with `node server.cjs`

## Common Issues & Solutions

### Issue: Admin mode not working
**Solution:** Check `.env` file exists and contains correct password

### Issue: Import bookmarks button missing
**Solution:** Ensure you're accessing with `?admin=YourPassword` in URL

### Issue: Changes not saving
**Solution:** Make sure backend server (`node server.cjs`) is running

### Issue: Port already in use
**Solution:** Use different ports:
```bash
PORT=3002 node server.cjs        # Backend on 3002
npx vite --port 5555             # Frontend on 5555
```

## Security Notes

⚠️ **Never commit these files:**
- `.env` (contains passwords)
- Any file with credentials
- Personal bookmark exports
- Test files with private data

✅ **Safe to commit:**
- `.env.example` (template only)
- Source code
- Documentation
- Public test files

## Quick Commands Reference

```bash
# Development
npm run dev              # Start frontend dev server
node server.cjs          # Start backend server
npm run build           # Build for production

# Git Operations
git status              # Check changes
git pull                # Get latest changes
git push                # Push changes

# Testing
npm run lint            # Check code style
npm run preview         # Preview production build
```

## Support

- **Repository:** https://github.com/Mediaeater/link-blog
- **Issues:** https://github.com/Mediaeater/link-blog/issues
- **Documentation:** See README.md for feature documentation