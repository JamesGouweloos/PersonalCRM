const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const outlookService = require('../services/outlook');

// Helper function to get and refresh token if needed
async function getValidAccessToken(db) {
  const tokenRow = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, access_token, refresh_token, expires_at FROM oauth_tokens WHERE provider = ? ORDER BY updated_at DESC LIMIT 1',
      ['outlook'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!tokenRow) {
    throw new Error('Not authenticated. Please connect your Outlook account.');
  }

  // Always refresh if we have a refresh token and token is expired or expiring soon
  // This ensures we always use a fresh access token
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
  const bufferTime = 30 * 60 * 1000; // 30 minutes (matches background refresh service)
  const isExpired = expiresAt && (expiresAt.getTime() - bufferTime) < Date.now();

  // If we have a refresh token, always refresh proactively (like an authenticator app)
  if (tokenRow.refresh_token && (isExpired || !expiresAt)) {
    try {
      console.log('Token expired, refreshing...');
      const tokenData = await outlookService.refreshAccessToken(tokenRow.refresh_token);
      
      // Update token in database
      const newExpiresAt = tokenData.expiresIn 
        ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
        : null;
      
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [tokenData.accessToken, tokenData.refreshToken || tokenRow.refresh_token, newExpiresAt, tokenRow.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log('Token refreshed successfully');
      return tokenData.accessToken;
    } catch (refreshError) {
      console.error('Error refreshing token:', refreshError);
      // Check if refresh token itself is expired
      if (refreshError.message && (
        refreshError.message.includes('expired') ||
        refreshError.message.includes('Lifetime validation failed') ||
        refreshError.message.includes('invalid_grant') ||
        refreshError.errorCode === 'invalid_grant'
      )) {
        throw new Error('Refresh token expired. Please reconnect your Outlook account.');
      }
      throw new Error('Token refresh failed. Please reconnect your Outlook account.');
    }
  }
  
  // Even if not expired, try refreshing proactively if close to expiration
  // (Background service handles this, but we do it here as a fallback)
  if (tokenRow.refresh_token && expiresAt) {
    const timeUntilExpiry = expiresAt.getTime() - Date.now();
    const refreshThreshold = 30 * 60 * 1000; // Refresh if less than 30 minutes remaining (matches background service)
    if (timeUntilExpiry > 0 && timeUntilExpiry < refreshThreshold) {
      try {
        console.log('Token expiring soon, proactively refreshing...');
        const tokenData = await outlookService.refreshAccessToken(tokenRow.refresh_token);
        const newExpiresAt = tokenData.expiresIn 
          ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
          : null;
        
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [tokenData.accessToken, tokenData.refreshToken || tokenRow.refresh_token, newExpiresAt, tokenRow.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        return tokenData.accessToken;
      } catch (refreshError) {
        console.error('Error proactively refreshing token:', refreshError);
        // Continue with existing token if proactive refresh fails
      }
    }
  }

  return tokenRow.access_token;
}

// Sync emails from Outlook
router.post('/sync', async (req, res) => {
  try {
    const db = getDB();
    let accessToken = req.body.accessToken;
    
    if (!accessToken) {
      try {
        accessToken = await getValidAccessToken(db);
      } catch (tokenError) {
        console.error('Error getting valid access token:', tokenError);
        // Check if it's a refresh token expiration
        const isRefreshTokenInvalid = tokenError.message && (
          tokenError.message.includes('expired') ||
          tokenError.message.includes('Lifetime validation failed') ||
          tokenError.message.includes('invalid_grant') ||
          tokenError.message.includes('reconnect')
        );
        
        return res.status(401).json({ 
          error: tokenError.message || 'Your Outlook connection has expired. Please reconnect your account.',
          requiresReconnect: isRefreshTokenInvalid || tokenError.message?.includes('Not authenticated')
        });
      }
    }

    // Try to fetch emails, with automatic retry on token expiration
    let emails;
    try {
      emails = await outlookService.fetchEmails(accessToken);
    } catch (fetchError) {
      // If token expired during API call, refresh and retry
      const isTokenError = fetchError.message && (
        fetchError.message.includes('expired') || 
        fetchError.message.includes('Lifetime validation failed') ||
        fetchError.message.includes('InvalidAuthenticationToken') ||
        fetchError.message.includes('token') ||
        fetchError.code === 'InvalidAuthenticationToken' ||
        fetchError.statusCode === 401
      );
      
      if (isTokenError) {
        console.log('Token expired during API call, refreshing and retrying...');
        try {
          accessToken = await getValidAccessToken(db);
          emails = await outlookService.fetchEmails(accessToken);
        } catch (retryError) {
          // If refresh also fails, return a user-friendly error
          console.error('Token refresh failed:', retryError);
          // Check if refresh token is invalid (should be rare with offline_access)
          const isRefreshTokenInvalid = retryError.message && (
            retryError.message.includes('expired') ||
            retryError.message.includes('Lifetime validation failed') ||
            retryError.message.includes('invalid_grant') ||
            retryError.errorCode === 'invalid_grant'
          );
          
          return res.status(401).json({ 
            error: isRefreshTokenInvalid 
              ? 'Your Outlook connection has expired. Please reconnect your account.'
              : 'Unable to refresh access token. Please try again or reconnect your account.',
            requiresReconnect: isRefreshTokenInvalid
          });
        }
      } else {
        throw fetchError;
      }
    }
    
    let syncedCount = 0;
    
    // Get user email for activity tracking
    let userEmail = '';
    try {
      const userProfile = await outlookService.getUserProfile(accessToken);
      userEmail = userProfile.mail || userProfile.userPrincipalName || '';
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // If profile fetch fails due to token, try refreshing
      if (err.message && (
        err.message.includes('expired') || 
        err.message.includes('Lifetime validation failed') ||
        err.message.includes('InvalidAuthenticationToken')
      )) {
        try {
          accessToken = await getValidAccessToken(db);
          const userProfile = await outlookService.getUserProfile(accessToken);
          userEmail = userProfile.mail || userProfile.userPrincipalName || '';
        } catch (retryErr) {
          console.error('Error fetching user profile after refresh:', retryErr);
        }
      }
    }

    for (const email of emails) {
      // Check if email already exists
      db.get(
        'SELECT id FROM communications WHERE external_id = ? AND source = ?',
        [email.id, 'outlook'],
        (err, existing) => {
          if (err) {
            console.error('Error checking existing email:', err);
            return;
          }

          if (!existing) {
            // Try to find or create contact (case-insensitive duplicate check)
            const fromEmail = email.from.emailAddress.address;
            const normalizedEmail = fromEmail ? fromEmail.toLowerCase().trim() : null;
            
            if (!normalizedEmail) {
              insertEmail();
              return;
            }

            // Check for existing contact (case-insensitive)
            db.get(
              'SELECT id FROM contacts WHERE LOWER(TRIM(email)) = ?',
              [normalizedEmail],
              (err, contact) => {
                if (err) {
                  console.error('Error finding contact:', err);
                  return;
                }

                let contactId = contact ? contact.id : null;

                // Create contact if doesn't exist
                if (!contactId) {
                  db.run(
                    'INSERT INTO contacts (name, email, contact_type) VALUES (?, ?, ?)',
                    [
                      email.from.emailAddress.name || fromEmail.split('@')[0] || 'Unknown',
                      fromEmail, // Use original email (not normalized) for storage
                      'Other' // Default to 'Other', can be updated later
                    ],
                    function(insertErr) {
                      if (insertErr) {
                        // If it's a unique constraint error, contact was created by another concurrent process
                        if (insertErr.code === 'SQLITE_CONSTRAINT' || insertErr.message.includes('UNIQUE')) {
                          // Fetch the contact that was just created by another process
                          db.get(
                            'SELECT id FROM contacts WHERE LOWER(TRIM(email)) = ?',
                            [normalizedEmail],
                            (getErr, newContact) => {
                              if (!getErr && newContact) {
                                contactId = newContact.id;
                              }
                              insertEmail();
                            }
                          );
                        } else {
                          console.error('Error creating contact:', insertErr);
                          insertEmail();
                        }
                      } else {
                        contactId = this.lastID;
                        insertEmail();
                      }
                    }
                  );
                } else {
                  insertEmail();
                }

                function insertEmail() {
                  // Extract conversation ID and create deep link
                  const conversationId = email.conversationId || null;
                  const messageId = email.id;
                  const deepLink = `https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(messageId)}`;
                  
                  // Try to find linked opportunity by contact and recent activity
                  db.get(
                    `SELECT id FROM opportunities 
                     WHERE contact_id = ? 
                     AND status != 'lost' 
                     ORDER BY updated_at DESC LIMIT 1`,
                    [contactId],
                    (err, opp) => {
                      const opportunityId = opp ? opp.id : null;
                      
                      // Determine email direction
                      const fromEmail = email.from?.emailAddress?.address || '';
                      const toEmails = email.toRecipients?.map(r => r.emailAddress.address).join(', ') || '';
                      const isOutbound = fromEmail.toLowerCase() === userEmail.toLowerCase();
                      const direction = isOutbound ? 'outbound' : 'inbound';
                      
                      db.run(
                        `INSERT INTO communications 
                        (type, subject, body, from_email, to_email, contact_id, opportunity_id, 
                         external_id, source, conversation_id, message_id, deep_link, direction, occurred_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                          'email',
                          email.subject || '(No Subject)',
                          email.bodyPreview || email.body?.content || '',
                          fromEmail,
                          toEmails,
                          contactId,
                          opportunityId,
                          email.id,
                          'outlook',
                          conversationId,
                          messageId,
                          deepLink,
                          direction,
                          email.receivedDateTime || email.sentDateTime || new Date().toISOString()
                        ],
                        function(err) {
                          if (err) {
                            console.error('Error inserting email:', err);
                          } else {
                            syncedCount++;
                            
                            // Create activity record for email
                            if (contactId) {
                              const activityType = direction === 'outbound' ? 'email_sent' : 'email_received';
                              const otherParty = isOutbound ? toEmails : fromEmail;
                              
                              db.run(
                                `INSERT INTO activities 
                                (opportunity_id, contact_id, type, description, direction, user, 
                                 conversation_id, message_id, deep_link)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                  opportunityId,
                                  contactId,
                                  activityType,
                                  `Email ${direction === 'outbound' ? 'sent to' : 'received from'} ${otherParty}: ${email.subject || '(No Subject)'}`,
                                  direction,
                                  userEmail || 'system',
                                  conversationId,
                                  messageId,
                                  deepLink
                                ],
                                () => {}
                              );
                            }
                          }
                        }
                      );
                    }
                  );
                }
              }
            );
          }
        }
      );
    }

    // Wait a bit for async operations, then trigger email processing
    setTimeout(async () => {
      // Process all emails in inbox through rules engine (non-blocking)
      // This ensures all emails are processed with current rules, including already processed ones
      try {
        const emailProcessor = require('../services/email-processor');
        emailProcessor.processAllInboxEmails(accessToken).catch(err => {
          console.error('[Email Sync] Error processing all inbox emails:', err);
        });
      } catch (err) {
        console.error('[Email Sync] Error initializing email processor:', err);
      }

      res.json({ 
        success: true, 
        synced: syncedCount,
        total: emails.length 
      });
    }, 2000);
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email sync status/auth URL
router.get('/auth-url', async (req, res) => {
  try {
    const authUrl = await outlookService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback handler
router.get('/callback', async (req, res) => {
  try {
    const { code, error, error_description } = req.query;
    
    if (error) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/email-sync?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/email-sync?error=Authorization code not provided`);
    }

    const tokenData = await outlookService.getAccessTokenFromCode(code);
    const db = getDB();

    // Get user profile
    let userEmail = '';
    let userName = '';
    try {
      const userProfile = await outlookService.getUserProfile(tokenData.accessToken);
      userEmail = userProfile.mail || userProfile.userPrincipalName || '';
      userName = userProfile.displayName || '';
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }

    // Calculate expiration time
    const expiresAt = tokenData.expiresIn 
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null;

    // Store or update token
    db.get(
      'SELECT id FROM oauth_tokens WHERE provider = ?',
      ['outlook'],
      (err, existing) => {
        if (err) {
          console.error('Error checking existing token:', err);
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          return res.redirect(`${frontendUrl}/email-sync?error=Failed to check authentication token`);
        }

        if (existing) {
          // Update existing token
          db.run(
            `UPDATE oauth_tokens SET 
             access_token = ?, refresh_token = ?, expires_at = ?, user_email = ?, user_name = ?, updated_at = CURRENT_TIMESTAMP
             WHERE provider = ?`,
            [tokenData.accessToken, tokenData.refreshToken || null, expiresAt, userEmail, userName, 'outlook'],
            (updateErr) => {
              if (updateErr) {
                console.error('Error updating token:', updateErr);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                return res.redirect(`${frontendUrl}/email-sync?error=Failed to update authentication token`);
              }
              const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
              res.redirect(`${frontendUrl}/email-sync?success=true`);
            }
          );
        } else {
          // Insert new token
          db.run(
            `INSERT INTO oauth_tokens (provider, access_token, refresh_token, expires_at, user_email, user_name)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['outlook', tokenData.accessToken, tokenData.refreshToken || null, expiresAt, userEmail, userName],
            (insertErr) => {
              if (insertErr) {
                console.error('Error storing token:', insertErr);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                return res.redirect(`${frontendUrl}/email-sync?error=Failed to store authentication token`);
              }
              const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
              res.redirect(`${frontendUrl}/email-sync?success=true`);
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Error in callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/email-sync?error=${encodeURIComponent(error.message)}`);
  }
});

// Get OAuth connection status
router.get('/status', async (req, res) => {
  const db = getDB();
  db.get(
    'SELECT * FROM oauth_tokens WHERE provider = ? ORDER BY updated_at DESC LIMIT 1',
    ['outlook'],
    async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.json({ connected: false });
      }

      // If we have a refresh token, the connection is permanent (like an authenticator)
      // Only check access token expiration if no refresh token exists
      const hasRefreshToken = !!row.refresh_token;
      const accessTokenExpired = row.expires_at && new Date(row.expires_at) < new Date();
      
      // If we have a refresh token, we're always connected (can refresh access token)
      // If access token expired but we have refresh token, try to refresh it automatically
      if (hasRefreshToken && accessTokenExpired) {
        try {
          // Automatically refresh the token
          const accessToken = await getValidAccessToken(db);
          // Re-fetch the row to get updated expiration
          db.get(
            'SELECT * FROM oauth_tokens WHERE provider = ? ORDER BY updated_at DESC LIMIT 1',
            ['outlook'],
            (refreshErr, refreshedRow) => {
              if (refreshErr) {
                return res.json({
                  connected: true, // Still connected because we have refresh token
                  expired: false,
                  userEmail: row.user_email,
                  userName: row.user_name,
                  expiresAt: refreshedRow?.expires_at || row.expires_at,
                  hasRefreshToken: true
                });
              }
              res.json({
                connected: true,
                expired: false,
                userEmail: refreshedRow.user_email,
                userName: refreshedRow.user_name,
                expiresAt: refreshedRow.expires_at,
                hasRefreshToken: true
              });
            }
          );
        } catch (refreshError) {
          // If refresh fails, still consider connected if we have refresh token
          // (might be a temporary issue)
          console.error('Error refreshing token in status check:', refreshError);
          res.json({
            connected: true, // Still connected because we have refresh token
            expired: false,
            userEmail: row.user_email,
            userName: row.user_name,
            expiresAt: row.expires_at,
            hasRefreshToken: true,
            refreshWarning: 'Token refresh temporarily failed, but connection is still valid'
          });
        }
      } else {
        // No refresh token or access token still valid
        res.json({
          connected: hasRefreshToken || !accessTokenExpired,
          expired: !hasRefreshToken && accessTokenExpired,
          userEmail: row.user_email,
          userName: row.user_name,
          expiresAt: row.expires_at,
          hasRefreshToken: hasRefreshToken
        });
      }
    }
  );
});

// Get valid access token (with refresh if needed)
router.get('/token', async (req, res) => {
  try {
    const db = getDB();
    const accessToken = await getValidAccessToken(db);
    res.json({ accessToken });
  } catch (error) {
    console.error('Error getting valid token:', error);
    res.status(401).json({ error: error.message || 'Token refresh failed. Please reconnect.' });
  }
});

// Disconnect Outlook
router.post('/disconnect', (req, res) => {
  const db = getDB();
  db.run(
    'DELETE FROM oauth_tokens WHERE provider = ?',
    ['outlook'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Reprocess all emails through rules
router.post('/reprocess', async (req, res) => {
  try {
    const db = getDB();
    const accessToken = await getValidAccessToken(db);
    const emailProcessor = require('../services/email-processor');
    const results = await emailProcessor.reprocessAllEmails(accessToken);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error reprocessing emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get synced emails
router.get('/', (req, res) => {
  const db = getDB();
  const { contactId, opportunityId, contactType, conversation_id, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT c.*, ct.name as contact_name, ct.email as contact_email, ct.contact_type
    FROM communications c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.type = 'email'
  `;
  const params = [];

  if (contactId) {
    query += ' AND c.contact_id = ?';
    params.push(contactId);
  }

  if (opportunityId) {
    query += ' AND c.opportunity_id = ?';
    params.push(opportunityId);
  }

  if (contactType && contactType !== 'all') {
    query += ' AND ct.contact_type = ?';
    params.push(contactType);
  }

  if (conversation_id) {
    query += ' AND c.conversation_id = ?';
    params.push(conversation_id);
  }

  // If filtering by conversation_id, sort oldest first (for thread view)
  // Otherwise, sort newest first (for inbox view)
  if (conversation_id) {
    query += ' ORDER BY c.occurred_at ASC';
  } else {
    query += ' ORDER BY c.occurred_at DESC';
  }
  
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching emails:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Send email (reply)
router.post('/send', async (req, res) => {
  try {
    const db = getDB();
    const { to, subject, body, inReplyTo, conversationId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body are required' });
    }

    // Get valid access token
    let accessToken;
    try {
      accessToken = await getValidAccessToken(db);
    } catch (tokenError) {
      return res.status(401).json({ 
        error: tokenError.message || 'Authentication failed. Please reconnect your Outlook account.',
        requiresReconnect: true
      });
    }

    // Send email via Outlook service
    const result = await outlookService.sendEmail(accessToken, {
      to,
      subject,
      body,
      inReplyTo,
      conversationId
    });

    // Optionally save the sent email to communications table
    // This helps track sent emails in the conversation thread
    if (conversationId) {
      db.run(
        `INSERT INTO communications 
         (type, subject, body, from_email, to_email, conversation_id, direction, occurred_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        ['email', subject, body, result.userEmail || 'me', to, conversationId, 'outbound', 'outlook'],
        (err) => {
          if (err) {
            console.error('Error saving sent email to database:', err);
          }
        }
      );
    }

    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send email',
      details: error.code || error.statusCode
    });
  }
});

module.exports = router;

