# Quick Start Guide

Get your link blog running in under 5 minutes.

## Prerequisites

- Node.js 16+ installed
- Git installed
- A GitHub account (for deployment)

## Installation

```bash
# Clone the repository
git clone https://github.com/Mediaeater/link-blog.git
cd link-blog

# Run automated setup
npm run setup

# Start development server
npm run dev:save
```

## Access the Application

Open your browser to: **http://localhost:5174**

## Enable Admin Mode

Add your password to the URL:
```
http://localhost:5174?admin=YourPassword
```

The default password is set in `.env` as `VITE_ADMIN_PASSWORD`.

## What's Running?

When you run `npm run dev:save`, two servers start:
- **Vite dev server** on port 5174 (frontend)
- **Express API server** on port 3001 (backend for saving links)

## Next Steps

- Add your first link using the admin panel
- Explore the [Development Guide](development.md) for more details
- Check out [Features](../features/feeds.md) to learn about RSS, JSON Feed, and more

## Troubleshooting

**Port already in use?**
- Kill processes on ports 3001 and 5174
- Or change ports in `vite.config.js` and `server.cjs`

**Changes not saving?**
- Check that both servers are running (`npm run dev:save`)
- Look for errors in the terminal

**Need help?**
- Check [Development Guide](development.md)
- Review [Troubleshooting](../reference/architecture.md#troubleshooting)
