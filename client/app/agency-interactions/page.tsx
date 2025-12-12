"use client"


export const dynamic = 'force-dynamic'
import { useEffect, useState , Suspense} from "react"
import { format } from "date-fns"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { agencyInteractionsAPI, contactsAPI, opportunitiesAPI } from "@/lib/api"
import { Plus, Search, Phone, MessageSquare, FileText, Video, Edit, Trash2, Building2 } from "lucide-react"
import { AgencyInteractionDialog } from "@/components/agency-interaction-dialog"

interface AgencyInteraction {
  id: number
  type: string
  description: string
  direction: string
  user: string
  platform?: string
  platform_thread_url?: string
  call_duration?: number
  call_outcome?: string
  created_at: string
  contact_id: number
  contact_name: string
  contact_email: string
  contact_company?: string
  opportunity_id?: number
  opportunity_title?: string
}

interface Contact {
  id: number
  name: string
  email: string
  company?: string
}

function AgencyInteractionsPageContent() {
  const [interactions, setInteractions] = useState<AgencyInteraction[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showDialog, setShowDialog] = useState(false)
  const [editingInteraction, setEditingInteraction] = useState<AgencyInteraction | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved !== null) {
      setSidebarCollapsed(saved === "true")
    }
    const handleStorageChange = () => {
      const updated = localStorage.getItem("sidebar_collapsed")
      if (updated !== null) {
        setSidebarCollapsed(updated === "true")
      }
    }
    window.addEventListener("storage", handleStorageChange)
    const interval = setInterval(handleStorageChange, 500)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const loadInteractions = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 500 }
      if (typeFilter !== "all") {
        params.type = typeFilter
      }
      const response = await agencyInteractionsAPI.getAll(params)
      setInteractions(response.data || [])
    } catch (error) {
      console.error("Error loading interactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getAll()
      const agentContacts = (response.data || []).filter(
        (c: any) => c.contact_type === "Agent"
      )
      setContacts(agentContacts)
    } catch (error) {
      console.error("Error loading contacts:", error)
    }
  }

  useEffect(() => {
    loadInteractions()
    loadContacts()
  }, [typeFilter])

  const filteredInteractions = interactions.filter((interaction) => {
    const matchesSearch =
      searchQuery === "" ||
      interaction.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interaction.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interaction.contact_company?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "teams_message":
      case "teams_call":
        return <Video className="h-4 w-4" />
      case "call_made":
      case "call_received":
        return <Phone className="h-4 w-4" />
      case "written_communication":
      case "email_sent":
      case "email_received":
        return <FileText className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getInteractionTypeLabel = (type: string) => {
    switch (type) {
      case "teams_message":
        return "Teams Message"
      case "teams_call":
        return "Teams Call"
      case "call_made":
        return "Phone Call (Outbound)"
      case "call_received":
        return "Phone Call (Inbound)"
      case "written_communication":
        return "Written Communication"
      case "email_sent":
        return "Email Sent"
      case "email_received":
        return "Email Received"
      default:
        return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  const getDirectionBadge = (direction: string) => {
    return direction === "inbound" ? (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
        Inbound
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
        Outbound
      </Badge>
    )
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this interaction?")) {
      return
    }
    try {
      await agencyInteractionsAPI.delete(id.toString())
      await loadInteractions()
    } catch (error) {
      console.error("Error deleting interaction:", error)
      alert("Failed to delete interaction")
    }
  }

  const handleEdit = (interaction: AgencyInteraction) => {
    setEditingInteraction(interaction)
    setShowDialog(true)
  }

  const handleDialogClose = () => {
    setShowDialog(false)
    setEditingInteraction(null)
  }

  const handleSave = async () => {
    await loadInteractions()
    handleDialogClose()
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={`${sidebarCollapsed ? "ml-16" : "ml-64"} min-w-0 overflow-x-hidden`} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Agency Interactions" subtitle="Track all interactions with agency contacts" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Filters and Actions */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-4 min-w-0">
              <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search interactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-secondary pl-10 w-full"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-secondary flex-shrink-0">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="teams_message">Teams Messages</SelectItem>
                  <SelectItem value="teams_call">Teams Calls</SelectItem>
                  <SelectItem value="call_made">Phone Calls (Outbound)</SelectItem>
                  <SelectItem value="call_received">Phone Calls (Inbound)</SelectItem>
                  <SelectItem value="written_communication">Written Communications</SelectItem>
                  <SelectItem value="email_sent">Emails Sent</SelectItem>
                  <SelectItem value="email_received">Emails Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowDialog(true)} className="whitespace-nowrap flex-shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Log Interaction
            </Button>
          </div>

          {/* Interactions Table */}
          <div className="rounded-xl border border-border bg-card w-full overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[1100px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground min-w-[140px]">Date</TableHead>
                    <TableHead className="text-muted-foreground min-w-[150px]">Contact</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Type</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Direction</TableHead>
                    <TableHead className="text-muted-foreground min-w-[200px]">Description</TableHead>
                    <TableHead className="text-muted-foreground min-w-[80px]">Duration</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Outcome</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">User</TableHead>
                    <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Loading interactions...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredInteractions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No interactions found. Log your first agency interaction to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInteractions.map((interaction) => (
                      <TableRow key={interaction.id}>
                        <TableCell className="text-muted-foreground min-w-[140px] whitespace-nowrap">
                          {format(new Date(interaction.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="min-w-[150px] max-w-[200px]">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate" title={interaction.contact_name}>{interaction.contact_name}</div>
                            <div className="text-sm text-muted-foreground truncate" title={interaction.contact_email}>{interaction.contact_email}</div>
                            {interaction.contact_company && (
                              <div className="text-xs text-muted-foreground truncate" title={interaction.contact_company}>{interaction.contact_company}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            {getInteractionIcon(interaction.type)}
                            <span className="text-sm whitespace-nowrap">{getInteractionTypeLabel(interaction.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[100px]">{getDirectionBadge(interaction.direction)}</TableCell>
                        <TableCell className="min-w-[200px] max-w-[300px]">
                          <div className="truncate text-sm" title={interaction.description}>{interaction.description}</div>
                          {interaction.opportunity_title && (
                            <div className="text-xs text-muted-foreground mt-1 truncate" title={interaction.opportunity_title}>
                              Opportunity: {interaction.opportunity_title}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[80px] whitespace-nowrap">
                          {interaction.call_duration
                            ? `${Math.floor(interaction.call_duration / 60)}:${String(interaction.call_duration % 60).padStart(2, "0")}`
                            : "-"}
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          {interaction.call_outcome ? (
                            <Badge variant="outline" className="whitespace-nowrap">{interaction.call_outcome}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground min-w-[100px] whitespace-nowrap">{interaction.user}</TableCell>
                        <TableCell className="w-[100px]">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(interaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(interaction.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      <AgencyInteractionDialog
        open={showDialog}
        onOpenChange={handleDialogClose}
        existingInteraction={editingInteraction || undefined}
        contacts={contacts}
        onSave={handleSave}
      />
    </div>
  )
}




export default function AgencyInteractionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" /><main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></main></div>}>
      <AgencyInteractionsPageContent />
    </Suspense>
  )
}