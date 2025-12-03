// Local storage management for email read/unread status
// This is app-only state and doesn't sync to the server

const STORAGE_KEY = "crm_email_read_status"
const AUTOSYNC_INTERVAL_KEY = "crm_autosync_interval"
const AUTOSYNC_ENABLED_KEY = "crm_autosync_enabled"

interface EmailReadStatus {
  [emailId: string]: {
    read: boolean
    readAt?: string
  }
}

export function getEmailReadStatus(): EmailReadStatus {
  if (typeof window === "undefined") return {}
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : {}
}

export function setEmailReadStatus(emailId: string | number, read: boolean): void {
  if (typeof window === "undefined") return
  const status = getEmailReadStatus()
  status[emailId.toString()] = {
    read,
    readAt: read ? new Date().toISOString() : undefined,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
}

export function isEmailRead(emailId: string | number): boolean {
  const status = getEmailReadStatus()
  return status[emailId.toString()]?.read ?? false
}

export function markEmailAsRead(emailId: string | number): void {
  setEmailReadStatus(emailId, true)
}

export function markEmailAsUnread(emailId: string | number): void {
  setEmailReadStatus(emailId, false)
}

export function markAllAsRead(emailIds: (string | number)[]): void {
  if (typeof window === "undefined") return
  const status = getEmailReadStatus()
  emailIds.forEach((id) => {
    status[id.toString()] = {
      read: true,
      readAt: new Date().toISOString(),
    }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
}

// Mark new emails as unread (emails that don't have a status entry)
export function initializeEmailStatus(emailIds: (string | number)[]): void {
  if (typeof window === "undefined") return
  const status = getEmailReadStatus()
  let updated = false
  
  emailIds.forEach((id) => {
    const idStr = id.toString()
    if (!(idStr in status)) {
      // New email - mark as unread
      status[idStr] = {
        read: false,
      }
      updated = true
    }
  })
  
  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  }
}

export function getUnreadCount(emailIds: (string | number)[]): number {
  const status = getEmailReadStatus()
  return emailIds.filter((id) => !status[id.toString()]?.read).length
}

// Clean up stale email status entries (emails that no longer exist)
export function cleanupEmailStatus(existingEmailIds: (string | number)[]): void {
  if (typeof window === "undefined") return
  const status = getEmailReadStatus()
  const existingIds = new Set(existingEmailIds.map(id => id.toString()))
  let updated = false
  
  // Remove entries for emails that no longer exist
  Object.keys(status).forEach((id) => {
    if (!existingIds.has(id)) {
      delete status[id]
      updated = true
    }
  })
  
  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  }
}

// Autosync settings
export function getAutosyncInterval(): number {
  if (typeof window === "undefined") return 5 * 60 * 1000 // Default 5 minutes
  const stored = localStorage.getItem(AUTOSYNC_INTERVAL_KEY)
  return stored ? parseInt(stored, 10) : 5 * 60 * 1000
}

export function setAutosyncInterval(intervalMs: number): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTOSYNC_INTERVAL_KEY, intervalMs.toString())
}

export function isAutosyncEnabled(): boolean {
  if (typeof window === "undefined") return true
  const stored = localStorage.getItem(AUTOSYNC_ENABLED_KEY)
  return stored ? stored === "true" : true
}

export function setAutosyncEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTOSYNC_ENABLED_KEY, enabled.toString())
}


