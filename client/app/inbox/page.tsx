"use client"

import React, { useEffect, useState, useRef, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { emailsAPI, contactsAPI, opportunitiesAPI, communicationsAPI, leadsAPI } from "@/lib/api"
import {
  isEmailRead,
  markEmailAsRead,
  markEmailAsUnread,
  markAllAsRead,
  initializeEmailStatus,
  getUnreadCount,
  cleanupEmailStatus,
  getAutosyncInterval,
  setAutosyncInterval,
  isAutosyncEnabled,
  setAutosyncEnabled,
} from "@/lib/email-status"
import {
  Mail, MailOpen, Search, ExternalLink, Link2, RefreshCw, Loader2, Inbox as InboxIcon,
  Circle, CheckCircle2, UserPlus, Briefcase, User, Sparkles, Filter, X,
  Calendar, Clock, TrendingUp, Users, CheckSquare, MoreVertical, ChevronLeft, ChevronRight
} from "lucide-react"
import { format, formatDistanceToNow, startOfToday, startOfWeek, isToday, isThisWeek } from "date-fns"
import Link from "next/link"

interface Email {
  id: number
  type: string
  subject: string
  body: string
  from_email: string
  to_email: string
  contact_id: number | null
  opportunity_id: number | null
  external_id: string
  source: string
  conversation_id: string | null
  message_id: string | null
  deep_link: string | null
  occurred_at: string
  created_at: string
  contact_name: string | null
  contact_email: string | null
}

interface Contact {
  id: string
  name: string
  email: string
}

interface Opportunity {
  id: string
  title: string
}

type FilterType = 'all' | 'unread' | 'inbound' | 'outbound' | 'has_opportunity' | 'has_contact' | 'today' | 'this_week'

function InboxContent() {
  const searchParams = useSearchParams()
  const contactTypeFilter = searchParams.get('type') || 'all'
  const conversationIdFilter = searchParams.get('conversation_id') || null
  
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFilter, setSearchFilter] = useState<'all' | 'sender' | 'subject' | 'body'>('all')
  const [activeFilters, setActiveFilters] = useState<FilterType[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [opportunities, setOpportunities] = useState<Record<string, Opportunity>>({})
  const [autosyncEnabled, setAutosyncEnabledState] = useState(isAutosyncEnabled())
  const [autosyncInterval, setAutosyncIntervalState] = useState(getAutosyncInterval())
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [nextSyncTime, setNextSyncTime] = useState<Date | null>(null)
  const autosyncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showCreateContactDialog, setShowCreateContactDialog] = useState(false)
  const [showCreateLeadDialog, setShowCreateLeadDialog] = useState(false)
  const [showCreateOpportunityDialog, setShowCreateOpportunityDialog] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    loadContacts()
    loadOpportunities()
    setLastSyncTime(new Date())
  }, [])

  useEffect(() => {
    if (emails.length > 0) {
      initializeEmailStatus(emails.map((e) => e.id))
    }
  }, [emails])

  useEffect(() => {
    if (autosyncEnabled) {
      const interval = autosyncInterval
      const sync = async () => {
        try {
          await emailsAPI.sync()
          await loadEmails()
          setLastSyncTime(new Date())
        } catch (error: any) {
          console.error("Autosync error:", error)
          
          // Handle authentication errors (401)
          if (error.response?.status === 401 || error.response?.data?.requiresReconnect) {
            console.warn("Outlook connection expired. Disabling autosync.")
            // Disable autosync if authentication fails
            setAutosyncEnabled(false)
            setAutosyncEnabledState(false)
            // Show user-friendly notification
            const errorMessage = error.response?.data?.error || "Your Outlook connection has expired. Please reconnect your account."
            alert(`Autosync disabled: ${errorMessage}`)
            return
          }
          
          // For other errors, just log but continue autosync
          console.warn("Autosync failed, will retry on next interval:", error.message)
        }
      }

      const scheduleNextSync = () => {
        const next = new Date(Date.now() + interval)
        setNextSyncTime(next)
      }

      scheduleNextSync()
      autosyncTimerRef.current = setInterval(() => {
        sync()
        scheduleNextSync()
      }, interval)

      return () => {
        if (autosyncTimerRef.current) {
          clearInterval(autosyncTimerRef.current)
        }
      }
    } else {
      if (autosyncTimerRef.current) {
        clearInterval(autosyncTimerRef.current)
        autosyncTimerRef.current = null
      }
      setNextSyncTime(null)
    }
  }, [autosyncEnabled, autosyncInterval])

  useEffect(() => {
    if (selectedEmail && !isEmailRead(selectedEmail.id)) {
      markEmailAsRead(selectedEmail.id)
      setEmails((prev) => [...prev])
    }
  }, [selectedEmail?.id])

  const loadEmails = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 1000 }
      if (contactTypeFilter && contactTypeFilter !== 'all') {
        params.contactType = contactTypeFilter
      }
      if (conversationIdFilter) {
        params.conversation_id = conversationIdFilter
      }
      const response = await emailsAPI.getAll(params)
      const loadedEmails = response.data || []
      setEmails(loadedEmails)
      if (loadedEmails.length > 0) {
        const emailIds = loadedEmails.map((e: Email) => e.id)
        initializeEmailStatus(emailIds)
        // Clean up stale email status entries
        cleanupEmailStatus(emailIds)
      } else {
        // If no emails, clean up all status entries
        cleanupEmailStatus([])
      }
    } catch (error: any) {
      console.error("Error loading emails:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmails()
  }, [contactTypeFilter, conversationIdFilter])

  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getAll()
      const contactsMap: Record<string, Contact> = {}
      response.data.forEach((c: any) => {
        contactsMap[c.id] = c
      })
      setContacts(contactsMap)
    } catch (error) {
      console.error("Error loading contacts:", error)
    }
  }

  const loadOpportunities = async () => {
    try {
      const response = await opportunitiesAPI.getAll()
      const opportunitiesMap: Record<string, Opportunity> = {}
      response.data.forEach((o: any) => {
        opportunitiesMap[o.id] = o
      })
      setOpportunities(opportunitiesMap)
    } catch (error) {
      console.error("Error loading opportunities:", error)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      await emailsAPI.sync()
      await loadEmails()
      setLastSyncTime(new Date())
    } catch (error: any) {
      console.error("Error syncing emails:", error)
      const errorMessage = error.response?.data?.error || error.message
      if (error.response?.data?.requiresReconnect || errorMessage.includes('reconnect')) {
        if (confirm(errorMessage + "\n\nWould you like to reconnect your Outlook account now?")) {
          window.location.href = '/email-sync'
        }
      } else {
        alert("Failed to sync emails: " + errorMessage)
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleReprocessEmails = async () => {
    if (!confirm("This will apply email rules to all emails in your inbox. This may take a few moments. Continue?")) {
      return
    }
    try {
      setReprocessing(true)
      await emailsAPI.reprocess()
      alert("Email rules have been applied to all emails.")
      await loadEmails()
      await loadContacts()
      await loadOpportunities()
    } catch (error: any) {
      console.error("Error reprocessing emails:", error)
      alert("Failed to reprocess emails: " + (error.response?.data?.error || error.message))
    } finally {
      setReprocessing(false)
    }
  }

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  const getEmailDirection = (email: Email) => {
    // Simple heuristic - in a real app, you'd compare with user's email
    return email.from_email.includes("@") ? "inbound" : "outbound"
  }

  const filteredEmails = useMemo(() => {
    let filtered = emails

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(email => {
        switch (searchFilter) {
          case 'sender':
            return email.from_email?.toLowerCase().includes(query) || email.contact_name?.toLowerCase().includes(query)
          case 'subject':
            return email.subject?.toLowerCase().includes(query)
          case 'body':
            return email.body?.toLowerCase().includes(query)
          default:
            return (
              email.subject?.toLowerCase().includes(query) ||
              email.body?.toLowerCase().includes(query) ||
              email.from_email?.toLowerCase().includes(query) ||
              email.contact_name?.toLowerCase().includes(query)
            )
        }
      })
    }

    // Active filters
    activeFilters.forEach(filter => {
      switch (filter) {
        case 'unread':
          filtered = filtered.filter(e => !isEmailRead(e.id))
          break
        case 'inbound':
          filtered = filtered.filter(e => getEmailDirection(e) === 'inbound')
          break
        case 'outbound':
          filtered = filtered.filter(e => getEmailDirection(e) === 'outbound')
          break
        case 'has_opportunity':
          filtered = filtered.filter(e => e.opportunity_id !== null)
          break
        case 'has_contact':
          filtered = filtered.filter(e => e.contact_id !== null)
          break
        case 'today':
          filtered = filtered.filter(e => isToday(new Date(e.occurred_at)))
          break
        case 'this_week':
          filtered = filtered.filter(e => isThisWeek(new Date(e.occurred_at)))
          break
      }
    })

    return filtered
  }, [emails, searchQuery, searchFilter, activeFilters])

  // Pagination
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEmails.slice(start, start + pageSize)
  }, [filteredEmails, currentPage, pageSize])

  const totalPages = Math.ceil(filteredEmails.length / pageSize)

  // Analytics
  const analytics = useMemo(() => {
    const today = startOfToday()
    const weekStart = startOfWeek(today)
    const todayEmails = emails.filter(e => isToday(new Date(e.occurred_at)))
    const weekEmails = emails.filter(e => isThisWeek(new Date(e.occurred_at)))
    const unreadEmails = emails.filter(e => !isEmailRead(e.id))
    const emailsWithOpportunities = emails.filter(e => e.opportunity_id !== null)
    
    return {
      total: emails.length,
      unread: unreadEmails.length,
      today: todayEmails.length,
      thisWeek: weekEmails.length,
      withOpportunities: emailsWithOpportunities.length,
    }
  }, [emails])

  // Bulk operations
  const handleBulkMarkRead = () => {
    selectedEmails.forEach(id => markEmailAsRead(id))
    setSelectedEmails(new Set())
    setShowBulkActions(false)
    setEmails([...emails])
  }

  const handleBulkMarkUnread = () => {
    selectedEmails.forEach(id => markEmailAsUnread(id))
    setSelectedEmails(new Set())
    setShowBulkActions(false)
    setEmails([...emails])
  }

  const toggleEmailSelection = (emailId: number) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      if (newSet.size === 0) {
        setShowBulkActions(false)
      } else {
        setShowBulkActions(true)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (selectedEmails.size === paginatedEmails.length) {
      setSelectedEmails(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedEmails(new Set(paginatedEmails.map(e => e.id)))
      setShowBulkActions(true)
    }
  }

  // Group emails by conversation
  const groupedEmails = useMemo(() => {
    const groups = new Map<string, Email[]>()
    paginatedEmails.forEach(email => {
      const key = email.conversation_id || email.id.toString()
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(email)
    })
    return Array.from(groups.values()).map(group => ({
      conversationId: group[0].conversation_id,
      emails: group.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()),
      latestEmail: group[0],
    }))
  }, [paginatedEmails])

  const handleCreateContact = async (contactData: { name: string; email: string; phone?: string; company?: string; notes?: string; contact_type?: string }) => {
    try {
      const response = await contactsAPI.create(contactData)
      const newContactId = response.data.id
      if (selectedEmail && newContactId) {
        try {
          await communicationsAPI.linkToContact(selectedEmail.id.toString(), newContactId.toString())
        } catch (linkError) {
          console.error("Error linking email to contact:", linkError)
        }
      }
      await loadContacts()
      await loadEmails()
      setShowCreateContactDialog(false)
      alert("Contact created successfully!")
    } catch (error: any) {
      console.error("Error creating contact:", error)
      alert("Failed to create contact: " + (error.response?.data?.error || error.message))
    }
  }

  const handleCreateLead = async (leadData: { contact_id: number; source: string; status?: string; assigned_to?: string; notes?: string; value?: number }) => {
    try {
      await leadsAPI.create(leadData)
      await loadEmails()
      setShowCreateLeadDialog(false)
      alert("Lead created successfully!")
    } catch (error: any) {
      console.error("Error creating lead:", error)
      alert("Failed to create lead: " + (error.response?.data?.error || error.message))
    }
  }

  const handleCreateOpportunity = async (opportunityData: { title: string; contact_id: number; source: string; sub_source: string; assigned_to?: string; value?: number; currency?: string; notes?: string }) => {
    try {
      const response = await opportunitiesAPI.create(opportunityData)
      const newOpportunityId = response.data.id
      if (selectedEmail && newOpportunityId) {
        try {
          await communicationsAPI.linkToOpportunity(selectedEmail.id.toString(), newOpportunityId.toString())
        } catch (linkError) {
          console.error("Error linking email to opportunity:", linkError)
        }
      }
      await loadOpportunities()
      await loadEmails()
      setShowCreateOpportunityDialog(false)
      alert("Opportunity created successfully!")
    } catch (error: any) {
      console.error("Error creating opportunity:", error)
      alert("Failed to create opportunity: " + (error.response?.data?.error || error.message))
    }
  }

  const [showEmailModal, setShowEmailModal] = useState(false)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Listen for sidebar state changes
  useEffect(() => {
    const checkSidebarState = () => {
      const saved = localStorage.getItem("sidebar_collapsed")
      setSidebarCollapsed(saved === "true")
    }
    checkSidebarState()
    const interval = setInterval(checkSidebarState, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={`${sidebarCollapsed ? "ml-16" : "ml-64"} min-w-0 overflow-x-hidden`} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Inbox" subtitle="Manage your emails and CRM workflow" />
        <div className="p-4 sm:p-6 space-y-4 max-w-full overflow-x-hidden">
          {/* Analytics Panel */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.unread}</div>
                  <div className="text-sm text-muted-foreground">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.today}</div>
                  <div className="text-sm text-muted-foreground">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.thisWeek}</div>
                  <div className="text-sm text-muted-foreground">This Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.withOpportunities}</div>
                  <div className="text-sm text-muted-foreground">With Opportunities</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Toolbar */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search and Actions Row */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-2xl">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search emails..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-24"
                    />
                    <Select value={searchFilter} onValueChange={(v: any) => setSearchFilter(v)}>
                      <SelectTrigger className="absolute right-1 top-1/2 -translate-y-1/2 w-20 h-8 border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="sender">Sender</SelectItem>
                        <SelectItem value="subject">Subject</SelectItem>
                        <SelectItem value="body">Body</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSync}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReprocessEmails}
                      disabled={reprocessing}
                      title="Apply email rules to all emails"
                    >
                      {reprocessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Apply Rules
                        </>
                      )}
                    </Button>
                    {analytics.unread > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          markAllAsRead(emails.map(e => e.id))
                          setEmails([...emails])
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark All Read
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Filters:</span>
                  {(['unread', 'inbound', 'outbound', 'has_opportunity', 'has_contact', 'today', 'this_week'] as FilterType[]).map(filter => (
                    <button
                      key={filter}
                      onClick={() => toggleFilter(filter)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        activeFilters.includes(filter)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-secondary border-border'
                      }`}
                    >
                      {filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                  {activeFilters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveFilters([])}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Autosync Control */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={autosyncEnabled}
                      onCheckedChange={(enabled) => {
                        setAutosyncEnabledState(enabled)
                        setAutosyncEnabled(enabled)
                      }}
                      id="autosync"
                    />
                    <label htmlFor="autosync" className="text-sm font-medium cursor-pointer">
                      Autosync
                    </label>
                    {autosyncEnabled && (
                      <>
                        <Select
                          value={autosyncInterval.toString()}
                          onValueChange={(v) => {
                            const interval = parseInt(v, 10)
                            setAutosyncIntervalState(interval)
                            setAutosyncInterval(interval)
                          }}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60000">1 min</SelectItem>
                            <SelectItem value="300000">5 min</SelectItem>
                            <SelectItem value="600000">10 min</SelectItem>
                            <SelectItem value="900000">15 min</SelectItem>
                            <SelectItem value="1800000">30 min</SelectItem>
                            <SelectItem value="3600000">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                        {lastSyncTime && (
                          <span className="text-xs text-muted-foreground">
                            Last: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
                          </span>
                        )}
                        {nextSyncTime && (
                          <span className="text-xs text-muted-foreground">
                            Next: {formatDistanceToNow(nextSyncTime, { addSuffix: true })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {paginatedEmails.length} of {filteredEmails.length} emails
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions Bar */}
          {showBulkActions && selectedEmails.size > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleBulkMarkRead}>
                      Mark Read
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBulkMarkUnread}>
                      Mark Unread
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedEmails(new Set()); setShowBulkActions(false) }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email List - Full Width */}
          <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <InboxIcon className="h-5 w-5" />
                      Emails
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedEmails.size === paginatedEmails.length && paginatedEmails.length > 0}
                        onCheckedChange={selectAll}
                      />
                      <span className="text-xs text-muted-foreground">Select all</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : groupedEmails.length === 0 ? (
                    <div className="py-12 text-center">
                      <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground font-medium">No emails found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {searchQuery || activeFilters.length > 0
                          ? "Try adjusting your search or filters"
                          : "Sync your Outlook account to get started"}
                      </p>
                      {!searchQuery && activeFilters.length === 0 && (
                        <div className="mt-4 flex justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={handleSync}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync Emails
                          </Button>
                          <Link href="/email-sync">
                            <Button variant="outline" size="sm">
                              <Link2 className="mr-2 h-4 w-4" />
                              Connect Email
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {groupedEmails.map((group) => {
                        const email = group.latestEmail
                        const isSelected = selectedEmail?.id === email.id
                        const direction = getEmailDirection(email)
                        const contact = email.contact_id ? contacts[email.contact_id] : null
                        const opportunity = email.opportunity_id ? opportunities[email.opportunity_id] : null
                        const isUnread = !isEmailRead(email.id)
                        const isChecked = selectedEmails.has(email.id)

                        return (
                          <div
                            key={email.id}
                            className={`group grid grid-cols-12 gap-1 items-start px-2 py-2 rounded-lg border transition-colors cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : isUnread
                                ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                                : "border-border bg-card hover:bg-secondary"
                            }`}
                            onClick={() => {
                              setSelectedEmail(email)
                              setShowEmailModal(true)
                            }}
                          >
                            {/* Checkbox */}
                            <div className="col-span-1 flex items-center pt-1">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  toggleEmailSelection(email.id)
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* From & Direction */}
                            <div className="col-span-2 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                {isUnread && <Circle className="h-2 w-2 fill-primary text-primary shrink-0" />}
                                <p className={`font-semibold text-sm truncate ${isUnread ? "text-foreground" : "text-foreground"}`}>
                                  {contact?.name || email.from_email?.split('@')[0] || "Unknown"}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {direction === "inbound" ? "In" : "Out"}
                              </Badge>
                            </div>

                            {/* Subject & Snippet */}
                            <div className="col-span-5 min-w-0">
                              <p className={`font-semibold text-sm mb-1 truncate ${isUnread ? "text-foreground" : "text-foreground"}`}>
                                {email.subject || "(No Subject)"}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {email.body?.substring(0, 150) || "No preview"}
                              </p>
                            </div>

                            {/* CRM Badges */}
                            <div className="col-span-2 flex flex-wrap gap-1">
                              {contact && (
                                <Badge variant="secondary" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  Contact
                                </Badge>
                              )}
                              {opportunity && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  Opp
                                </Badge>
                              )}
                              {group.emails.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {group.emails.length}
                                </Badge>
                              )}
                            </div>

                            {/* Age */}
                            <div className="col-span-1 text-xs text-muted-foreground text-right">
                              {formatDistanceToNow(new Date(email.occurred_at), { addSuffix: true })}
                            </div>

                            {/* Actions - Vertical */}
                            <div className="col-span-1 flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!email.contact_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedEmail(email)
                                    setShowCreateContactDialog(true)
                                  }}
                                  title="Create Contact"
                                >
                                  <UserPlus className="h-3 w-3" />
                                </Button>
                              )}
                              {email.contact_id && !email.opportunity_id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedEmail(email)
                                      setShowCreateLeadDialog(true)
                                    }}
                                    title="Create Lead"
                                  >
                                    <User className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedEmail(email)
                                      setShowCreateOpportunityDialog(true)
                                    }}
                                    title="Create Opportunity"
                                  >
                                    <Briefcase className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

          {/* Email Detail Modal */}
          {showEmailModal && selectedEmail && (
            <EmailDetailModal
              email={selectedEmail}
              contacts={contacts}
              opportunities={opportunities}
              isRead={isEmailRead(selectedEmail.id)}
              onClose={() => {
                setShowEmailModal(false)
                setSelectedEmail(null)
              }}
              onMarkRead={() => {
                markEmailAsRead(selectedEmail.id)
                setEmails([...emails])
              }}
              onMarkUnread={() => {
                markEmailAsUnread(selectedEmail.id)
                setEmails([...emails])
              }}
              onCreateContact={() => {
                setShowCreateContactDialog(true)
              }}
              onCreateLead={() => {
                setShowCreateLeadDialog(true)
              }}
              onCreateOpportunity={() => {
                setShowCreateOpportunityDialog(true)
              }}
              onReplySent={() => {
                loadEmails()
              }}
            />
          )}
        </div>
      </main>

      {/* Dialogs */}
      {showCreateContactDialog && selectedEmail && (
        <CreateContactFromEmailDialog
          open={showCreateContactDialog}
          onOpenChange={setShowCreateContactDialog}
          email={selectedEmail}
          onSave={handleCreateContact}
        />
      )}

      {showCreateLeadDialog && selectedEmail && (
        <CreateLeadFromEmailDialog
          open={showCreateLeadDialog}
          onOpenChange={setShowCreateLeadDialog}
          email={selectedEmail}
          contactId={selectedEmail.contact_id}
          onSave={handleCreateLead}
        />
      )}

      {showCreateOpportunityDialog && selectedEmail && (
        <CreateOpportunityFromEmailDialog
          open={showCreateOpportunityDialog}
          onOpenChange={setShowCreateOpportunityDialog}
          email={selectedEmail}
          contactId={selectedEmail.contact_id}
          onSave={handleCreateOpportunity}
        />
      )}
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" />
        <main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center">
          <div className="text-muted-foreground">Loading inbox...</div>
        </main>
      </div>
    }>
      <InboxContent />
    </Suspense>
  )
}

// Email Detail Modal Component
function EmailDetailModal({
  email,
  contacts,
  opportunities,
  isRead,
  onClose,
  onMarkRead,
  onMarkUnread,
  onCreateContact,
  onCreateLead,
  onCreateOpportunity,
}: {
  email: Email
  contacts: Record<string, Contact>
  opportunities: Record<string, Opportunity>
  isRead: boolean
  onClose: () => void
  onMarkRead: () => void
  onMarkUnread: () => void
  onCreateContact: () => void
  onCreateLead: () => void
  onCreateOpportunity: () => void
  onReplySent?: () => void
}) {
  const [conversationEmails, setConversationEmails] = useState<Email[]>([])
  const [loadingConversation, setLoadingConversation] = useState(true)
  const [showReplyDialog, setShowReplyDialog] = useState(false)
  const [replyTo, setReplyTo] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const contact = email.contact_id ? contacts[email.contact_id] : null
  const opportunity = email.opportunity_id ? opportunities[email.opportunity_id] : null

  useEffect(() => {
    const loadConversation = async () => {
      if (!email.conversation_id) {
        // No conversation_id, just show this single email
        setConversationEmails([email])
        setLoadingConversation(false)
        return
      }

      try {
        setLoadingConversation(true)
        const response = await emailsAPI.getAll({ conversation_id: email.conversation_id })
        const conversationEmails = response.data || []
        // Sort by date (oldest first, like traditional email clients)
        conversationEmails.sort((a: Email, b: Email) => 
          new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
        )
        setConversationEmails(conversationEmails.length > 0 ? conversationEmails : [email])
      } catch (error) {
        console.error("Error loading conversation:", error)
        // Fallback to single email if error
        setConversationEmails([email])
      } finally {
        setLoadingConversation(false)
      }
    }

    loadConversation()
  }, [email.id, email.conversation_id])

  const getEmailDirection = (email: Email) => {
    // Simple heuristic - in a real app, you'd compare with user's email
    return email.from_email.includes("@") ? "inbound" : "outbound"
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {!isRead && (
                <Circle className="h-2 w-2 fill-primary text-primary shrink-0 mt-2" />
              )}
              <DialogTitle className="text-lg truncate">{email.subject || "(No Subject)"}</DialogTitle>
              {conversationEmails.length > 1 && (
                <Badge variant="outline" className="ml-2">
                  {conversationEmails.length} {conversationEmails.length === 1 ? 'message' : 'messages'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={isRead ? onMarkUnread : onMarkRead}
                title={isRead ? "Mark as unread" : "Mark as read"}
              >
                {isRead ? (
                  <MailOpen className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loadingConversation ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-0">
            {/* Action Buttons - Show once at top */}
            <div className="flex flex-wrap gap-2 pb-4 border-b mb-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const replyToEmail = email.from_email
                  const replySubjectText = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || '(No Subject)'}`
                  setReplyTo(replyToEmail)
                  setReplySubject(replySubjectText)
                  setReplyBody(`\n\n--- Original Message ---\nFrom: ${email.from_email}\nDate: ${format(new Date(email.occurred_at), "PPpp")}\n\n${email.body || ''}`)
                  setShowReplyDialog(true)
                }}
                className="min-w-[120px]"
              >
                <Mail className="mr-2 h-4 w-4" />
                Reply
              </Button>
              {!email.contact_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateContact}
                  className="flex-1 min-w-[140px]"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Contact
                </Button>
              )}
              {email.contact_id && !email.opportunity_id && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateLead}
                    className="flex-1 min-w-[140px]"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Send to Lead
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateOpportunity}
                    className="flex-1 min-w-[140px]"
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Send to Opportunity
                  </Button>
                </>
              )}
            </div>

            {/* Conversation Thread */}
            <div className="space-y-0">
              {conversationEmails.map((threadEmail, index) => {
                const isSelected = threadEmail.id === email.id
                const direction = getEmailDirection(threadEmail)
                const threadContact = threadEmail.contact_id ? contacts[threadEmail.contact_id] : null
                const isLast = index === conversationEmails.length - 1

                return (
                  <div
                    key={threadEmail.id}
                    className={`border-l-2 ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    } pl-4 pb-6 ${!isLast ? 'mb-6 border-b' : ''}`}
                  >
                    {/* Email Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {threadEmail.from_email}
                          </p>
                          {direction === 'inbound' ? (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 text-xs">
                              Inbound
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-500 text-xs">
                              Outbound
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>To: {threadEmail.to_email || '(No recipient)'}</span>
                          <span>{format(new Date(threadEmail.occurred_at), "PPpp")}</span>
                        </div>
                        {threadContact && (
                          <div className="mt-1">
                            <Link
                              href={`/contacts`}
                              className="text-xs text-primary hover:underline"
                            >
                              Contact: {threadContact.name}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Body */}
                    <div className="prose prose-sm max-w-none text-sm text-foreground bg-card rounded-lg p-4 border min-h-[100px]">
                      {threadEmail.body ? (
                        <div 
                          className="email-body-content break-words"
                          dangerouslySetInnerHTML={{ __html: threadEmail.body }}
                          style={{ 
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            maxWidth: '100%',
                            overflow: 'auto'
                          }}
                        />
                      ) : (
                        <div className="text-muted-foreground italic">No content available</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog - Separate dialog outside main dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reply to Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="reply-to">To</Label>
                <Input
                  id="reply-to"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reply-subject">Subject</Label>
                <Input
                  id="reply-subject"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reply-body">Message</Label>
                <Textarea
                  id="reply-body"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="mt-1 min-h-[300px]"
                  placeholder="Type your reply here..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplyDialog(false)
                  setReplyTo('')
                  setReplySubject('')
                  setReplyBody('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!replyTo || !replyBody.trim()) {
                    alert('Please fill in the recipient and message')
                    return
                  }
                  try {
                    setSendingReply(true)
                    await emailsAPI.sendReply({
                      to: replyTo,
                      subject: replySubject,
                      body: replyBody,
                      inReplyTo: email.message_id || email.external_id,
                      conversationId: email.conversation_id
                    })
                    alert('Reply sent successfully!')
                    setShowReplyDialog(false)
                    setReplyTo('')
                    setReplySubject('')
                    setReplyBody('')
                    // Reload emails to show the sent reply
                    onReplySent?.()
                    // Also reload the conversation
                    if (email.conversation_id) {
                      const response = await emailsAPI.getAll({ conversation_id: email.conversation_id })
                      const conversationEmails = response.data || []
                      conversationEmails.sort((a: Email, b: Email) => 
                        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
                      )
                      setConversationEmails(conversationEmails.length > 0 ? conversationEmails : [email])
                    }
                  } catch (error: any) {
                    console.error('Error sending reply:', error)
                    alert('Failed to send reply: ' + (error.response?.data?.error || error.message))
                  } finally {
                    setSendingReply(false)
                  }
                }}
                disabled={sendingReply}
              >
                {sendingReply ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reply
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  )
}

// Dialog Components (same as before)
function CreateContactFromEmailDialog({ open, onOpenChange, email, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; email: Email; onSave: (data: any) => void }) {
  const [name, setName] = useState(email.from_email?.split('@')[0] || email.contact_name || '')
  const [emailAddress, setEmailAddress] = useState(email.from_email || '')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState(`Created from email: ${email.subject || '(No Subject)'}`)
  const [contactType, setContactType] = useState<"Agent" | "Direct" | "Other" | "Spam" | "Internal">("Other")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, email: emailAddress, phone: phone || undefined, company: company || undefined, notes: notes || undefined, contact_type: contactType })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Contact from Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email *</label>
              <Input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Company</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type *</label>
              <Select value={contactType} onValueChange={(value: "Agent" | "Direct" | "Other" | "Spam" | "Internal") => setContactType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Spam">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Contact</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function CreateLeadFromEmailDialog({ open, onOpenChange, email, contactId, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; email: Email; contactId: number | null; onSave: (data: any) => void }) {
  const [source, setSource] = useState('email')
  const [status, setStatus] = useState('new')
  const [assignedTo, setAssignedTo] = useState('me')
  const [notes, setNotes] = useState(`Created from email: ${email.subject || '(No Subject)'}`)
  const [value, setValue] = useState('')

  if (!open || !contactId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      contact_id: contactId,
      source,
      status,
      assigned_to: assignedTo,
      notes: notes || undefined,
      value: value ? parseFloat(value) : undefined
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Lead from Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Source *</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="webform">Webform</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                  <SelectItem value="previous_enquiry">Previous Enquiry</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status *</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Assigned To</label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="linda">Linda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Value</label>
              <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Lead</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function CreateOpportunityFromEmailDialog({ open, onOpenChange, email, contactId, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; email: Email; contactId: number | null; onSave: (data: any) => void }) {
  const [title, setTitle] = useState(email.subject || 'New Opportunity')
  const [source, setSource] = useState('email')
  const [subSource, setSubSource] = useState('Email Enquiry')
  const [assignedTo, setAssignedTo] = useState('me')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [notes, setNotes] = useState(`Created from email: ${email.subject || '(No Subject)'}`)

  if (!open || !contactId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      title,
      contact_id: contactId,
      source,
      sub_source: subSource,
      assigned_to: assignedTo,
      value: value ? parseFloat(value) : undefined,
      currency,
      notes: notes || undefined
    })
  }

  const getSubSources = () => {
    switch (source) {
      case 'email':
        return ['Email Enquiry', 'Email Follow-up', 'Email Referral']
      case 'webform':
        return ['Website Form', 'Website Form – Special Offer', 'Contact Form', 'Booking Form']
      case 'social':
        return ['Facebook DM', 'Instagram DM', 'LinkedIn InMail', 'Facebook Lead Form', 'Instagram Lead Form']
      case 'cold_outreach':
        return ['Phone – Outbound', 'Email – Outbound', 'LinkedIn – Outbound']
      case 'previous_enquiry':
        return ['Reactivation', 'Follow-up', 'Return Enquiry']
      case 'forwarded':
        return ['Email Forward', 'Referral', 'Internal Transfer']
      default:
        return ['Other']
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Opportunity from Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Source *</label>
              <Select value={source} onValueChange={(val) => { setSource(val); setSubSource(getSubSources()[0]) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="webform">Webform</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                  <SelectItem value="previous_enquiry">Previous Enquiry</SelectItem>
                  <SelectItem value="previous_client">Previous Client</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sub-Source *</label>
              <Select value={subSource} onValueChange={setSubSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSubSources().map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Assigned To</label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="linda">Linda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Value</label>
                <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Opportunity</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
