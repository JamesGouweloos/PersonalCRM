const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// Load .env from project root (one level up from server directory)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('./database');
const tokenRefreshService = require('./services/token-refresh');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check (available immediately)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CRM API is running' });
});

// Initialize database first (this will run migrations)
db.initialize();

// Wait longer for database initialization and migrations to complete, then load routes
// SQLite CREATE TABLE operations are async, so we need to wait for them
setTimeout(() => {
  try {
    console.log('Loading API routes...');
    
    const emailRoutes = require('./routes/emails');
    const pipelineRoutes = require('./routes/pipeline');
    const contactsRoutes = require('./routes/contacts');
    const communicationsRoutes = require('./routes/communications');
    const leadsRoutes = require('./routes/leads');
    const followupsRoutes = require('./routes/followups');
    const templatesRoutes = require('./routes/templates');
    const activitiesRoutes = require('./routes/activities');
    const socialMediaRoutes = require('./routes/social-media');
    const whatsappRoutes = require('./routes/whatsapp');
    const commissionRoutes = require('./routes/commission');
    const auditTrailRoutes = require('./routes/audit-trail');
    const disputesRoutes = require('./routes/disputes');
    const callLogsRoutes = require('./routes/call-logs');
    const callLogsUploadRoutes = require('./routes/call-logs-upload');
    const emailRulesRoutes = require('./routes/email-rules');
    const agencyInteractionsRoutes = require('./routes/agency-interactions');
    const calendarRoutes = require('./routes/calendar');

    // API Routes
    app.use('/api/emails', emailRoutes);
    app.use('/api/email-rules', emailRulesRoutes);
    app.use('/api/pipeline', pipelineRoutes);
    app.use('/api/contacts', contactsRoutes);
    app.use('/api/communications', communicationsRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use('/api/followups', followupsRoutes);
    app.use('/api/templates', templatesRoutes);
    app.use('/api/activities', activitiesRoutes);
    app.use('/api/social-media', socialMediaRoutes);
    app.use('/api/whatsapp', whatsappRoutes);
    app.use('/api/commission', commissionRoutes);
    app.use('/api/audit-trail', auditTrailRoutes);
    app.use('/api/disputes', disputesRoutes);
    app.use('/api/call-logs', callLogsRoutes);
    app.use('/api/call-logs-upload', callLogsUploadRoutes);
    app.use('/api/agency-interactions', agencyInteractionsRoutes);
    app.use('/api/calendar', calendarRoutes);
    
    console.log('✓ All API routes loaded successfully');
    console.log('  - /api/emails (auth-url, status, sync, etc.)');
    console.log('  - /api/contacts');
    console.log('  - /api/email-rules');
    console.log('  - ... and other routes');
    
    // Start automatic token refresh service
    tokenRefreshService.startTokenRefreshService();
    
    // Add a catch-all for API routes that aren't found (after routes are loaded)
    app.use('/api/*', (req, res) => {
      console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        error: 'Route not found', 
        path: req.originalUrl,
        method: req.method,
        message: 'The requested API endpoint does not exist.'
      });
    });
  } catch (error) {
    console.error('✗ Error loading routes:', error);
    console.error(error.stack);
    // Don't exit - server can still serve health check
  }
}, 3000);

// Serve static files from Next.js app in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const nextBuildPath = path.join(__dirname, '../client/.next');
  const standalonePath = path.join(nextBuildPath, 'standalone');
  const staticPath = path.join(nextBuildPath, 'static');
  
  // Check if Next.js standalone build exists (recommended for production)
  if (fs.existsSync(standalonePath)) {
    // Next.js standalone mode - serve static assets
    const standaloneClientPath = path.join(standalonePath, 'client');
    if (fs.existsSync(standaloneClientPath)) {
      // Serve static files from standalone/client
      app.use(express.static(standaloneClientPath));
      
      // Serve static assets from .next/static
      if (fs.existsSync(staticPath)) {
        app.use('/_next/static', express.static(staticPath));
      }
      
      // Catch-all handler: send back Next.js's index.html file for client-side routing
      app.get('*', (req, res) => {
        // Don't handle API routes
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        
        const indexPath = path.join(standaloneClientPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Next.js app not found. Please ensure the build completed successfully.');
        }
      });
    } else {
      console.warn('Next.js standalone client path not found:', standaloneClientPath);
    }
  } else {
    console.warn('Next.js standalone build not found. Falling back to static assets only.');
    // Fallback: serve static assets from .next
    if (fs.existsSync(staticPath)) {
      app.use('/_next/static', express.static(staticPath));
    }
    
    // Fallback catch-all
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.status(404).send('Next.js app not built. Please run: npm run build');
    });
  }
}

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`CRM Server running on http://${HOST}:${PORT}`);
  console.log(`API available at http://${HOST}:${PORT}/api`);
  
  // Display network interfaces for remote access
  if (HOST === '0.0.0.0') {
    console.log('\n✓ Server is accessible from network interfaces:');
    const os = require('os');
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach((name) => {
      interfaces[name].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`  - http://${iface.address}:${PORT}`);
        }
      });
    });
    console.log(`\n⚠️  For internet access, configure port forwarding and use HTTPS`);
  }
});
