"use client"


export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo , Suspense} from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getNotInterestedLeads, getContacts } from "@/lib/store"
import type { Lead, Contact, LeadSource } from "@/lib/types"
import { Search, Filter, RotateCcw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

function NotInterestedPageContent() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSource, setFilterSource] = useState<LeadSource | "all">("all")

  const loadData = () => {
    const leadsData = getNotInterestedLeads()
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
      return matchesSearch && matchesSource
    })
  }, [leads, contacts, searchQuery, filterSource])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-w-0 overflow-x-hidden">
        <Header title="Not Interested" subtitle="Leads marked as not interested at this time" />
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
            <div className="flex items-center gap-2 flex-shrink-0">
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
            </div>
          </div>

          {/* Leads Table */}
          <div className="rounded-xl border border-border bg-card w-full overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[800px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground min-w-[200px]">Contact</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Source</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Assigned</TableHead>
                    <TableHead className="text-muted-foreground min-w-[200px]">Notes</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Moved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No leads in the "Not Interested" list.
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
                          <TableCell className="min-w-[100px]">
                            <Badge variant="outline" className="whitespace-nowrap">{lead.source.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="capitalize text-foreground min-w-[100px] whitespace-nowrap">
                            {lead.assignedTo === "me" ? "Me" : "Linda"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground min-w-[200px] max-w-[300px] truncate" title={lead.notes || undefined}>
                            {lead.notes || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground min-w-[120px] whitespace-nowrap">
                            {formatDistanceToNow(new Date(lead.updatedAt || lead.createdAt), { addSuffix: true })}
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
    </div>
  )
}





export default function NotInterestedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" /><main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></main></div>}>
      <NotInterestedPageContent />
    </Suspense>
  )
}