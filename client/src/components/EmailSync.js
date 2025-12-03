import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { emailsAPI } from '../services/api';

function EmailSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
    
    // Check for OAuth callback parameters
    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('success');
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setSearchParams({}); // Clear URL params
    } else if (successParam === 'true') {
      setSuccess(true);
      setSearchParams({}); // Clear URL params
      checkConnectionStatus();
      setTimeout(() => setSuccess(false), 5000);
    }
  }, [searchParams, setSearchParams]);

  const checkConnectionStatus = async () => {
    try {
      const response = await emailsAPI.getStatus();
      setConnectionStatus(response.data);
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await emailsAPI.getAuthUrl();
      // Redirect to Microsoft login (same window)
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setError('Error getting authorization URL. Please check your Outlook configuration.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const response = await emailsAPI.sync();
      setSyncResult(response.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error('Error syncing emails:', error);
      const errorMessage = error.response?.data?.error || error.message;
      setError(errorMessage);
      if (errorMessage.includes('Not authenticated') || errorMessage.includes('reconnect')) {
        setConnectionStatus({ connected: false });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Outlook account?')) {
      return;
    }
    try {
      await emailsAPI.disconnect();
      setConnectionStatus({ connected: false });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error disconnecting:', error);
      setError('Error disconnecting account');
    }
  };

  if (loading) {
    return <div className="card">Loading...</div>;
  }

  const isConnected = connectionStatus?.connected;

  return (
    <>
      <Sidebar />
      <main className="ml-64">
        <Header title="Email Sync" subtitle="Connect and sync your Outlook emails" />
        <div className="p-6">

      {/* Success Message */}
      {success && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#d1fae5', border: '1px solid #10b981' }}>
          <div style={{ color: '#065f46', fontWeight: 600 }}>
            ✓ {isConnected ? 'Successfully connected!' : 'Successfully disconnected!'}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#fee2e2', border: '1px solid #ef4444' }}>
          <div style={{ color: '#991b1b', fontWeight: 600 }}>Error: {error}</div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Microsoft Outlook Integration</h2>
        <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
          Connect your Microsoft Outlook account to automatically sync emails into your CRM.
          This will create contacts from email senders and track all communications.
        </p>

        {/* Connection Status */}
        {isConnected ? (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                  ✓ Connected to Outlook
                </div>
                {connectionStatus.userEmail && (
                  <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                    {connectionStatus.userName && `${connectionStatus.userName} - `}
                    {connectionStatus.userEmail}
                  </div>
                )}
              </div>
              <button className="btn btn-danger" onClick={handleDisconnect} style={{ fontSize: '0.875rem' }}>
                Disconnect
              </button>
            </div>
            {connectionStatus.expiresAt && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Token expires: {new Date(connectionStatus.expiresAt).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>
              Not Connected
            </div>
            <p style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '1rem' }}>
              Click the button below to connect your Outlook account. You'll be redirected to Microsoft's login page.
            </p>
            <button className="btn btn-primary" onClick={handleConnect}>
              Connect Outlook Account
            </button>
          </div>
        )}

        {/* Sync Section */}
        {isConnected && (
          <div>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>Sync Emails</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Sync your latest emails from Outlook. This will import emails and create contacts automatically.
            </p>
            <button
              className="btn btn-success"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Emails Now'}
            </button>

            {syncResult && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#d1fae5', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#065f46' }}>Sync Complete</div>
                <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                  Synced {syncResult.synced} new emails out of {syncResult.total} total emails.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Setup Instructions</h2>
        <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>To set up Microsoft Outlook integration:</strong>
          </p>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              Register your application in Azure Portal at{' '}
              <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer">
                portal.azure.com
              </a>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Create an App Registration and note your Client ID, Client Secret, and Tenant ID
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Add redirect URI: <code>http://localhost:3001/api/emails/callback</code>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Add API permissions: <code>Mail.Read</code> and <code>User.Read</code>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Update the <code>.env</code> file with your credentials
            </li>
          </ol>
          <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
            The OAuth flow is fully automated. After connecting, tokens are stored securely and automatically refreshed when needed.
          </p>
        </div>
      </div>
        </div>
      </main>
    </>
  );
}

export default EmailSync;


