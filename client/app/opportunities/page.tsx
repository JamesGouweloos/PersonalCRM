"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { OpportunityFormDialog } from "@/components/opportunity-form-dialog"
import { getOpportunities, getContacts, deleteOpportunity } from "@/lib/store"
import type { Opportunity, Contact, OpportunitySource, OpportunityStatus } from "@/lib/types"
import { Plus, Search, Filter, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

const STATUS_COLORS: Record<OpportunityStatus, string> = {
  open: "bg-blue-500/10 text-blue-500",
  won: "bg-green-500/10 text-green-500",
  lost: "bg-gray-500/10 text-gray-500",
  reversed: "bg-orange-500/10 text-orange-500",
}

const SOURCE_COLORS: Record<OpportunitySource, string> = {
  webform: "bg-purple-500/10 text-purple-500",
  cold_outreach: "bg-yellow-500/10 text-yellow-500",
  social: "bg-pink-500/10 text-pink-500",
  previous_enquiry: "bg-cyan-500/10 text-cyan-500",
  previous_client: "bg-emerald-500/10 text-emerald-500",
  forwarded: "bg-indigo-500/10 text-indigo-500",
}

function OpportunitiesContent() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSource, setFilterSource] = useState<OpportunitySource | "all">("all")
  const [filterStatus, setFilterStatus] = useState<OpportunityStatus | "all">("all")
  const [filterAssigned, setFilterAssigned] = useState<"linda" | "me" | "all">("all")

  const loadData = () => {
    const oppsData = getOpportunities()
    const contactsData = getContacts()
    setOpportunities(oppsData)
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

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const contact = contacts[opp.contactId]
      const matchesSearch =
        !searchQuery ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.subSource.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSource = filterSource === "all" || opp.source === filterSource
      const matchesStatus = filterStatus === "all" || opp.status === filterStatus
      const matchesAssigned = filterAssigned === "all" || opp.assignedTo === filterAssigned
      return matchesSearch && matchesSource && matchesStatus && matchesAssigned
    })
  }, [opportunities, contacts, searchQuery, filterSource, filterStatus, filterAssigned])

  const handleDelete = (oppId: string) => {
    const opp = opportunities.find(o => o.id === oppId)
    if (opp?.status === 'won') {
      alert('Cannot delete closed won opportunity. Use reversal instead.')
      return
    }
    if (confirm("Are you sure you want to delete this opportunity?")) {
      try {
        deleteOpportunity(oppId)
        loadData()
      } catch (error: any) {
        alert(error.message)
      }
    }
  }

  const handleEdit = (opp: Opportunity) => {
    setEditingOpportunity(opp)
    setShowAddDialog(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={`ml-64 min-w-0 overflow-x-hidden`} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Opportunities" subtitle="Manage sales opportunities with evidence tracking" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4">
            <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10 w-full"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v as OpportunitySource | "all")}>
                <SelectTrigger className="w-full sm:w-[140px] bg-secondary">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="webform">Webform</SelectItem>
                  <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="previous_enquiry">Previous Enquiry</SelectItem>
                  <SelectItem value="previous_client">Previous Client</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as OpportunityStatus | "all")}>
                <SelectTrigger className="w-full sm:w-[130px] bg-secondary">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAssigned} onValueChange={(v) => setFilterAssigned(v as "linda" | "me" | "all")}>
                <SelectTrigger className="w-full sm:w-[120px] bg-secondary">
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
                setEditingOpportunity(null)
                setShowAddDialog(true)
              }}
              className="whitespace-nowrap flex-shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Opportunity
            </Button>
          </div>

          {/* Opportunities Table */}
          <div className="rounded-xl border border-border bg-card w-full overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[1100px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground min-w-[150px]">Title</TableHead>
                    <TableHead className="text-muted-foreground min-w-[150px]">Contact</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Source</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Sub-source</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Status</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Assigned</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Value</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Created</TableHead>
                    <TableHead className="text-muted-foreground w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOpportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No opportunities found. Add your first opportunity to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOpportunities.map((opp) => {
                      const contact = contacts[opp.contactId]
                      if (!contact) return null
                      return (
                        <TableRow key={opp.id}>
                          <TableCell className="min-w-[150px] max-w-[200px]">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate" title={opp.title}>{opp.title}</p>
                              {opp.linkedOpportunityId && (
                                <p className="text-xs text-muted-foreground">Linked to previous opportunity</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[150px] max-w-[200px]">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate" title={contact.name}>{contact.name}</p>
                              <p className="text-sm text-muted-foreground truncate" title={contact.email}>{contact.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Badge className={SOURCE_COLORS[opp.source]}>{opp.source.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground min-w-[120px] max-w-[150px] truncate" title={opp.subSource}>
                            {opp.subSource}
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Badge className={STATUS_COLORS[opp.status]}>{opp.status}</Badge>
                          </TableCell>
                          <TableCell className="capitalize text-foreground min-w-[100px] whitespace-nowrap">
                            {opp.assignedTo === "me" ? "Me" : "Linda"}
                          </TableCell>
                          <TableCell className="text-foreground min-w-[120px] whitespace-nowrap">
                            {opp.value ? `${opp.currency || 'USD'} ${opp.value.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground min-w-[120px] whitespace-nowrap">
                            {formatDistanceToNow(new Date(opp.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/opportunities/${opp.id}`}>
                                <Button variant="ghost" size="sm" className="whitespace-nowrap">
                                  View
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(opp)}
                                disabled={opp.status === 'won'}
                                className="whitespace-nowrap"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(opp.id)}
                                disabled={opp.status === 'won'}
                                className="whitespace-nowrap"
                              >
                                Delete
                              </Button>
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

      <OpportunityFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingOpportunity={editingOpportunity || undefined}
        existingContact={editingOpportunity ? contacts[editingOpportunity.contactId] : undefined}
        onSave={loadData}
      />
    </div>
  )
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" />
        <main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center">
          <div className="text-muted-foreground">Loading opportunities...</div>
        </main>
      </div>
    }>
      <OpportunitiesContent />
    </Suspense>
  )
}


