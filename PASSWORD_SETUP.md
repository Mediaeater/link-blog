# Password Setup Guide

## For Your Personal Use

### Initial Setup
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and replace the default password with your secure password:
   ```
   VITE_ADMIN_PASSWORD=YourSecurePasswordHere
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### Important Security Notes
- **Never commit the `.env` file** - It's already in `.gitignore`
- Choose a strong, unique password
- The `.env` file stays on your local machine only

## For Deployment (Vercel, Netlify, etc.)

### Vercel
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add: `VITE_ADMIN_PASSWORD` with your secure password
4. Redeploy your application

### Netlify
1. Go to Site settings → Environment variables
2. Add: `VITE_ADMIN_PASSWORD` with your secure password
3. Trigger a new deploy

### Other Hosting Providers
Most hosting providers have a section for environment variables in their dashboard. Add:
- Key: `VITE_ADMIN_PASSWORD`
- Value: Your secure password

## For Public Demo Users

The repository includes a default demo password (`YourNewPassword`) that works out of the box. This allows anyone to:
- Clone the repository
- Run `npm install && npm run dev`
- Test the editing features immediately

## How It Works

The application checks for passwords in this order:
1. First, it looks for the `VITE_ADMIN_PASSWORD` environment variable
2. If not found, it falls back to the demo password `YourNewPassword`

This means:
- **Your deployment** uses your secure password from environment variables
- **Public users** can still test with the demo password
- **Your password is never exposed** in the code repository

## Troubleshooting

### Password not working after setup
1. Make sure you've restarted your dev server after creating `.env`
2. Check that `.env` is in the root directory (same level as `package.json`)
3. Verify the variable name is exactly `VITE_ADMIN_PASSWORD`

### Can't find where to set environment variables
- Local development: Use `.env` file
- Production: Check your hosting provider's documentation for "environment variables" or "env vars"

### Want to change your password
1. Update the value in your `.env` file (local)
2. Update the environment variable in your hosting provider (production)
3. No code changes needed!