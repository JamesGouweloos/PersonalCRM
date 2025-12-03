"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getContacts, saveContact, saveOpportunity, generateId, addActivity } from "@/lib/store"
import type { Contact, OpportunitySource } from "@/lib/types"

interface WebformSubmissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

const WEBFORM_SUBSOURCES = [
  "Website Form",
  "Website Form – Special Offer",
  "Contact Form",
  "Booking Form",
  "Newsletter Signup",
  "Quote Request",
]

export function WebformSubmissionDialog({
  open,
  onOpenChange,
  onSave,
}: WebformSubmissionDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    formId: "",
    subSource: "",
    notes: "",
    useExistingContact: false,
    selectedContactId: "",
  })

  useEffect(() => {
    setContacts(getContacts())
    if (open && !formData.subSource) {
      setFormData(prev => ({ ...prev, subSource: WEBFORM_SUBSOURCES[0] }))
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.subSource) {
      alert("Please fill in Name, Email, and Sub-source")
      return
    }

    let contactId = formData.selectedContactId

    // Create or find contact
    if (!formData.useExistingContact || !contactId) {
      const existingContact = contacts.find(c => c.email.toLowerCase() === formData.email.toLowerCase())
      if (existingContact) {
        contactId = existingContact.id
      } else {
        contactId = generateId()
        const contact: Contact = {
          id: contactId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          company: formData.company || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        saveContact(contact)
      }
    }

    const submissionTime = new Date().toISOString()

    // Create opportunity
    const opportunity = {
      id: generateId(),
      title: `Webform Submission - ${formData.name}`,
      contactId: contactId,
      source: "webform" as OpportunitySource,
      subSource: formData.subSource,
      assignedTo: "me" as "linda" | "me",
      status: "open" as const,
      formId: formData.formId || undefined,
      formSubmissionTime: submissionTime,
      notes: formData.notes || undefined,
      createdAt: submissionTime,
      updatedAt: submissionTime,
    }

    saveOpportunity(opportunity)

    // Create activity
    addActivity({
      id: generateId(),
      opportunityId: opportunity.id,
      contactId: contactId,
      type: "webform_submission",
      description: `Webform submission received from ${formData.name} via ${formData.subSource}`,
      user: "system",
      createdAt: submissionTime,
    })

    onSave()
    onOpenChange(false)
    
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      formId: "",
      subSource: WEBFORM_SUBSOURCES[0],
      notes: "",
      useExistingContact: false,
      selectedContactId: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Webform Submission</DialogTitle>
          <DialogDescription>
            Record a webform submission and create an opportunity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subSource">Form Type *</Label>
            <Select
              value={formData.subSource}
              onValueChange={(value) => setFormData({ ...formData, subSource: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select form type" />
              </SelectTrigger>
              <SelectContent>
                {WEBFORM_SUBSOURCES.map((subSource) => (
                  <SelectItem key={subSource} value={subSource}>
                    {subSource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formId">Form ID</Label>
            <Input
              id="formId"
              value={formData.formId}
              onChange={(e) => setFormData({ ...formData, formId: e.target.value })}
              placeholder="e.g., contact-form-2024"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Submission Details</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information from the form..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Opportunity</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


