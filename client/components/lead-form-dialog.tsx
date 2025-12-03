"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generateId, saveLead, saveContact, getContacts, addActivity } from "@/lib/store"
import type { Lead, Contact, LeadSource, LeadStatus } from "@/lib/types"

interface LeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingLead?: Lead
  existingContact?: Contact
  onSave?: () => void
}

export function LeadFormDialog({ open, onOpenChange, existingLead, existingContact, onSave }: LeadFormDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>("")
  const [isNewContact, setIsNewContact] = useState(true)

  // Contact fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")

  // Lead fields
  const [source, setSource] = useState<LeadSource>("webform")
  const [status, setStatus] = useState<LeadStatus>("new")
  const [assignedTo, setAssignedTo] = useState<"linda" | "me">("linda")
  const [notes, setNotes] = useState("")
  const [value, setValue] = useState("")

  useEffect(() => {
    setContacts(getContacts())
  }, [open])

  useEffect(() => {
    if (existingLead && existingContact) {
      setIsNewContact(false)
      setSelectedContactId(existingContact.id)
      setName(existingContact.name)
      setEmail(existingContact.email)
      setPhone(existingContact.phone || "")
      setCompany(existingContact.company || "")
      setSource(existingLead.source)
      setStatus(existingLead.status)
      setAssignedTo(existingLead.assignedTo)
      setNotes(existingLead.notes || "")
      setValue(existingLead.value?.toString() || "")
    } else {
      resetForm()
    }
  }, [existingLead, existingContact])

  const resetForm = () => {
    setIsNewContact(true)
    setSelectedContactId("")
    setName("")
    setEmail("")
    setPhone("")
    setCompany("")
    setSource("webform")
    setStatus("new")
    setAssignedTo("linda")
    setNotes("")
    setValue("")
  }

  const handleContactSelect = (contactId: string) => {
    if (contactId === "new") {
      setIsNewContact(true)
      setSelectedContactId("")
      setName("")
      setEmail("")
      setPhone("")
      setCompany("")
    } else {
      setIsNewContact(false)
      setSelectedContactId(contactId)
      const contact = contacts.find((c) => c.id === contactId)
      if (contact) {
        setName(contact.name)
        setEmail(contact.email)
        setPhone(contact.phone || "")
        setCompany(contact.company || "")
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const now = new Date().toISOString()
    let contactId = selectedContactId

    // Create or update contact
    if (isNewContact || !selectedContactId) {
      contactId = existingContact?.id || generateId()
    }

    const contact: Contact = {
      id: contactId,
      name,
      email,
      phone: phone || undefined,
      company: company || undefined,
      createdAt: existingContact?.createdAt || now,
      updatedAt: now,
    }
    saveContact(contact)

    // Create or update lead
    const lead: Lead = {
      id: existingLead?.id || generateId(),
      contactId,
      source,
      status,
      assignedTo,
      notes: notes || undefined,
      value: value ? Number.parseFloat(value) : undefined,
      createdAt: existingLead?.createdAt || now,
      updatedAt: now,
      lastContactedAt: existingLead?.lastContactedAt,
    }
    saveLead(lead)

    // Add activity
    addActivity({
      id: generateId(),
      leadId: lead.id,
      contactId,
      type: existingLead ? "status_changed" : "note_added",
      description: existingLead ? `Lead status updated to ${status}` : "New lead created",
      createdAt: now,
    })

    onOpenChange(false)
    resetForm()
    onSave?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">{existingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Contact Selection */}
            {!existingLead && contacts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-foreground">Contact</Label>
                <Select value={isNewContact ? "new" : selectedContactId} onValueChange={handleContactSelect}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select or create contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Create New Contact</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} ({contact.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Contact Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-secondary"
                  disabled={!isNewContact && !!selectedContactId && !existingLead}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary"
                  disabled={!isNewContact && !!selectedContactId && !existingLead}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">
                  Phone
                </Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-foreground">
                  Company
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-secondary"
                />
              </div>
            </div>

            {/* Lead Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Lead Source *</Label>
                <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webform">Webform Submission</SelectItem>
                    <SelectItem value="forwarded">Forwarded (from Linda)</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="previous_enquiry">Previous Enquiry</SelectItem>
                    <SelectItem value="previous_client">Previous Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Status *</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="dropped">Dropped Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Assigned To *</Label>
                <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v as "linda" | "me")}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linda">Linda</SelectItem>
                    <SelectItem value="me">Me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value" className="text-foreground">
                  Estimated Value
                </Label>
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="$0.00"
                  className="bg-secondary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes about this lead..."
                className="min-h-[100px] bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{existingLead ? "Update Lead" : "Create Lead"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
