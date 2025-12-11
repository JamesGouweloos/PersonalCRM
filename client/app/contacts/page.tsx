"use client"

import { useEffect, useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ContactFormDialog } from "@/components/contact-form-dialog"
import { getContacts, getLeads, deleteContact } from "@/lib/store-api"
import { contactsAPI } from "@/lib/api"
import type { Contact, Lead } from "@/lib/types"
import { Plus, Search, MoreHorizontal, Edit, Trash2, UserPlus, Mail, Loader2, Trash, Check, X, Save, XCircle } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")
  const [savingField, setSavingField] = useState<string | null>(null)
  const [batchEditMode, setBatchEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Contact>>>(new Map())
  const [originalContacts, setOriginalContacts] = useState<Contact[]>([])
  const [savingBatch, setSavingBatch] = useState(false)
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

  const handleInlineEdit = (contact: Contact, field: string) => {
    setEditingField({ id: contact.id, field })
    const currentValue = contact[field as keyof Contact]
    setEditingValue(currentValue ? String(currentValue) : "")
  }

  const handleInlineSave = async (contact: Contact, field: string) => {
    const currentValue = contact[field as keyof Contact]
    const currentValueStr = currentValue ? String(currentValue) : ""
    
    if (editingValue === currentValueStr) {
      setEditingField(null)
      return
    }

    setSavingField(`${contact.id}-${field}`)
    try {
      const updateData: any = { ...contact }
      updateData[field] = editingValue || null

      const response = await contactsAPI.update(contact.id, updateData)
      
      // Update local state
      setContacts(contacts.map(c => 
        c.id === contact.id 
          ? { ...c, [field]: editingValue || null, updatedAt: new Date().toISOString() }
          : c
      ))
      
      setEditingField(null)
      setEditingValue("")
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error)
      alert(error.response?.data?.error || `Failed to update ${field}`)
    } finally {
      setSavingField(null)
    }
  }

  const handleInlineCancel = () => {
    setEditingField(null)
    setEditingValue("")
  }

  const handleBatchEditChange = (contactId: string, field: string, value: string) => {
    if (!batchEditMode) return
    
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      // Get original contact (before any pending changes)
      const originalContact = contacts.find(c => c.id === contactId)
      if (!originalContact) return newMap
      
      // Get current pending changes for this contact
      const existingChanges = newMap.get(contactId) || {}
      
      // Calculate what the value would be with current changes
      const currentValue = existingChanges[field as keyof Contact] !== undefined 
        ? existingChanges[field as keyof Contact]
        : originalContact[field as keyof Contact]
      
      const currentValueStr = currentValue ? String(currentValue) : ""
      const newValue = value || null
      const newValueStr = newValue ? String(newValue) : ""
      
      // Check if this change brings it back to original
      const originalValue = originalContact[field as keyof Contact]
      const originalValueStr = originalValue ? String(originalValue) : ""
      
      if (newValueStr === originalValueStr) {
        // Value matches original, remove this field from changes
        const { [field]: _, ...rest } = existingChanges
        if (Object.keys(rest).length === 0) {
          newMap.delete(contactId)
        } else {
          newMap.set(contactId, rest)
        }
      } else {
        // Value is different, add to changes
        newMap.set(contactId, {
          ...existingChanges,
          [field]: newValue
        })
      }
      
      return newMap
    })
  }

  const handleBatchSave = async () => {
    if (pendingChanges.size === 0) {
      setBatchEditMode(false)
      return
    }

    setSavingBatch(true)
    const errors: string[] = []
    const updates: Promise<any>[] = []

    // Create update promises for all changed contacts
    // Use original contacts to ensure we have the base data before any edits
    const baseContacts = originalContacts.length > 0 ? originalContacts : contacts
    pendingChanges.forEach((changes, contactId) => {
      const contact = baseContacts.find(c => c.id === contactId)
      if (!contact) return

      const updateData = { ...contact, ...changes }
      updates.push(
        contactsAPI.update(contactId, updateData)
          .catch((error: any) => {
            errors.push(`${contact.name}: ${error.response?.data?.error || error.message}`)
            return null
          })
      )
    })

    try {
      await Promise.all(updates)
      
      if (errors.length > 0) {
        alert(`Some updates failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`)
      } else {
        // Reload data to ensure consistency
        await loadData()
      }
      
      setPendingChanges(new Map())
      setOriginalContacts([])
      setBatchEditMode(false)
    } catch (error: any) {
      console.error('Error saving batch changes:', error)
      alert('Failed to save changes: ' + (error.message || 'Unknown error'))
    } finally {
      setSavingBatch(false)
    }
  }

  const handleBatchCancel = () => {
    // Restore original contacts
    if (originalContacts.length > 0) {
      setContacts(originalContacts)
    } else {
      // Fallback: reload from server
      loadData()
    }
    setPendingChanges(new Map())
    setOriginalContacts([])
    setBatchEditMode(false)
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
      <main className={`${sidebarCollapsed ? "ml-16" : "ml-64"} min-w-0 overflow-x-hidden`} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Contacts" subtitle="Manage your contact database" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Search and Add */}
          <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10 w-full"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {batchEditMode ? (
                <>
                  <Button
                    onClick={handleBatchSave}
                    disabled={savingBatch || pendingChanges.size === 0}
                    className="whitespace-nowrap"
                  >
                    {savingBatch ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes {pendingChanges.size > 0 && `(${pendingChanges.size})`}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBatchCancel}
                    disabled={savingBatch}
                    className="whitespace-nowrap"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setEditingContact(null)
                      setShowAddDialog(true)
                    }}
                    className="whitespace-nowrap"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Store original contacts before entering edit mode
                      setOriginalContacts([...contacts])
                      setBatchEditMode(true)
                    }}
                    className="whitespace-nowrap"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Table
                  </Button>
                  {contacts.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAll}
                      disabled={loading}
                      className="whitespace-nowrap"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete All
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Contacts Table */}
          <div className="rounded-xl border border-border bg-card w-full overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[800px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground min-w-[150px]">Name</TableHead>
                    <TableHead className="text-muted-foreground min-w-[200px]">Email</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Phone</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Company</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Type</TableHead>
                    <TableHead className="text-muted-foreground min-w-[80px]">Leads</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Added</TableHead>
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
                      const isEditingName = !batchEditMode && editingField?.id === contact.id && editingField?.field === 'name'
                      const isEditingEmail = !batchEditMode && editingField?.id === contact.id && editingField?.field === 'email'
                      const isEditingPhone = !batchEditMode && editingField?.id === contact.id && editingField?.field === 'phone'
                      const isEditingCompany = !batchEditMode && editingField?.id === contact.id && editingField?.field === 'company'
                      const isSaving = savingField === `${contact.id}-${editingField?.field}`
                      const hasPendingChanges = pendingChanges.has(contact.id)
                      const pendingContact = hasPendingChanges ? { ...contact, ...pendingChanges.get(contact.id) } : contact

                      return (
                        <TableRow key={contact.id} className={hasPendingChanges ? "bg-yellow-500/5 border-l-2 border-l-yellow-500" : ""}>
                          {/* Name - Editable */}
                          <TableCell className="font-medium text-foreground min-w-[150px] max-w-[200px]">
                            {isEditingName ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleInlineSave(contact, 'name')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleInlineSave(contact, 'name')
                                    } else if (e.key === 'Escape') {
                                      handleInlineCancel()
                                    }
                                  }}
                                  className="h-8 text-sm"
                                  autoFocus
                                  disabled={isSaving}
                                />
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleInlineSave(contact, 'name')}
                                    >
                                      <Check className="h-3 w-3 text-green-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={handleInlineCancel}
                                    >
                                      <X className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div
                                className="group flex items-center gap-2 cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 -my-1"
                                onClick={() => handleInlineEdit(contact, 'name')}
                                title="Click to edit"
                              >
                                <span className="truncate flex-1" title={contact.name}>
                                  {contact.name}
                                </span>
                                <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </TableCell>

                          {/* Email - Editable */}
                          <TableCell className="min-w-[200px] max-w-[250px]">
                            {batchEditMode ? (
                              <Input
                                type="email"
                                value={pendingContact.email || ""}
                                onChange={(e) => handleBatchEditChange(contact.id, 'email', e.target.value)}
                                className="h-8 text-sm bg-background"
                                placeholder="Email"
                              />
                            ) : isEditingEmail ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="email"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleInlineSave(contact, 'email')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleInlineSave(contact, 'email')
                                    } else if (e.key === 'Escape') {
                                      handleInlineCancel()
                                    }
                                  }}
                                  className="h-8 text-sm"
                                  autoFocus
                                  disabled={isSaving}
                                />
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleInlineSave(contact, 'email')}
                                    >
                                      <Check className="h-3 w-3 text-green-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={handleInlineCancel}
                                    >
                                      <X className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div
                                className="group flex items-center gap-2 cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 -my-1"
                                onClick={() => handleInlineEdit(contact, 'email')}
                                title="Click to edit"
                              >
                                {contact.email ? (
                                  <a 
                                    href={`mailto:${contact.email}`} 
                                    className="text-primary hover:underline truncate flex-1"
                                    onClick={(e) => e.stopPropagation()}
                                    title={contact.email}
                                  >
                                    {contact.email}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground flex-1">-</span>
                                )}
                                <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </TableCell>

                          {/* Phone - Editable */}
                          <TableCell className="text-muted-foreground min-w-[120px]">
                            {batchEditMode ? (
                              <Input
                                value={pendingContact.phone || ""}
                                onChange={(e) => handleBatchEditChange(contact.id, 'phone', e.target.value)}
                                className="h-8 text-sm bg-background"
                                placeholder="Phone"
                              />
                            ) : isEditingPhone ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleInlineSave(contact, 'phone')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleInlineSave(contact, 'phone')
                                    } else if (e.key === 'Escape') {
                                      handleInlineCancel()
                                    }
                                  }}
                                  className="h-8 text-sm"
                                  autoFocus
                                  disabled={isSaving}
                                />
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleInlineSave(contact, 'phone')}
                                    >
                                      <Check className="h-3 w-3 text-green-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={handleInlineCancel}
                                    >
                                      <X className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div
                                className="group flex items-center gap-2 cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 -my-1"
                                onClick={() => handleInlineEdit(contact, 'phone')}
                                title="Click to edit"
                              >
                                <span className="truncate flex-1" title={contact.phone || undefined}>
                                  {contact.phone || "-"}
                                </span>
                                <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </TableCell>

                          {/* Company - Editable */}
                          <TableCell className="text-muted-foreground min-w-[120px] max-w-[150px]">
                            {batchEditMode ? (
                              <Input
                                value={pendingContact.company || ""}
                                onChange={(e) => handleBatchEditChange(contact.id, 'company', e.target.value)}
                                className="h-8 text-sm bg-background"
                                placeholder="Company"
                              />
                            ) : isEditingCompany ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleInlineSave(contact, 'company')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleInlineSave(contact, 'company')
                                    } else if (e.key === 'Escape') {
                                      handleInlineCancel()
                                    }
                                  }}
                                  className="h-8 text-sm"
                                  autoFocus
                                  disabled={isSaving}
                                />
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleInlineSave(contact, 'company')}
                                    >
                                      <Check className="h-3 w-3 text-green-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={handleInlineCancel}
                                    >
                                      <X className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div
                                className="group flex items-center gap-2 cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 -my-1"
                                onClick={() => handleInlineEdit(contact, 'company')}
                                title="Click to edit"
                              >
                                <span className="truncate flex-1" title={contact.company || undefined}>
                                  {contact.company || "-"}
                                </span>
                                <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </TableCell>

                          {/* Type - Always Interactive Dropdown */}
                          <TableCell className="min-w-[100px]">
                            <div className="flex items-center gap-1">
                              <Select
                                value={pendingContact.contact_type || "Other"}
                                onValueChange={(value) => {
                                  if (batchEditMode) {
                                    handleBatchEditChange(contact.id, 'contact_type', value)
                                  } else {
                                    // Immediate save mode (original behavior)
                                    if (value === (contact.contact_type || "Other")) {
                                      return
                                    }
                                    
                                    setSavingField(`${contact.id}-contact_type`)
                                    contactsAPI.update(contact.id, { ...contact, contact_type: value })
                                      .then(() => {
                                        setContacts(contacts.map(c => 
                                          c.id === contact.id 
                                            ? { ...c, contact_type: value as Contact['contact_type'], updatedAt: new Date().toISOString() }
                                            : c
                                        ))
                                      })
                                      .catch((error: any) => {
                                        console.error(`Error updating contact_type:`, error)
                                        alert(error.response?.data?.error || `Failed to update contact type`)
                                      })
                                      .finally(() => {
                                        setSavingField(null)
                                      })
                                  }
                                }}
                                disabled={!batchEditMode && savingField === `${contact.id}-contact_type`}
                              >
                                <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent shadow-none focus:ring-0 focus-visible:ring-0 data-[state=open]:bg-transparent">
                                  <SelectValue>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${getContactTypeColor(pendingContact.contact_type)}`}>
                                      {pendingContact.contact_type || "Other"}
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Agent">Agent</SelectItem>
                                  <SelectItem value="Direct">Direct</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                  <SelectItem value="Internal">Internal</SelectItem>
                                  <SelectItem value="Spam">Spam</SelectItem>
                                </SelectContent>
                              </Select>
                              {!batchEditMode && savingField === `${contact.id}-contact_type` && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[80px] whitespace-nowrap">
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
                          <TableCell className="text-muted-foreground min-w-[100px] whitespace-nowrap">
                            {format(new Date(contact.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="w-[50px]">
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
