"use client"

import { useEffect, useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LeadSourceBadge } from "@/components/lead-source-badge"
import { LeadStatusBadge } from "@/components/lead-status-badge"
import { LeadFormDialog } from "@/components/lead-form-dialog"
import { LeadActionsDropdown } from "@/components/lead-actions-dropdown"
import { getLeads, getContacts, deleteLead } from "@/lib/store"
import type { Lead, Contact, LeadSource, LeadStatus } from "@/lib/types"
import { Plus, Search, Filter } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSource, setFilterSource] = useState<LeadSource | "all">("all")
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all")
  const [filterAssigned, setFilterAssigned] = useState<"linda" | "me" | "all">("all")

  const loadData = () => {
    const leadsData = getLeads()
    const contactsData = getContacts()
    setLeads(leadsData)
    setContacts(
      contactsData.reduce(
        (acc, contact) => {
          acc[contact.id] = contact
          return acc
        },
        {} as Record<string, Contact>,
      ),
    )
  }

  useEffect(() => {
    loadData()
    window.addEventListener("storage", loadData)
    return () => window.removeEventListener("storage", loadData)
  }, [])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const contact = contacts[lead.contactId]
      const matchesSearch =
        !searchQuery ||
        contact?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact?.company?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSource = filterSource === "all" || lead.source === filterSource
      const matchesStatus = filterStatus === "all" || lead.status === filterStatus
      const matchesAssigned = filterAssigned === "all" || lead.assignedTo === filterAssigned
      return matchesSearch && matchesSource && matchesStatus && matchesAssigned
    })
  }, [leads, contacts, searchQuery, filterSource, filterStatus, filterAssigned])

  const handleDelete = (leadId: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteLead(leadId)
      loadData()
    }
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setShowAddDialog(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64">
        <Header title="Leads" subtitle="Manage your sales leads" />
        <div className="p-6">
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v as LeadSource | "all")}>
                <SelectTrigger className="w-[140px] bg-secondary">
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
                <SelectTrigger className="w-[130px] bg-secondary">
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
              <Select value={filterAssigned} onValueChange={(v) => setFilterAssigned(v as "linda" | "me" | "all")}>
                <SelectTrigger className="w-[120px] bg-secondary">
                  <SelectValue placeholder="Assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="linda">Linda</SelectItem>
                  <SelectItem value="me">Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                setEditingLead(null)
                setShowAddDialog(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </div>

          {/* Leads Table */}
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-muted-foreground">Source</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Assigned</TableHead>
                  <TableHead className="text-muted-foreground">Value</TableHead>
                  <TableHead className="text-muted-foreground">Last Contact</TableHead>
                  <TableHead className="text-muted-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leads found. Add your first lead to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const contact = contacts[lead.contactId]
                    if (!contact) return null
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                            {contact.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <LeadSourceBadge source={lead.source} />
                        </TableCell>
                        <TableCell>
                          <LeadStatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell className="capitalize text-foreground">
                          {lead.assignedTo === "me" ? "Me" : "Linda"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {lead.value ? `$${lead.value.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead.lastContactedAt
                            ? formatDistanceToNow(new Date(lead.lastContactedAt), { addSuffix: true })
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <LeadActionsDropdown
                            lead={lead}
                            contact={contact}
                            onEdit={() => handleEdit(lead)}
                            onDelete={() => handleDelete(lead.id)}
                            onRefresh={loadData}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
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
    </div>
  )
}
