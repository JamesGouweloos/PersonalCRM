# Azure Permissions Setup for Email Reply Functionality

## Required Permissions

To enable email reply functionality in the CRM, you need to add the **Mail.Send** permission to your Azure App Registration.

## Current Permissions

The application currently requests:
- `Mail.Read` - Read user's mail
- `User.Read` - Read user profile
- `offline_access` - Refresh tokens that don't expire

## Additional Permission Required

- `Mail.Send` - Send mail as the user

## Setup Instructions

### Step 1: Add Mail.Send Permission in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find and select your app registration (the one with your `OUTLOOK_CLIENT_ID`)
4. Click on **API permissions** in the left sidebar
5. Click **+ Add a permission**
6. Select **Microsoft Graph**
7. Select **Delegated permissions**
8. Search for and select:
   - ✅ **Mail.Send** - Send mail as the user
9. Click **Add permissions**

### Step 2: Grant Admin Consent (if required)

1. In the **API permissions** page, click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Wait for the confirmation message

### Step 3: Reconnect Outlook Account

**IMPORTANT:** After adding the new permission, users must reconnect their Outlook account:

1. Go to the Email Sync page in the CRM
2. Click **Disconnect** (if already connected)
3. Click **Connect Outlook** again
4. Complete the OAuth flow - you should see a consent screen asking for permission to "Send mail as you"
5. Click **Accept**

### Step 4: Verify Permissions

After reconnecting, the application will request:
- ✅ Read your mail
- ✅ Send mail as you
- ✅ Sign you in and read your profile
- ✅ Maintain access to data you have given it access to

## Permission Types Explained

### Delegated Permissions (Current Setup)
- **Mail.Read** - Allows the app to read mail in the user's mailbox
- **Mail.Send** - Allows the app to send mail as the signed-in user
- **User.Read** - Allows the app to read the user's profile
- **offline_access** - Allows the app to refresh tokens without user interaction

### Why Delegated Permissions?
- The app acts on behalf of the signed-in user
- More secure - only sends emails as the authenticated user
- No need for admin consent in most cases (unless your organization requires it)

## Troubleshooting

### Error: "Access is denied" or "Permission denied"
- **Solution:** Ensure `Mail.Send` permission is added and admin consent is granted
- Reconnect your Outlook account after adding the permission

### Error: "InvalidAuthenticationToken"
- **Solution:** Reconnect your Outlook account to get a new token with the updated permissions

### Error: "AADSTS65005" - The application needs access to a service
- **Solution:** Admin consent is required. Contact your Azure AD administrator to grant consent.

## Security Notes

- The `Mail.Send` permission allows the application to send emails on behalf of the user
- Emails are sent from the user's own email address
- The application cannot access emails or send emails without user authentication
- Users can revoke access at any time through their Microsoft account settings

## Testing

After setup:
1. Open an email in the inbox
2. Click the **Reply** button
3. Compose and send a reply
4. Verify the email appears in your Sent folder in Outlook
5. Verify the reply appears in the conversation thread






