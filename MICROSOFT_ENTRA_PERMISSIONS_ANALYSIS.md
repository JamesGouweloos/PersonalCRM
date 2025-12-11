# Microsoft Entra (Azure AD) Permissions Analysis

## Current Permissions Status

You currently have:
- ✅ **Mail.Read** (Delegated) - Read user mail
- ✅ **Mail.ReadWrite** (Delegated) - Read and write access to user mail
- ✅ **User.Read** (Delegated) - Sign in and read user profile

## Required Additional Permissions

### 1. **Mail.Send** (Delegated) - ⚠️ REQUIRED

**Status:** Currently missing, but code requests it

**Why needed:**
- The application implements email reply functionality (`/api/emails/send`)
- Code calls `/me/sendMail` endpoint in Microsoft Graph API
- Required to send emails and replies from within the CRM

**Current code location:**
- `server/services/outlook.js` lines 217-285 (`sendEmail` function)
- `server/routes/emails.js` lines 652-710 (`POST /api/emails/send`)

**Action required:**
1. Add `Mail.Send` permission in Azure Portal
2. Grant admin consent
3. Users must reconnect their Outlook account to get new token with this permission

---

### 2. **offline_access** (Delegated) - ⚠️ RECOMMENDED

**Status:** Code requests it, but not mentioned in your current permissions list

**Why needed:**
- Enables refresh tokens that don't expire
- Allows the app to maintain connection without user re-authentication
- Critical for background email sync and token refresh

**Current code location:**
- `server/services/outlook.js` lines 34-39, 54-59, 80-85

**Action required:**
- Verify this permission is granted (it's usually included by default)
- If missing, add `offline_access` permission

---

## Future Permissions (For Planned Features)

### 3. **Mail.ReadWrite** (Delegated) - ⚠️ FOR FUTURE USE

**Status:** You already have this, but it's not fully utilized yet

**Why needed (future):**
- The codebase has `assign_category` action in email rules (`server/services/email-rules.js` line 134-138)
- Currently, this action only logs the category assignment but doesn't actually update Outlook emails
- To fully implement category assignment, you'll need to PATCH `/me/messages/{id}` with categories
- `Mail.ReadWrite` includes the ability to update email properties (including categories)

**Current implementation:**
```javascript
case 'assign_category':
  // Note: This would require Mail.ReadWrite permission to actually assign
  // For now, we'll just log it and store in our database
  console.log(`[Email Rules] Would assign category: ${params.category}`);
  return { success: true, action: 'assign_category', category: params.category };
```

**Action required:**
- No action needed now (you already have `Mail.ReadWrite`)
- When implementing actual category assignment, ensure the code uses PATCH to update messages
- Test that category assignment works with your current permission

---

### 4. **Mail.ReadBasic** (Delegated) - ❌ NOT NEEDED

**Status:** Not required

**Why not needed:**
- `Mail.Read` (which you have) is more comprehensive
- `Mail.ReadBasic` is a subset of `Mail.Read`
- No benefit to adding this separately

---

### 5. **Calendars.Read** or **Calendars.ReadWrite** (Delegated) - 🔮 FUTURE CONSIDERATION

**Status:** Not currently implemented, but database schema suggests future use

**Why might be needed:**
- Database schema includes "meetings" as a communication type (`communications` table)
- No calendar integration code exists yet
- If you plan to sync Outlook calendar events or create meetings, you'll need:
  - `Calendars.Read` - Read user's calendars and events
  - `Calendars.ReadWrite` - Read and write calendars/events (if creating meetings)

**Current status:**
- No calendar-related API calls in codebase
- Database mentions "meetings" but no implementation

**Action required:**
- None at this time
- Add when implementing calendar features

---

### 6. **Files.Read** or **Files.ReadWrite** (Delegated) - 🔮 FUTURE CONSIDERATION

**Status:** Not currently implemented, but database schema suggests future use

**Why might be needed:**
- Database has `email_attachments` table (`server/database.js` lines 197-208)
- No code exists to fetch email attachments yet
- If you plan to download or display email attachments, you'll need:
  - `Files.Read` - Read files attached to emails
  - `Files.ReadWrite` - Read and write files (if modifying attachments)

**Current status:**
- Database schema ready for attachments
- No attachment fetching code exists
- `fetchEmails` function doesn't request attachment data

**Action required:**
- None at this time
- Add when implementing attachment features
- Note: Reading attachments from emails might be covered by `Mail.Read` - test first

---

### 7. **Contacts.Read** or **Contacts.ReadWrite** (Delegated) - 🔮 FUTURE CONSIDERATION

**Status:** Not currently implemented

**Why might be needed:**
- If you want to sync Outlook contacts with your CRM contacts
- Currently, contacts are created from email addresses, not synced from Outlook
- Would enable:
  - `Contacts.Read` - Read user's Outlook contacts
  - `Contacts.ReadWrite` - Sync contacts bidirectionally

**Current status:**
- No Outlook contacts integration
- Contacts are created from email senders automatically

**Action required:**
- None at this time
- Add if implementing Outlook contact sync

---

## Summary Table

| Permission | Status | Priority | Required For |
|------------|--------|----------|--------------|
| **Mail.Send** | ❌ Missing | 🔴 **CRITICAL** | Email reply functionality |
| **offline_access** | ⚠️ Verify | 🟡 **HIGH** | Refresh tokens, background sync |
| **Mail.ReadWrite** | ✅ Have | 🟢 Current | Category assignment (future) |
| **Mail.Read** | ✅ Have | 🟢 Current | Reading emails |
| **User.Read** | ✅ Have | 🟢 Current | User profile |
| **Calendars.Read** | 🔮 Future | ⚪ Optional | Calendar sync (if planned) |
| **Files.Read** | 🔮 Future | ⚪ Optional | Email attachments (if planned) |
| **Contacts.Read** | 🔮 Future | ⚪ Optional | Contact sync (if planned) |

---

## Immediate Action Items

### 1. Add Mail.Send Permission (REQUIRED)

**Steps:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Select your app registration
4. Click **API permissions** in the left sidebar
5. Click **+ Add a permission**
6. Select **Microsoft Graph**
7. Select **Delegated permissions**
8. Search for and select: **Mail.Send** - Send mail as the user
9. Click **Add permissions**
10. Click **Grant admin consent for [Your Organization]**
11. Click **Yes** to confirm

### 2. Verify offline_access Permission

**Steps:**
1. In the same **API permissions** page
2. Look for **offline_access** in the list
3. If missing, add it:
   - Click **+ Add a permission**
   - Select **Microsoft Graph**
   - Select **Delegated permissions**
   - Search for **offline_access**
   - Add and grant consent

### 3. Reconnect Outlook Account

**After adding Mail.Send:**
1. Users must disconnect and reconnect their Outlook account
2. The OAuth consent screen will show the new permission
3. Users must accept "Send mail as you" permission

---

## Testing Checklist

After adding permissions:

- [ ] Email reply functionality works (`POST /api/emails/send`)
- [ ] Refresh tokens work (no expiration issues)
- [ ] Background email sync continues working
- [ ] No permission errors in console
- [ ] OAuth consent screen shows all permissions

---

## Permission Scope Reference

### What Each Permission Allows:

**Mail.Read:**
- ✅ Read emails in mailbox
- ✅ Read email properties (subject, body, from, to, etc.)
- ✅ Read email categories (read-only)
- ✅ Read email flags
- ✅ Read folder structure
- ❌ Cannot send emails
- ❌ Cannot modify emails

**Mail.ReadWrite:**
- ✅ Everything in Mail.Read
- ✅ Update email properties (mark as read, move to folder)
- ✅ Modify email categories (assign/remove categories)
- ✅ Update email flags
- ❌ Cannot send emails (still need Mail.Send)

**Mail.Send:**
- ✅ Send new emails
- ✅ Send replies
- ✅ Send forwards
- ✅ Send emails on behalf of user
- ❌ Cannot read emails (need Mail.Read separately)
- ❌ Cannot modify emails

**offline_access:**
- ✅ Get refresh tokens
- ✅ Refresh access tokens without user interaction
- ✅ Maintain long-term connection

---

## Security Notes

1. **Delegated Permissions:** All permissions are delegated, meaning:
   - App acts on behalf of the signed-in user
   - More secure than application permissions
   - User can revoke access anytime

2. **Principle of Least Privilege:**
   - Only request permissions you actually use
   - Don't add future permissions until needed
   - Review permissions periodically

3. **Admin Consent:**
   - Some permissions may require admin consent
   - Check Azure Portal for consent requirements
   - Users may see consent screens on first use

---

## Code References

### Current Permission Requests:
- `server/services/outlook.js` lines 34-39 (getAuthUrl)
- `server/services/outlook.js` lines 54-59 (getAccessTokenFromCode)
- `server/services/outlook.js` lines 80-85 (refreshAccessToken)

### Features Using Permissions:
- **Mail.Read:** `fetchEmails()`, `fetchEmailCategories()`, `fetchEmailFolders()`, `fetchFlaggedEmails()`
- **Mail.Send:** `sendEmail()` function
- **User.Read:** `getUserProfile()` function
- **offline_access:** Token refresh functionality

---

## Questions?

If you encounter permission errors:
1. Check Azure Portal for granted permissions
2. Verify admin consent is granted
3. Ensure users reconnect after permission changes
4. Check application logs for specific error messages
5. Review Microsoft Graph API documentation for permission requirements

