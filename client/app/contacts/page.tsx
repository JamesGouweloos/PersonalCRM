"use client"

import { useEffect, useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContactFormDialog } from "@/components/contact-form-dialog"
import { getContacts, getLeads, deleteContact } from "@/lib/store-api"
import { contactsAPI } from "@/lib/api"
import type { Contact, Lead } from "@/lib/types"
import { Plus, Search, MoreHorizontal, Edit, Trash2, UserPlus, Mail, Loader2, Trash } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const checkSidebarState = () => {
      const saved = localStorage.getItem("sidebar_collapsed")
      setSidebarCollapsed(saved === "true")
    }
    
    // Check initial state
    checkSidebarState()
    
    // Listen for storage changes (when sidebar is toggled)
    window.addEventListener("storage", checkSidebarState)
    
    // Also listen for custom event if sidebar component dispatches it
    const handleSidebarToggle = () => checkSidebarState()
    window.addEventListener("sidebarToggle", handleSidebarToggle)
    
    // Poll for changes (fallback for same-window updates)
    const interval = setInterval(checkSidebarState, 100)
    
    return () => {
      window.removeEventListener("storage", checkSidebarState)
      window.removeEventListener("sidebarToggle", handleSidebarToggle)
      clearInterval(interval)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [contactsData, leadsData] = await Promise.all([
        getContacts(searchQuery || undefined),
        getLeads()
      ])
      setContacts(contactsData)
      setLeads(leadsData)
    } catch (error) {
      console.error("Error loading contacts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [searchQuery])

  // Search is now handled server-side via API, so no need for client-side filtering
  const filteredContacts = contacts

  const getLeadCountForContact = (contactId: string) => {
    return leads.filter((lead) => lead.contactId === contactId).length
  }

  const handleDelete = async (contactId: string) => {
    const leadCount = getLeadCountForContact(contactId)
    if (leadCount > 0) {
      alert(`Cannot delete contact with ${leadCount} active lead(s). Delete the leads first.`)
      return
    }
    if (confirm("Are you sure you want to delete this contact?")) {
      const success = await deleteContact(contactId)
      if (success) {
        await loadData()
      } else {
        alert("Failed to delete contact")
      }
    }
  }

  const handleDeleteAll = async () => {
    const contactCount = contacts.length
    if (contactCount === 0) {
      alert("No contacts to delete")
      return
    }
    
    const confirmed = confirm(
      `Are you sure you want to delete ALL ${contactCount} contacts? This action cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      setLoading(true)
      const response = await contactsAPI.deleteAll()
      if (response.data.success) {
        alert(`Successfully deleted ${response.data.deleted} contacts`)
        await loadData()
      } else {
        alert("Failed to delete all contacts")
      }
    } catch (error: any) {
      console.error("Error deleting all contacts:", error)
      alert("Failed to delete all contacts: " + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setShowAddDialog(true)
  }

  // Helper function to get contact type badge color
  const getContactTypeColor = (type?: string) => {
    switch (type) {
      case "Agent":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "Direct":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "Internal":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "Spam":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={sidebarCollapsed ? "ml-16" : "ml-64"} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Contacts" subtitle="Manage your contact database" />
        <div className="p-6">
          {/* Search and Add */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10"
              />
            </div>
            <Button
              onClick={() => {
                setEditingContact(null)
                setShowAddDialog(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
            {contacts.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={loading}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            )}
          </div>

          {/* Contacts Table */}
          <div className="rounded-xl border border-border bg-card w-full overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-muted-foreground">Company</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Leads</TableHead>
                  <TableHead className="text-muted-foreground">Added</TableHead>
                  <TableHead className="text-muted-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading contacts...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No contacts found. Add your first contact to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => {
                    const leadCount = getLeadCountForContact(contact.id)
                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium text-foreground">{contact.name}</TableCell>
                        <TableCell>
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                            {contact.email}
                          </a>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{contact.phone || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{contact.company || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getContactTypeColor(contact.contact_type)}`}>
                            {contact.contact_type || "Other"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {leadCount > 0 ? (
                            <Link
                              href={`/leads?contact=${contact.id}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {leadCount} lead{leadCount !== 1 ? "s" : ""}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">0 leads</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(contact.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={`mailto:${contact.email}`}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Email
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/leads?contact=${contact.id}`}>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  View Leads
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(contact.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <ContactFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingContact={editingContact || undefined}
        onSave={loadData}
      />
    </div>
  )
}
