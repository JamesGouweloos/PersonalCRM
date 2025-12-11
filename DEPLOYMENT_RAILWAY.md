# Railway Deployment Guide

## Quick Fix Applied

The build script has been updated to use `npm` instead of `pnpm` for Railway compatibility.

## Railway Configuration

Railway will automatically:
1. Detect Node.js project
2. Run `npm install` in root
3. Run `npm run build` (which now uses npm)
4. Run `npm start` to start the server

## Environment Variables

Set these in Railway dashboard:

```
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
OUTLOOK_CLIENT_ID=your_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret
OUTLOOK_REDIRECT_URI=https://your-app.railway.app/api/emails/auth/callback
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
```

## Build Process

The build script now:
1. Installs root dependencies (`npm install`)
2. Installs client dependencies (`cd client && npm install`)
3. Builds Next.js app (`npm run build`)
4. Creates standalone Next.js output

## Important Notes

- Railway uses `npm` by default (not pnpm)
- The build script has been updated to use npm
- Next.js standalone mode is enabled for better deployment
- Make sure to set `NEXT_PUBLIC_API_URL` to your Railway URL

## Troubleshooting

If build still fails:
1. Check Railway logs for specific errors
2. Ensure all environment variables are set
3. Verify Node.js version (should be 18+)
4. Check that `package.json` scripts are correct

