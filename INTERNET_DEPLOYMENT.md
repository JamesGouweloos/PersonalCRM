# Internet Deployment Guide

This guide explains how to make your CRM application accessible through the internet.

## ⚠️ Security Warning

**Before deploying to the internet, ensure you:**
- Set up HTTPS/SSL certificates
- Implement authentication/authorization
- Use a reverse proxy (nginx, Apache)
- Configure firewall rules properly
- Keep dependencies updated
- Use environment variables for secrets (never commit `.env` files)

## Deployment Options

### Option 1: Cloud Hosting (Recommended)

#### A. Railway (Easiest)

1. **Sign up** at [railway.app](https://railway.app)
2. **Create new project** → "Deploy from GitHub repo"
3. **Add environment variables:**
   ```
   PORT=3001
   HOST=0.0.0.0
   NODE_ENV=production
   OUTLOOK_CLIENT_ID=your_client_id
   OUTLOOK_CLIENT_SECRET=your_client_secret
   OUTLOOK_REDIRECT_URI=https://your-app.railway.app/api/emails/auth/callback
   NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
   ```
4. **Railway automatically:**
   - Builds your app
   - Provides HTTPS
   - Assigns a domain
   - Handles deployments

#### B. Render

1. **Sign up** at [render.com](https://render.com)
2. **Create Web Service** → Connect GitHub repo
3. **Configure:**
   - Build Command: `npm run build`
   - Start Command: `node server/index.js`
   - Environment: Node
4. **Add environment variables** (same as Railway)
5. **Render provides HTTPS** automatically

#### C. Heroku

1. **Install Heroku CLI**
2. **Login:** `heroku login`
3. **Create app:** `heroku create your-crm-app`
4. **Set environment variables:**
   ```bash
   heroku config:set PORT=3001
   heroku config:set HOST=0.0.0.0
   heroku config:set NODE_ENV=production
   heroku config:set OUTLOOK_CLIENT_ID=your_client_id
   heroku config:set OUTLOOK_CLIENT_SECRET=your_client_secret
   heroku config:set OUTLOOK_REDIRECT_URI=https://your-crm-app.herokuapp.com/api/emails/auth/callback
   heroku config:set NEXT_PUBLIC_API_URL=https://your-crm-app.herokuapp.com/api
   ```
5. **Deploy:** `git push heroku main`

#### D. DigitalOcean App Platform

1. **Sign up** at [digitalocean.com](https://www.digitalocean.com)
2. **Create App** → Connect GitHub
3. **Configure build settings** and environment variables
4. **Deploy**

### Option 2: VPS (Virtual Private Server)

#### Setup on VPS (Ubuntu/Debian)

1. **SSH into your VPS:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone your repository:**
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

5. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

6. **Build the client:**
   ```bash
   npm run build
   ```

7. **Create `.env` file:**
   ```bash
   nano .env
   ```
   ```
   PORT=3001
   HOST=0.0.0.0
   NODE_ENV=production
   OUTLOOK_CLIENT_ID=your_client_id
   OUTLOOK_CLIENT_SECRET=your_client_secret
   OUTLOOK_REDIRECT_URI=https://yourdomain.com/api/emails/auth/callback
   ```

8. **Create `client/.env.local`:**
   ```bash
   nano client/.env.local
   ```
   ```
   NEXT_PUBLIC_API_URL=https://yourdomain.com/api
   ```

9. **Start with PM2:**
   ```bash
   pm2 start server/index.js --name crm-server
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

10. **Install and configure Nginx (Reverse Proxy):**
    ```bash
    sudo apt-get install nginx
    sudo nano /etc/nginx/sites-available/crm
    ```

    **Nginx configuration:**
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

11. **Enable site:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

12. **Install SSL Certificate (Let's Encrypt):**
    ```bash
    sudo apt-get install certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```

13. **Configure firewall:**
    ```bash
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    sudo ufw enable
    ```

### Option 3: Home Network with Port Forwarding

⚠️ **Not recommended for production** - Use only for testing or with VPN.

1. **Get your public IP:**
   ```bash
   curl ifconfig.me
   ```

2. **Configure router port forwarding:**
   - Login to router admin panel (usually `192.168.1.1`)
   - Navigate to Port Forwarding/Virtual Server
   - Forward external port 80/443 → internal IP:3001
   - Forward external port 3001 → internal IP:3001 (for API)

3. **Set up Dynamic DNS (if IP changes):**
   - Use services like [No-IP](https://www.noip.com) or [DuckDNS](https://www.duckdns.org)
   - Update DNS records to point to your public IP

4. **Update Azure Redirect URI:**
   - Go to Azure Portal → App Registrations
   - Add: `http://your-public-ip:3001/api/emails/auth/callback`
   - Or use your domain: `https://yourdomain.com/api/emails/auth/callback`

5. **Update environment variables:**
   ```
   OUTLOOK_REDIRECT_URI=http://your-public-ip:3001/api/emails/auth/callback
   NEXT_PUBLIC_API_URL=http://your-public-ip:3001/api
   ```

## Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# Azure/Outlook OAuth
OUTLOOK_CLIENT_ID=your_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret
OUTLOOK_REDIRECT_URI=https://yourdomain.com/api/emails/auth/callback
OUTLOOK_TENANT_ID=common

# Database (SQLite - file path)
DB_PATH=./data/crm.db
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

## Azure App Registration Updates

1. **Go to Azure Portal** → App Registrations → Your App
2. **Update Redirect URIs:**
   - Add: `https://yourdomain.com/api/emails/auth/callback`
   - Remove localhost URIs (or keep for local development)
3. **Update API Permissions** (if needed)
4. **Note:** Some permissions may require admin consent

## Production Checklist

- [ ] HTTPS/SSL certificate installed
- [ ] Environment variables configured
- [ ] Azure redirect URIs updated
- [ ] Firewall configured (only allow 80, 443, 22)
- [ ] Database backups configured
- [ ] Process manager (PM2) configured for auto-restart
- [ ] Monitoring/logging set up
- [ ] Domain name configured (DNS records)
- [ ] CORS configured correctly (if needed)
- [ ] Rate limiting configured (recommended)
- [ ] Authentication implemented (if needed)

## Testing Internet Access

1. **From a different network** (e.g., mobile data):
   - Navigate to `https://yourdomain.com`
   - Test API: `https://yourdomain.com/api/health`
   - Should return: `{"status":"ok","message":"CRM API is running"}`

2. **Test OAuth flow:**
   - Click "Connect Outlook" in the app
   - Should redirect to Microsoft login
   - After login, should redirect back to your domain

## Troubleshooting

### Cannot access from internet

1. **Check firewall:** Ensure ports are open
2. **Check router:** Port forwarding configured correctly
3. **Check DNS:** Domain points to correct IP
4. **Check server logs:** Look for errors
5. **Test locally first:** Ensure app works on `localhost`

### OAuth redirect fails

1. **Check redirect URI** matches Azure configuration exactly
2. **Check HTTPS:** OAuth requires HTTPS in production
3. **Check CORS:** Ensure CORS allows your domain

### API calls fail

1. **Check `NEXT_PUBLIC_API_URL`** matches your domain
2. **Check CORS** configuration on server
3. **Check network tab** in browser DevTools for errors

## Security Recommendations

1. **Use HTTPS:** Never use HTTP for production
2. **Implement Authentication:** Add login system
3. **Use Environment Variables:** Never commit secrets
4. **Regular Updates:** Keep dependencies updated
5. **Backup Database:** Regular backups of SQLite database
6. **Rate Limiting:** Prevent abuse
7. **Input Validation:** Validate all user inputs
8. **SQL Injection Prevention:** Use parameterized queries (already implemented)

## Monitoring

Consider setting up:
- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry, Rollbar
- **Logging:** Winston, Morgan
- **Performance:** New Relic, Datadog

## Support

For issues specific to:
- **Railway:** [docs.railway.app](https://docs.railway.app)
- **Render:** [render.com/docs](https://render.com/docs)
- **Heroku:** [devcenter.heroku.com](https://devcenter.heroku.com)
- **DigitalOcean:** [docs.digitalocean.com](https://docs.digitalocean.com)

