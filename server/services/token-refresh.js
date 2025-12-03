const { getDB } = require('../database');
const outlookService = require('./outlook');

// Configuration
const REFRESH_BUFFER_MINUTES = 30; // Refresh tokens 30 minutes before expiry
const CHECK_INTERVAL_MINUTES = 15; // Check every 15 minutes

let refreshInterval = null;

/**
 * Check and refresh a token if it's close to expiring
 */
async function checkAndRefreshToken() {
  const db = getDB();
  
  try {
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

    if (!tokenRow || !tokenRow.refresh_token) {
      return; // No token to refresh
    }

    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
    if (!expiresAt) {
      return; // No expiration time set
    }

    const now = Date.now();
    const expiryTime = expiresAt.getTime();
    const timeUntilExpiry = expiryTime - now;
    const refreshThreshold = REFRESH_BUFFER_MINUTES * 60 * 1000; // Convert to milliseconds

    // With offline_access scope, refresh tokens don't expire (or expire very rarely)
    // So we can always refresh the access token proactively
    // Refresh if token expires within threshold OR if it's already expired
    if (timeUntilExpiry <= refreshThreshold) {
      try {
        if (timeUntilExpiry > 0) {
          console.log(`[Token Refresh] Token expires in ${Math.round(timeUntilExpiry / 60000)} minutes. Refreshing proactively...`);
        } else {
          console.log(`[Token Refresh] Token has expired. Refreshing automatically...`);
        }
        
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

        const newExpiryTime = newExpiresAt ? new Date(newExpiresAt).getTime() : null;
        const newTimeUntilExpiry = newExpiryTime ? newExpiryTime - Date.now() : null;
        
        console.log(`[Token Refresh] Token refreshed successfully. New access token expires in ${newTimeUntilExpiry ? Math.round(newTimeUntilExpiry / 60000) : 'unknown'} minutes. Refresh token remains valid (permanent connection).`);
      } catch (refreshError) {
        console.error('[Token Refresh] Error refreshing token:', refreshError.message);
        
        // Check if refresh token itself is expired (should be very rare with offline_access)
        if (refreshError.message && (
          refreshError.message.includes('expired') ||
          refreshError.message.includes('Lifetime validation failed') ||
          refreshError.message.includes('invalid_grant') ||
          refreshError.errorCode === 'invalid_grant'
        )) {
          console.error('[Token Refresh] Refresh token expired or invalid. This is rare with offline_access scope. User may need to reconnect.');
          // Optionally, you could mark the token as expired in the database
        }
      }
    } else {
      const minutesUntilExpiry = Math.round(timeUntilExpiry / 60000);
      console.log(`[Token Refresh] Token is valid for ${minutesUntilExpiry} more minutes. Will refresh when within ${REFRESH_BUFFER_MINUTES} minutes of expiry.`);
    }
  } catch (error) {
    console.error('[Token Refresh] Error checking token:', error);
  }
}

/**
 * Start the automatic token refresh service
 */
function startTokenRefreshService() {
  if (refreshInterval) {
    console.log('[Token Refresh] Service already running.');
    return;
  }

  console.log(`[Token Refresh] Starting automatic token refresh service (checks every ${CHECK_INTERVAL_MINUTES} minutes, refreshes ${REFRESH_BUFFER_MINUTES} minutes before expiry)`);
  
  // Run immediately on start
  checkAndRefreshToken();
  
  // Then run periodically
  refreshInterval = setInterval(() => {
    checkAndRefreshToken();
  }, CHECK_INTERVAL_MINUTES * 60 * 1000);
}

/**
 * Stop the automatic token refresh service
 */
function stopTokenRefreshService() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[Token Refresh] Service stopped.');
  }
}

module.exports = {
  startTokenRefreshService,
  stopTokenRefreshService,
  checkAndRefreshToken,
};


