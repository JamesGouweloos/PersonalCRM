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
      'https://graph.microsoft.com/Mail.Send', // Required for sending emails
      'https://graph.microsoft.com/Calendars.ReadWrite', // Required for calendar events
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
      'https://graph.microsoft.com/Mail.Send', // Required for sending emails
      'https://graph.microsoft.com/Calendars.ReadWrite', // Required for calendar events
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
      'https://graph.microsoft.com/Mail.Send', // Required for sending emails
      'https://graph.microsoft.com/Calendars.ReadWrite', // Required for calendar events
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

async function sendEmail(accessToken, { to, subject, body, inReplyTo, conversationId }) {
  try {
    const client = getGraphClient(accessToken);
    
    // Get user's email address
    const userProfile = await getUserProfile(accessToken);
    const userEmail = userProfile.mail || userProfile.userPrincipalName;
    
    // Build message object for Microsoft Graph API
    const message = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: body.replace(/\n/g, '<br>')
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    };

    // If replying, add references for proper threading
    if (inReplyTo) {
      message.internetMessageHeaders = [
        {
          name: 'In-Reply-To',
          value: `<${inReplyTo}>`
        },
        {
          name: 'References',
          value: `<${inReplyTo}>`
        }
      ];
      
      // If conversationId exists, use it for threading
      if (conversationId) {
        message.conversationId = conversationId;
      }
    }

    // Send email via Microsoft Graph API
    // The API expects { message: {...} } format
    await client
      .api('/me/sendMail')
      .post({ message: message });

    return {
      success: true,
      messageId: 'sent',
      userEmail
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Provide clearer error messages
    if (error.statusCode === 403 || error.code === 'ErrorAccessDenied' || 
        (error.message && error.message.includes('Access is denied'))) {
      throw new Error('Permission denied. Please ensure Mail.Send permission is granted in Azure and reconnect your account.');
    }
    if (error.statusCode === 401 || error.code === 'InvalidAuthenticationToken') {
      throw new Error('Authentication failed. Please reconnect your Outlook account.');
    }
    
    throw error;
  }
}

/**
 * Fetch calendar events from Outlook
 */
async function fetchCalendarEvents(accessToken, startDate = null, endDate = null) {
  try {
    const client = getGraphClient(accessToken);
    
    // Default to current month if dates not provided
    const start = startDate || new Date().toISOString();
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await client
      .api('/me/calendar/events')
      .select('id,subject,body,start,end,location,isAllDay,attendees,organizer,webLink')
      .filter(`start/dateTime ge '${start}' and end/dateTime le '${end}'`)
      .orderby('start/dateTime asc')
      .get();
    
    return (response.value || []).map(event => ({
      id: event.id,
      subject: event.subject || '(No Subject)',
      body: event.body?.content || '',
      startDateTime: event.start?.dateTime || event.start?.date,
      endDateTime: event.end?.dateTime || event.end?.date,
      location: event.location?.displayName || null,
      isAllDay: event.isAllDay || false,
      attendees: (event.attendees || []).map(a => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
        type: a.type
      })),
      organizer: event.organizer?.emailAddress?.address || null,
      webLink: event.webLink || null
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Create a calendar event in Outlook
 */
async function createCalendarEvent(accessToken, { subject, body, startDateTime, endDateTime, location, isAllDay, attendees, followUpId }) {
  try {
    const client = getGraphClient(accessToken);
    
    const event = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: body || ''
      },
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC'
      },
      isAllDay: isAllDay || false
    };
    
    if (location) {
      event.location = {
        displayName: location
      };
    }
    
    if (attendees && attendees.length > 0) {
      event.attendees = attendees.map(email => ({
        emailAddress: {
          address: email,
          name: email
        },
        type: 'required'
      }));
    }
    
    const createdEvent = await client
      .api('/me/calendar/events')
      .post(event);
    
    return {
      id: createdEvent.id,
      subject: createdEvent.subject,
      webLink: createdEvent.webLink,
      startDateTime: createdEvent.start?.dateTime || createdEvent.start?.date,
      endDateTime: createdEvent.end?.dateTime || createdEvent.end?.date
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

/**
 * Update a calendar event in Outlook
 */
async function updateCalendarEvent(accessToken, eventId, updates) {
  try {
    const client = getGraphClient(accessToken);
    
    const event = {};
    if (updates.subject !== undefined) event.subject = updates.subject;
    if (updates.body !== undefined) {
      event.body = {
        contentType: 'HTML',
        content: updates.body
      };
    }
    if (updates.startDateTime !== undefined) {
      event.start = {
        dateTime: updates.startDateTime,
        timeZone: 'UTC'
      };
    }
    if (updates.endDateTime !== undefined) {
      event.end = {
        dateTime: updates.endDateTime,
        timeZone: 'UTC'
      };
    }
    if (updates.location !== undefined) {
      event.location = {
        displayName: updates.location
      };
    }
    if (updates.isAllDay !== undefined) event.isAllDay = updates.isAllDay;
    
    const updatedEvent = await client
      .api(`/me/calendar/events/${eventId}`)
      .patch(event);
    
    return updatedEvent;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

/**
 * Delete a calendar event in Outlook
 */
async function deleteCalendarEvent(accessToken, eventId) {
  try {
    const client = getGraphClient(accessToken);
    await client
      .api(`/me/calendar/events/${eventId}`)
      .delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
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
  sendEmail,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};


