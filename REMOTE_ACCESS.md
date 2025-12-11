# Remote Access Configuration Guide

This guide explains how to configure the CRM application for remote access from other devices on your network.

## Quick Setup

### 1. Server Configuration

The server is configured to listen on all network interfaces (`0.0.0.0`) by default, which allows remote connections.

**Environment Variables:**
- `PORT` - Server port (default: 3001)
- `HOST` - Host to bind to (default: 0.0.0.0 for all interfaces)

### 2. Client Configuration

The Next.js client needs to know the server's IP address to make API calls.

**Create `client/.env.local` file:**

```bash
# Replace <YOUR_IP> with your computer's IP address
NEXT_PUBLIC_API_URL=http://<YOUR_IP>:3001/api
```

**To find your IP address:**

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your active network adapter

# Or use the helper script:
.\get-ip.ps1
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
# Look for inet address (not 127.0.0.1)
```

### 3. Firewall Configuration

You need to allow incoming connections on port 3001.

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter port `3001`
6. Allow the connection
7. Apply to all profiles
8. Name it "CRM Server"

**Or via PowerShell (Run as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "CRM Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Mac:**
1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Add Node.js or allow incoming connections on port 3001

**Linux (ufw):**
```bash
sudo ufw allow 3001/tcp
```

## Troubleshooting

### Port Already in Use (EADDRINUSE)

If you see `Error: listen EADDRINUSE: address already in use 0.0.0.0:3001`:

**Windows PowerShell:**
```powershell
# Find and kill the process using port 3001
.\kill-port.ps1 -Port 3001

# Or manually:
# Find the process
netstat -ano | findstr :3001

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find the process
lsof -ti:3001

# Kill it
kill -9 $(lsof -ti:3001)
```

**Or change the port:**
```bash
# Set PORT environment variable
$env:PORT=3002  # PowerShell
export PORT=3002  # Bash

# Update client/.env.local
NEXT_PUBLIC_API_URL=http://<YOUR_IP>:3002/api
```

## Running the Application

### Development Mode

1. **Start the server:**
   ```bash
   npm run server
   ```
   The server will display available IP addresses in the console.

2. **Start the client:**
   ```bash
   npm run client
   ```
   Or manually:
   ```bash
   cd client
   pnpm dev
   ```

3. **Access from remote device:**
   - Open browser on remote device
   - Navigate to: `http://<YOUR_IP>:3000` (or the port Next.js is running on)
   - The client will automatically use the API URL from `NEXT_PUBLIC_API_URL`

### Production Mode

1. **Build the client:**
   ```bash
   npm run build
   ```

2. **Set environment variables:**
   ```bash
   export PORT=3001
   export HOST=0.0.0.0
   export NODE_ENV=production
   export NEXT_PUBLIC_API_URL=http://<YOUR_IP>:3001/api
   ```

3. **Start the server:**
   ```bash
   node server/index.js
   ```

4. **Access from remote device:**
   - Navigate to: `http://<YOUR_IP>:3001`

## Troubleshooting

### Cannot connect from remote device

1. **Check firewall:** Ensure port 3001 is open
2. **Check IP address:** Verify you're using the correct IP (not 127.0.0.1)
3. **Check server logs:** Server should show "Remote access" IPs in console
4. **Check network:** Ensure both devices are on the same network
5. **Check API URL:** Verify `NEXT_PUBLIC_API_URL` matches server IP

### API calls fail from remote device

1. **Verify CORS:** CORS is enabled by default, but check server logs for errors
2. **Check API URL:** Ensure `NEXT_PUBLIC_API_URL` in client is correct
3. **Check server is running:** Verify server is listening on 0.0.0.0, not just localhost

### Azure OAuth redirect issues

If using Azure AD authentication, you may need to update redirect URIs:

1. Go to Azure Portal → App Registrations → Your App
2. Add redirect URI: `http://<YOUR_IP>:3001/api/emails/auth/callback`
3. Update `AZURE_REDIRECT_URI` in `.env` file

## Security Considerations

⚠️ **Important:** This configuration allows access from any device on your network.

**For production use:**
- Use HTTPS (set up SSL/TLS certificate)
- Implement authentication/authorization
- Use a reverse proxy (nginx, Apache)
- Consider VPN for remote access
- Restrict access to specific IPs if needed

## Network Configuration Examples

### Same Local Network (LAN)
- Server IP: `192.168.1.100`
- Client on same network: `http://192.168.1.100:3001`

### VPN Access
- Server accessible via VPN IP
- Use VPN IP address in `NEXT_PUBLIC_API_URL`

### Internet Access (Not Recommended Without Security)
- Requires port forwarding on router
- Use public IP or domain name
- **Must use HTTPS** and proper security measures
