# Custom CRM Application

A custom CRM application for tracking sales pipelines and aggregating communications data from multiple sources.

## Features

- **Sales Pipeline Management**: Track leads, contacts, and opportunities
- **Outlook Email Integration**: Sync emails from Microsoft Outlook via OAuth 2.0
- **Follow-up Management**: Schedule and track follow-ups
- **Email Templates**: Create and manage email templates
- **Activity Tracking**: Monitor all CRM activities
- **Social Media Integration**: (Planned) Facebook, Instagram, LinkedIn
- **WhatsApp Integration**: (Planned)

## Project Structure

```
CRM/
├── server/          # Express backend API
├── client/          # Next.js frontend
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Azure App Registration for Outlook integration (see `AZURE_SETUP.md`)

## Setup

### 1. Backend Setup

```bash
# Install backend dependencies
npm install

# Set up environment variables
# Create a .env file in the root directory with:
# OUTLOOK_CLIENT_ID=your_client_id
# OUTLOOK_CLIENT_SECRET=your_client_secret
# OUTLOOK_REDIRECT_URI=http://localhost:3001/api/emails/oauth/callback
```

### 2. Frontend Setup

```bash
# Navigate to client directory
cd client

# Install frontend dependencies (using pnpm if available, otherwise npm)
pnpm install
# or
npm install

# Set up environment variables (optional)
# Create a .env.local file with:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Running the Application

### Local Development

**Option 1: Run Both Servers Separately**

**Terminal 1 - Backend:**
```bash
npm run server
```
Backend will run on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd client
pnpm dev
# or
npm run dev
```
Frontend will run on http://localhost:3000

**Option 2: Run Both Servers Together (Windows PowerShell)**

```powershell
# Run backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run server"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Run frontend
cd client
pnpm dev
```

### Internet Deployment

**For quick deployment to the internet:**

See `DEPLOYMENT_QUICK_START.md` for the fastest way to deploy (Railway/Render).

**For detailed deployment options:**

See `INTERNET_DEPLOYMENT.md` for:
- Cloud hosting (Railway, Render, Heroku, DigitalOcean)
- VPS setup with Nginx and SSL
- Home network with port forwarding
- Security recommendations

**For local network access:**

See `REMOTE_ACCESS.md` for accessing the app from other devices on your local network.

## Azure Setup

See `AZURE_SETUP.md` for detailed instructions on setting up Azure App Registration for Outlook integration.

## API Endpoints

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create a contact
- `PUT /api/contacts/:id` - Update a contact
- `DELETE /api/contacts/:id` - Delete a contact

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create a lead
- `PUT /api/leads/:id` - Update a lead
- `DELETE /api/leads/:id` - Delete a lead

### Follow-ups
- `GET /api/followups` - Get all follow-ups
- `POST /api/followups` - Create a follow-up
- `PUT /api/followups/:id` - Update a follow-up
- `DELETE /api/followups/:id` - Delete a follow-up

### Templates
- `GET /api/templates` - Get all email templates
- `POST /api/templates` - Create a template
- `PUT /api/templates/:id` - Update a template
- `DELETE /api/templates/:id` - Delete a template

### Activities
- `GET /api/activities` - Get all activities
- `POST /api/activities` - Create an activity

### Emails
- `GET /api/emails/auth-url` - Get OAuth authorization URL
- `GET /api/emails/oauth/callback` - OAuth callback handler
- `GET /api/emails/status` - Get email connection status
- `POST /api/emails/sync` - Sync emails from Outlook
- `GET /api/emails` - Get synced emails
- `POST /api/emails/disconnect` - Disconnect Outlook account

## Database

The application uses SQLite for local data storage. The database file (`crm.db`) is created automatically in the `server` directory on first run.

## Development

The frontend is built with Next.js 16 and uses:
- TypeScript
- Tailwind CSS
- Radix UI components
- React Hook Form
- Zod for validation

The backend is built with:
- Express.js
- SQLite
- MSAL Node for OAuth

## Notes

- The frontend currently uses localStorage for data persistence (from the original v0 design)
- To integrate with the backend API, components should be updated to use `lib/store-api.ts` instead of `lib/store.ts`
- The backend API is ready and can be integrated gradually
