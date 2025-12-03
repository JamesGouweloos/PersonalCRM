"use client"

import { useEffect, useState, useMemo } from "react"
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

export default function NotInterestedPage() {
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
      <main className="ml-64">
        <Header title="Not Interested" subtitle="Leads marked as not interested at this time" />
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
            </div>
          </div>

          {/* Leads Table */}
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-muted-foreground">Source</TableHead>
                  <TableHead className="text-muted-foreground">Assigned</TableHead>
                  <TableHead className="text-muted-foreground">Notes</TableHead>
                  <TableHead className="text-muted-foreground">Moved</TableHead>
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
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                            {contact.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.source.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="capitalize text-foreground">
                          {lead.assignedTo === "me" ? "Me" : "Linda"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {lead.notes || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
      </main>
    </div>
  )
}


