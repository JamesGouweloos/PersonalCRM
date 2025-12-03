# Azure App Registration Setup Guide

This guide will walk you through creating an Azure App Registration to enable Microsoft Outlook email integration in your CRM.

## Step-by-Step Instructions

### 1. Access Azure Portal

1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Microsoft account (the same account you use for Outlook)

### 2. Navigate to App Registrations

1. In the Azure Portal search bar at the top, type "Azure Active Directory" or "Microsoft Entra ID"
2. Click on **Azure Active Directory** (or **Microsoft Entra ID**)
3. In the left sidebar, click on **App registrations**
4. Click the **+ New registration** button at the top

### 3. Register Your Application

Fill in the registration form:

- **Name**: Enter a name for your app (e.g., "Custom CRM" or "My CRM App")
- **Supported account types**: 
  - Select **Accounts in this organizational directory only** if you only want to use your work/school account
  - Select **Accounts in any organizational directory and personal Microsoft accounts** if you want to use personal Outlook accounts too
- **Redirect URI**: 
  - Platform: Select **Web**
  - URI: Enter `http://localhost:3001/api/emails/callback`
  
Click **Register**

### 4. Save Your Application Credentials

After registration, you'll be on the **Overview** page. Save these values:

- **Application (client) ID**: Copy this value - you'll need it for `OUTLOOK_CLIENT_ID`
- **Directory (tenant) ID**: Copy this value - you'll need it for `OUTLOOK_TENANT_ID`

### 5. Create a Client Secret

1. In the left sidebar, click on **Certificates & secrets**
2. Under **Client secrets**, click **+ New client secret**
3. Enter a description (e.g., "CRM App Secret")
4. Choose an expiration period (recommended: 24 months for development)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** immediately - you won't be able to see it again!
   - This is your `OUTLOOK_CLIENT_SECRET`

### 6. Configure API Permissions

1. In the left sidebar, click on **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Search for and add these permissions:
   - `Mail.Read` - Read user mail
   - `User.Read` - Sign in and read user profile
6. Click **Add permissions**
7. **Important**: Click **Grant admin consent for [Your Organization]** if you see this button
   - This approves the permissions for your organization

### 7. Update Your .env File

Create a `.env` file in the root of your CRM project with the following:

```env
PORT=3001
OUTLOOK_CLIENT_ID=paste-your-application-client-id-here
OUTLOOK_CLIENT_SECRET=paste-your-client-secret-value-here
OUTLOOK_TENANT_ID=paste-your-directory-tenant-id-here
OUTLOOK_REDIRECT_URI=http://localhost:3001/api/emails/callback
```

Replace the placeholder values with the actual values you copied:
- `OUTLOOK_CLIENT_ID` = Application (client) ID from Step 4
- `OUTLOOK_CLIENT_SECRET` = Client secret Value from Step 5
- `OUTLOOK_TENANT_ID` = Directory (tenant) ID from Step 4

### 8. Verify Setup

1. Restart your CRM server if it's running
2. Navigate to the Email Sync page in your CRM
3. Click "Authorize Outlook Access"
4. You should be redirected to Microsoft login
5. After logging in and granting permissions, you'll be redirected back with an access token

## Troubleshooting

### Common Issues

**"Invalid client" error:**
- Double-check that your `OUTLOOK_CLIENT_ID` matches the Application (client) ID exactly

**"Invalid client secret" error:**
- Make sure you copied the secret **Value**, not the Secret ID
- If the secret expired, create a new one and update your `.env` file

**"Redirect URI mismatch" error:**
- Ensure the redirect URI in Azure matches exactly: `http://localhost:3001/api/emails/callback`
- Check for trailing slashes or typos

**"Insufficient privileges" error:**
- Make sure you granted admin consent for the API permissions
- Verify that `Mail.Read` and `User.Read` permissions are added

**"AADSTS50011: The redirect URI" error:**
- The redirect URI in your `.env` file must exactly match the one configured in Azure
- Check both the protocol (http vs https) and port number

## Security Notes

- Never commit your `.env` file to version control
- Client secrets expire - set a reminder to renew them before expiration
- For production use, consider using certificate-based authentication instead of client secrets
- Use environment-specific configurations for development vs production

## Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

