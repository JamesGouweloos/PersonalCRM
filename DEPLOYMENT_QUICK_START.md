# Quick Start: Deploy to Internet

## Fastest Option: Railway (5 minutes)

1. **Push code to GitHub** (if not already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **Go to [railway.app](https://railway.app)** and sign up

3. **Click "New Project" → "Deploy from GitHub repo"**

4. **Select your repository**

5. **Add environment variables** in Railway dashboard:
   ```
   PORT=3001
   HOST=0.0.0.0
   NODE_ENV=production
   OUTLOOK_CLIENT_ID=your_client_id
   OUTLOOK_CLIENT_SECRET=your_client_secret
   OUTLOOK_REDIRECT_URI=https://your-app.railway.app/api/emails/auth/callback
   NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
   ```

6. **Railway will automatically:**
   - Detect Node.js
   - Install dependencies
   - Build the app
   - Deploy with HTTPS

7. **Update Azure Redirect URI:**
   - Go to Azure Portal → App Registrations → Your App
   - Add redirect URI: `https://your-app.railway.app/api/emails/auth/callback`

8. **Access your app:** `https://your-app.railway.app`

## Alternative: Render (Similar process)

1. Go to [render.com](https://render.com)
2. Create Web Service
3. Connect GitHub repo
4. Set build command: `npm run build`
5. Set start command: `node server/index.js`
6. Add environment variables
7. Deploy

## What Changed?

- ✅ Server now listens on `0.0.0.0` (all network interfaces)
- ✅ Server displays available IP addresses on startup
- ✅ Ready for cloud deployment

## Next Steps

See `INTERNET_DEPLOYMENT.md` for:
- VPS deployment
- Home network setup
- Security recommendations
- Troubleshooting

