const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');

// Microsoft Graph API configuration
const CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || 'your-client-id';
const CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || 'your-client-secret';
const TENANT_ID = process.env.OUTLOOK_TENANT_ID || 'common';
const REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3001/api/emails/callback';

// Debug: Log configuration status (without exposing secrets)
if (CLIENT_ID === 'your-client-id' || CLIENT_SECRET === 'your-client-secret') {
  console.warn('[Outlook Service] WARNING: Using placeholder credentials. Please check your .env file.');
  console.warn('[Outlook Service] CLIENT_ID:', CLIENT_ID === 'your-client-id' ? 'NOT SET (using placeholder)' : 'SET');
  console.warn('[Outlook Service] CLIENT_SECRET:', CLIENT_SECRET === 'your-client-secret' ? 'NOT SET (using placeholder)' : 'SET');
  console.warn('[Outlook Service] TENANT_ID:', TENANT_ID);
} else {
  console.log('[Outlook Service] Configuration loaded successfully');
  console.log('[Outlook Service] CLIENT_ID:', CLIENT_ID.substring(0, 8) + '...');
  console.log('[Outlook Service] TENANT_ID:', TENANT_ID);
}

const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
  },
};

const pca = new ConfidentialClientApplication(msalConfig);

function getAuthUrl() {
  const authCodeUrlParameters = {
    scopes: [
      'https://graph.microsoft.com/Mail.Read', 
      'https://graph.microsoft.com/User.Read',
      'offline_access' // Required for refresh tokens that don't expire
    ],
    redirectUri: REDIRECT_URI,
  };

  return pca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    return response;
  }).catch((error) => {
    console.error('Error generating auth URL:', error);
    throw error;
  });
}

async function getAccessTokenFromCode(authCode) {
  const tokenRequest = {
    code: authCode,
    scopes: [
      'https://graph.microsoft.com/Mail.Read', 
      'https://graph.microsoft.com/User.Read',
      'offline_access' // Required for refresh tokens that don't expire
    ],
    redirectUri: REDIRECT_URI,
  };

  try {
    const response = await pca.acquireTokenByCode(tokenRequest);
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      account: response.account
    };
  } catch (error) {
    console.error('Error acquiring token:', error);
    throw error;
  }
}

async function refreshAccessToken(refreshToken) {
  const tokenRequest = {
    refreshToken: refreshToken,
    scopes: [
      'https://graph.microsoft.com/Mail.Read', 
      'https://graph.microsoft.com/User.Read',
      'offline_access' // Required for refresh tokens that don't expire
    ],
  };

  try {
    const response = await pca.acquireTokenByRefreshToken(tokenRequest);
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || refreshToken, // Use new refresh token if provided, otherwise keep existing
      expiresIn: response.expiresIn,
      account: response.account
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Provide clearer error messages
    if (error.errorCode === 'invalid_grant' || error.errorCode === 'interaction_required' ||
        (error.message && error.message.includes('Lifetime validation failed'))) {
      const enhancedError = new Error('Refresh token expired or invalid. Please reconnect your Outlook account.');
      enhancedError.errorCode = error.errorCode;
      throw enhancedError;
    }
    throw error;
  }
}

function getGraphClient(accessToken) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

async function fetchEmails(accessToken, maxResults = 50) {
  try {
    const client = getGraphClient(accessToken);
    
    const response = await client
      .api('/me/messages')
      .select('id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,sentDateTime,isRead,conversationId,categories,flag,parentFolderId')
      .top(maxResults)
      .orderby('receivedDateTime desc')
      .get();

    // Enhance emails with parsed flag and category data
    const emails = response.value || [];
    return emails.map(email => ({
      ...email,
      categories: email.categories || [],
      is_flagged: email.flag?.flagStatus === 'flagged' || false,
      flag_due_date: email.flag?.dueDateTime || null,
      folder_id: email.parentFolderId || null
    }));
  } catch (error) {
    console.error('Error fetching emails:', error);
    // Enhance error message for token expiration
    if (error.statusCode === 401 || error.code === 'InvalidAuthenticationToken' || 
        (error.message && error.message.includes('expired'))) {
      const enhancedError = new Error('Token expired or invalid. Please reconnect your Outlook account.');
      enhancedError.code = error.code || 'InvalidAuthenticationToken';
      enhancedError.statusCode = error.statusCode || 401;
      throw enhancedError;
    }
    throw error;
  }
}

async function fetchEmailCategories(emailId, accessToken) {
  try {
    const client = getGraphClient(accessToken);
    const message = await client
      .api(`/me/messages/${emailId}`)
      .select('categories')
      .get();
    
    return message.categories || [];
  } catch (error) {
    console.error('Error fetching email categories:', error);
    return [];
  }
}

async function fetchEmailFolders(accessToken) {
  try {
    const client = getGraphClient(accessToken);
    const response = await client
      .api('/me/mailFolders')
      .select('id,displayName,parentFolderId')
      .get();
    
    return response.value || [];
  } catch (error) {
    console.error('Error fetching email folders:', error);
    return [];
  }
}

async function fetchFlaggedEmails(accessToken, maxResults = 50) {
  try {
    const client = getGraphClient(accessToken);
    const response = await client
      .api('/me/messages')
      .filter("flag/flagStatus eq 'flagged'")
      .select('id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,sentDateTime,isRead,conversationId,categories,flag,parentFolderId')
      .top(maxResults)
      .orderby('flag/dueDateTime asc')
      .get();

    const emails = response.value || [];
    return emails.map(email => ({
      ...email,
      categories: email.categories || [],
      is_flagged: true,
      flag_due_date: email.flag?.dueDateTime || null,
      folder_id: email.parentFolderId || null
    }));
  } catch (error) {
    console.error('Error fetching flagged emails:', error);
    return [];
  }
}

async function getUserProfile(accessToken) {
  try {
    const client = getGraphClient(accessToken);
    const user = await client.api('/me').get();
    return user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  getAccessTokenFromCode,
  refreshAccessToken,
  fetchEmails,
  fetchEmailCategories,
  fetchEmailFolders,
  fetchFlaggedEmails,
  getUserProfile,
};


