"use client"

import { useEffect, useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LeadFormDialog } from "@/components/lead-form-dialog"
import { LeadActionsDropdown } from "@/components/lead-actions-dropdown"
import { getLeads, getContacts } from "@/lib/store-api"
import type { Lead, Contact, LeadSource, LeadStatus } from "@/lib/types"
import { Search, Plus, Filter, Mail } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { LeadSourceBadge, LeadStatusBadge } from "@/components/lead-badges"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { emailsAPI, activitiesAPI } from "@/lib/api"

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSource, setFilterSource] = useState<LeadSource | "all">("all")
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all")
  const [filterAssigned, setFilterAssigned] = useState<"linda" | "James" | "all">("all")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showConversationModal, setShowConversationModal] = useState(false)
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null)
  const [conversationEmails, setConversationEmails] = useState<any[]>([])
  const [allCommunications, setAllCommunications] = useState<any[]>([])
  const [loadingConversation, setLoadingConversation] = useState(false)

  useEffect(() => {
    const checkSidebarState = () => {
      const saved = localStorage.getItem("sidebar_collapsed")
      setSidebarCollapsed(saved === "true")
    }
    checkSidebarState()
    window.addEventListener("storage", checkSidebarState)
    const handleSidebarToggle = () => checkSidebarState()
    window.addEventListener("sidebarToggle", handleSidebarToggle)
    const interval = setInterval(checkSidebarState, 100)
    return () => {
      window.removeEventListener("storage", checkSidebarState)
      window.removeEventListener("sidebarToggle", handleSidebarToggle)
      clearInterval(interval)
    }
  }, [])

  const loadData = async () => {
    const [leadsData, contactsData] = await Promise.all([getLeads(), getContacts()])
    setLeads(leadsData)
    const contactsMap: Record<string, Contact> = {}
    contactsData.forEach((c) => {
      contactsMap[c.id] = c
    })
    setContacts(contactsMap)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Load conversation and communications when modal opens
  useEffect(() => {
    if (showConversationModal && selectedLeadForModal?.conversationId) {
      const loadConversationData = async () => {
        setLoadingConversation(true)
        try {
          // Load emails from conversation
          const emailsResponse = await emailsAPI.getAll({ 
            conversation_id: selectedLeadForModal.conversationId,
            limit: 1000 
          })
          const emails = emailsResponse.data || []
          emails.sort((a: any, b: any) => 
            new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
          )
          setConversationEmails(emails)

          // Load all activities/communications for this contact
          const activitiesResponse = await activitiesAPI.getAll({ 
            contactId: selectedLeadForModal.contactId,
            limit: 1000
          })
          const activities = activitiesResponse.data || []
          activities.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setAllCommunications(activities)
        } catch (error) {
          console.error("Error loading conversation data:", error)
        } finally {
          setLoadingConversation(false)
        }
      }
      loadConversationData()
    } else {
      setConversationEmails([])
      setAllCommunications([])
    }
  }, [showConversationModal, selectedLeadForModal])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const contact = contacts[lead.contactId]
      const matchesSearch =
        searchQuery === "" ||
        contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSource = filterSource === "all" || lead.source === filterSource
      const matchesStatus = filterStatus === "all" || lead.status === filterStatus
      const matchesAssigned = filterAssigned === "all" || lead.assignedTo === filterAssigned
      return matchesSearch && matchesSource && matchesStatus && matchesAssigned
    })
  }, [leads, contacts, searchQuery, filterSource, filterStatus, filterAssigned])

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setShowAddDialog(true)
  }

  const handleDelete = async (leadId: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      // TODO: Implement delete
      await loadData()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={`${sidebarCollapsed ? "ml-16" : "ml-64"} min-w-0 overflow-x-hidden`} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Leads" subtitle="Manage your sales leads" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4">
            <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10 w-full"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v as LeadSource | "all")}>
                <SelectTrigger className="w-full sm:w-[140px] bg-secondary">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="webform">Webform</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="previous_enquiry">Previous Enquiry</SelectItem>
                  <SelectItem value="previous_client">Previous Client</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as LeadStatus | "all")}>
                <SelectTrigger className="w-full sm:w-[130px] bg-secondary">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAssigned} onValueChange={(v) => setFilterAssigned(v as "linda" | "James" | "all")}>
                <SelectTrigger className="w-full sm:w-[120px] bg-secondary">
                  <SelectValue placeholder="Assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="linda">Linda</SelectItem>
                  <SelectItem value="James">James</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                setEditingLead(null)
                setShowAddDialog(true)
              }}
              className="whitespace-nowrap flex-shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </div>

          {/* Leads Table */}
          <div className="rounded-xl border border-border bg-card w-full overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[1200px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground min-w-[200px]">Contact</TableHead>
                    <TableHead className="text-muted-foreground min-w-[150px]">Client Name</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Source</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Status</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Assigned</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Value</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Created</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Last Contact</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Notes</TableHead>
                    <TableHead className="text-muted-foreground w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No leads found. Add your first lead to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => {
                      const contact = contacts[lead.contactId]
                      if (!contact) return null
                      return (
                        <TableRow key={lead.id}>
                          <TableCell className="min-w-[200px] max-w-[250px]">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate" title={contact.name}>{contact.name}</p>
                              <p className="text-sm text-muted-foreground truncate" title={contact.email}>{contact.email}</p>
                              {contact.company && <p className="text-xs text-muted-foreground truncate" title={contact.company}>{contact.company}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[150px] max-w-[200px]">
                            {lead.clientName ? (
                              <p className="font-medium text-foreground truncate" title={lead.clientName}>
                                {lead.clientName}
                              </p>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <LeadSourceBadge source={lead.source} />
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <LeadStatusBadge status={lead.status} />
                          </TableCell>
                          <TableCell className="capitalize text-foreground min-w-[100px] whitespace-nowrap">
                            {lead.assignedTo === "James" ? "James" : lead.assignedTo === "linda" ? "Linda" : lead.assignedTo}
                          </TableCell>
                          <TableCell className="text-foreground min-w-[100px] whitespace-nowrap">
                            {lead.value ? `$${lead.value.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground min-w-[120px] whitespace-nowrap">
                            {format(new Date(lead.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-muted-foreground min-w-[120px] whitespace-nowrap">
                            {lead.lastContactedAt
                              ? formatDistanceToNow(new Date(lead.lastContactedAt), { addSuffix: true })
                              : "Never"}
                          </TableCell>
                          <TableCell className="min-w-[100px] max-w-[200px]">
                            {lead.notes ? (
                              <p className="text-sm text-muted-foreground truncate" title={lead.notes}>
                                {lead.notes}
                              </p>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="w-[120px]">
                            <div className="flex items-center gap-2">
                              {lead.conversationId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="View conversation and communications"
                                  onClick={() => {
                                    setSelectedLeadForModal(lead)
                                    setShowConversationModal(true)
                                  }}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                              <LeadActionsDropdown
                                lead={lead}
                                contact={contact}
                                onEdit={() => handleEdit(lead)}
                                onDelete={() => handleDelete(lead.id)}
                                onRefresh={loadData}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      <LeadFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingLead={editingLead || undefined}
        existingContact={editingLead ? contacts[editingLead.contactId] : undefined}
        onSave={loadData}
      />

      {/* Conversation and Communications Modal */}
      {selectedLeadForModal && (
        <Dialog open={showConversationModal} onOpenChange={setShowConversationModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
            <DialogHeader>
              <DialogTitle>Conversation & Communications</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="conversation" className="w-full">
              <TabsList>
                <TabsTrigger value="conversation">Email Conversation</TabsTrigger>
                <TabsTrigger value="communications">All Communications</TabsTrigger>
              </TabsList>
              <TabsContent value="conversation" className="mt-4">
                {loadingConversation ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : conversationEmails.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No emails found for this conversation.</p>
                ) : (
                  <div className="space-y-4">
                    {conversationEmails.map((email: any) => (
                      <div key={email.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">{email.from_email}</p>
                            <p className="text-sm text-muted-foreground">{email.subject || "(No Subject)"}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(email.occurred_at), "PPpp")}</p>
                          </div>
                        </div>
                        <div className="mt-3 prose prose-sm max-w-none">
                          <div 
                            className="text-sm whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: email.body || "No content" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="communications" className="mt-4">
                {loadingConversation ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : allCommunications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No communications found for this lead.</p>
                ) : (
                  <div className="space-y-4">
                    {allCommunications.map((comm: any) => (
                      <div key={comm.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold capitalize">{comm.type?.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">{comm.description}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(comm.created_at), "PPpp")}</p>
                            {comm.user && (
                              <p className="text-xs text-muted-foreground mt-1">By: {comm.user}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
