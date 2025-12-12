"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { emailsAPI } from "@/lib/api"
import { Mail, CheckCircle2, XCircle, RefreshCw, Link2, Link2Off, Loader2 } from "lucide-react"

interface ConnectionStatus {
  connected: boolean
  expired?: boolean
  userEmail?: string
  userName?: string
  expiresAt?: string
  hasRefreshToken?: boolean
  refreshWarning?: string
}

function EmailSyncContent() {
  const searchParams = useSearchParams()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    checkConnectionStatus()

    // Check for OAuth callback parameters
    const errorParam = searchParams.get("error")
    const successParam = searchParams.get("success")

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    } else if (successParam === "true") {
      setSuccess(true)
      checkConnectionStatus()
      setTimeout(() => setSuccess(false), 5000)
    }
  }, [searchParams])

  const checkConnectionStatus = async () => {
    try {
      setLoading(true)
      const response = await emailsAPI.getStatus()
      setConnectionStatus(response.data)
      setError(null)
    } catch (err: any) {
      console.error("Error checking connection status:", err)
      setError(err.response?.data?.error || "Failed to check connection status")
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setError(null)
      const response = await emailsAPI.getAuthUrl()
      // Redirect to Microsoft login
      window.location.href = response.data.authUrl
    } catch (err: any) {
      console.error("Error getting auth URL:", err)
      setError(err.response?.data?.error || "Failed to get authorization URL. Please check your Outlook configuration.")
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      setSyncResult(null)
      const response = await emailsAPI.sync()
      setSyncResult(response.data)
      // Refresh connection status after sync
      await checkConnectionStatus()
    } catch (err: any) {
      console.error("Error syncing emails:", err)
      setError(err.response?.data?.error || "Failed to sync emails")
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setError(null)
      await emailsAPI.disconnect()
      setConnectionStatus({ connected: false })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      console.error("Error disconnecting:", err)
      setError(err.response?.data?.error || "Failed to disconnect")
    }
  }

  const isConnected = connectionStatus?.connected

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-w-0 overflow-x-hidden">
        <Header title="Email Sync" subtitle="Connect and sync your Outlook emails" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Success Message */}
          {success && (
            <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">
                {isConnected ? "Successfully connected!" : "Successfully disconnected!"}
              </AlertTitle>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Connection Status Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Outlook Connection</CardTitle>
              <CardDescription>Connect your Microsoft Outlook account to sync emails</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking connection status...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isConnected ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">Connected</p>
                            {connectionStatus?.userEmail && (
                              <p className="text-sm text-muted-foreground">{connectionStatus.userEmail}</p>
                            )}
                            {connectionStatus?.hasRefreshToken ? (
                              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                ✓ Permanent connection (like an authenticator app)
                              </p>
                            ) : connectionStatus?.expiresAt ? (
                              <p className="text-xs text-muted-foreground">
                                Expires: {new Date(connectionStatus.expiresAt).toLocaleString()}
                              </p>
                            ) : null}
                            {connectionStatus?.refreshWarning && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                ⚠ {connectionStatus.refreshWarning}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium">Not Connected</p>
                            <p className="text-sm text-muted-foreground">
                              {connectionStatus?.expired
                                ? "Your connection has expired. Please reconnect."
                                : "Connect your Outlook account to start syncing emails"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isConnected ? (
                        <>
                          <Button onClick={handleSync} disabled={syncing} variant="outline">
                            {syncing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sync Emails
                              </>
                            )}
                          </Button>
                          <Button onClick={handleDisconnect} variant="destructive">
                            <Link2Off className="mr-2 h-4 w-4" />
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button onClick={handleConnect}>
                          <Link2 className="mr-2 h-4 w-4" />
                          Connect Outlook
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sync Result */}
                  {syncResult && (
                    <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800 dark:text-blue-200">Sync Complete</AlertTitle>
                      <AlertDescription className="text-blue-700 dark:text-blue-300">
                        Synced {syncResult.synced} of {syncResult.total} emails
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Setup Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>Follow these steps to configure Microsoft Outlook integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-2">To set up Microsoft Outlook integration:</p>
                  <ol className="list-decimal list-inside space-y-2 ml-2 text-muted-foreground">
                    <li>
                      Register your application in Azure Portal at{" "}
                      <a
                        href="https://portal.azure.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        portal.azure.com
                      </a>
                    </li>
                    <li>Create an App Registration and note your Client ID, Client Secret, and Tenant ID</li>
                    <li>
                      Add redirect URI: <code className="bg-secondary px-1 py-0.5 rounded">http://localhost:3001/api/emails/callback</code>
                    </li>
                    <li>
                      Add API permissions: <code className="bg-secondary px-1 py-0.5 rounded">Mail.Read</code> and{" "}
                      <code className="bg-secondary px-1 py-0.5 rounded">User.Read</code>
                    </li>
                    <li>
                      Create a <code className="bg-secondary px-1 py-0.5 rounded">.env</code> file in the server directory with your credentials:
                      <pre className="mt-2 p-3 bg-secondary rounded-md text-xs overflow-x-auto">
                        {`OUTLOOK_CLIENT_ID=your-client-id
OUTLOOK_CLIENT_SECRET=your-client-secret
OUTLOOK_TENANT_ID=your-tenant-id
OUTLOOK_REDIRECT_URI=http://localhost:3001/api/emails/callback`}
                      </pre>
                    </li>
                    <li>Restart your server after updating the .env file</li>
                  </ol>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    The OAuth flow is fully automated. After connecting, tokens are stored securely and automatically
                    refreshed when needed. See <code className="bg-secondary px-1 py-0.5 rounded">AZURE_SETUP.md</code> for detailed
                    instructions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function EmailSyncPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" />
        <main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </div>
    }>
      <EmailSyncContent />
    </Suspense>
  )
}

