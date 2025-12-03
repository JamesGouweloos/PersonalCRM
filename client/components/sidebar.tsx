"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, UserPlus, Mail, Calendar, BarChart3, Settings, Briefcase, XCircle, Inbox, Link2, ChevronLeft, ChevronRight, ChevronDown, Building2, UserCheck, Shield, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const contactTypeFilter = searchParams.get('type') || 'all'
  const isInboxPage = pathname === "/inbox"
  
  // Auto-expand inbox dropdown when on inbox page
  const [inboxExpanded, setInboxExpanded] = useState(isInboxPage)
  
  useEffect(() => {
    if (isInboxPage) {
      setInboxExpanded(true)
    }
  }, [isInboxPage])

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar_collapsed", String(newState))
  }

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Opportunities", href: "/opportunities", icon: Briefcase },
    { name: "Leads", href: "/leads", icon: UserPlus },
    { name: "Not Interested", href: "/not-interested", icon: XCircle },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Follow-ups", href: "/follow-ups", icon: Calendar },
    { name: "Email Rules", href: "/email-rules", icon: Mail },
    { name: "Templates", href: "/templates", icon: Mail },
    { name: "Email Sync", href: "/email-sync", icon: Link2 },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
  ]

  const inboxFilters = [
    { name: "All Emails", href: "/inbox", type: "all", icon: Inbox },
    { name: "Agency", href: "/inbox?type=Agent", type: "Agent", icon: Building2 },
    { name: "Direct Business", href: "/inbox?type=Direct", type: "Direct", icon: UserCheck },
    { name: "Internal", href: "/inbox?type=Internal", type: "Internal", icon: Shield },
    { name: "Other", href: "/inbox?type=Other", type: "Other", icon: Users },
    { name: "Spam", href: "/inbox?type=Spam", type: "Spam", icon: Ban },
  ]

  useEffect(() => {
    // Fetch current emails from API and count only unread emails that actually exist
    const checkUnreadCount = async () => {
      try {
        // Import emailsAPI dynamically to avoid circular dependencies
        const { emailsAPI } = await import("@/lib/api")
        const { getEmailReadStatus } = await import("@/lib/email-status")
        
        // Get all emails (or at least a reasonable limit)
        const response = await emailsAPI.getAll({ limit: 1000 })
        const emails = response.data || []
        
        if (emails.length === 0) {
          setUnreadCount(0)
          return
        }
        
        // Get read status from localStorage
        const status = getEmailReadStatus()
        
        // Count only unread emails that exist in the current inbox
        const unread = emails.filter((email: any) => {
          const emailId = email.id.toString()
          return !status[emailId]?.read
        }).length
        
        setUnreadCount(unread)
      } catch (error) {
        console.error("Error checking unread count:", error)
        // Fallback to localStorage count if API fails
        try {
          const status = localStorage.getItem("crm_email_read_status")
          if (status) {
            const emailStatus = JSON.parse(status)
            const unread = Object.values(emailStatus).filter((s: any) => !s.read).length
            setUnreadCount(unread)
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }

    checkUnreadCount()
    // Check periodically
    const interval = setInterval(checkUnreadCount, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          {!isCollapsed && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">CRM</span>
              </div>
              <span className="text-lg font-semibold text-foreground">Sales CRM</span>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {/* Inbox with Collapsible Dropdown */}
          <div>
            <button
              onClick={() => !isCollapsed && setInboxExpanded(!inboxExpanded)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                isInboxPage
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Inbox" : undefined}
            >
              <Inbox className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Inbox</span>
                  {unreadCount > 0 && (
                    <span className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                      isInboxPage
                        ? "bg-primary-foreground text-primary"
                        : "bg-primary text-primary-foreground"
                    )}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    inboxExpanded && "rotate-180"
                  )} />
                </>
              )}
              {isCollapsed && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            
            {/* Collapsible Inbox Filters */}
            {!isCollapsed && inboxExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
                {inboxFilters.map((filter) => {
                  const isActive = isInboxPage && contactTypeFilter === filter.type
                  return (
                    <Link
                      key={filter.type}
                      href={filter.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <filter.icon className="h-4 w-4 shrink-0" />
                      <span>{filter.name}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Other Navigation Items */}
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="flex-1">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className={cn("absolute bottom-4", isCollapsed ? "left-2 right-2" : "left-4 right-4")}>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
