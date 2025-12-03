"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getContacts, getOpportunities, saveOpportunity, generateId } from "@/lib/store"
import type { Opportunity, Contact, OpportunitySource } from "@/lib/types"
import { X } from "lucide-react"

interface OpportunityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingOpportunity?: Opportunity
  existingContact?: Contact
  onSave: () => void
}

const SOURCE_OPTIONS: { value: OpportunitySource; label: string; subSources: string[] }[] = [
  {
    value: "webform",
    label: "Webform",
    subSources: ["Website Form", "Website Form – Special Offer", "Contact Form", "Booking Form"]
  },
  {
    value: "cold_outreach",
    label: "Cold Outreach",
    subSources: ["Phone – Outbound", "Email – Outbound", "LinkedIn – Outbound", "Prospecting List"]
  },
  {
    value: "social",
    label: "Social Media",
    subSources: ["Facebook DM", "Facebook Lead Form", "Instagram DM", "Instagram Lead Form", "LinkedIn InMail", "LinkedIn Lead Form", "Facebook – Organic", "Instagram – Organic", "LinkedIn – Organic", "Facebook – Paid", "Instagram – Paid", "LinkedIn – Paid"]
  },
  {
    value: "previous_enquiry",
    label: "Previous Enquiry",
    subSources: ["Reactivation", "Follow-up", "Return Enquiry"]
  },
  {
    value: "previous_client",
    label: "Previous Client",
    subSources: ["Return Guest", "Repeat Booking", "Referral"]
  },
  {
    value: "forwarded",
    label: "Forwarded",
    subSources: ["Email Forward", "Referral", "Internal Transfer"]
  }
]

export function OpportunityFormDialog({
  open,
  onOpenChange,
  existingOpportunity,
  existingContact,
  onSave,
}: OpportunityFormDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [formData, setFormData] = useState({
    title: "",
    contactId: "",
    source: "" as OpportunitySource | "",
    subSource: "",
    linkedOpportunityId: "",
    assignedTo: "me" as "linda" | "me",
    value: "",
    currency: "USD",
    notes: "",
    formId: "",
    campaignId: "",
    leadId: "",
    originList: "",
  })

  useEffect(() => {
    setContacts(getContacts())
    setOpportunities(getOpportunities())
    
    if (existingOpportunity) {
      setFormData({
        title: existingOpportunity.title || "",
        contactId: existingOpportunity.contactId,
        source: existingOpportunity.source,
        subSource: existingOpportunity.subSource || "",
        linkedOpportunityId: existingOpportunity.linkedOpportunityId || "",
        assignedTo: existingOpportunity.assignedTo,
        value: existingOpportunity.value?.toString() || "",
        currency: existingOpportunity.currency || "USD",
        notes: existingOpportunity.notes || "",
        formId: existingOpportunity.formId || "",
        campaignId: existingOpportunity.campaignId || "",
        leadId: existingOpportunity.leadId || "",
        originList: existingOpportunity.originList || "",
      })
    } else if (existingContact) {
      setFormData(prev => ({
        ...prev,
        contactId: existingContact.id,
        title: existingContact.name ? `Opportunity - ${existingContact.name}` : "",
      }))
    } else {
      setFormData({
        title: "",
        contactId: "",
        source: "" as OpportunitySource | "",
        subSource: "",
        linkedOpportunityId: "",
        assignedTo: "me",
        value: "",
        currency: "USD",
        notes: "",
        formId: "",
        campaignId: "",
        leadId: "",
        originList: "",
      })
    }
  }, [existingOpportunity, existingContact, open])

  const selectedSource = SOURCE_OPTIONS.find(s => s.value === formData.source)
  const availableSubSources = selectedSource?.subSources || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.contactId || !formData.source || !formData.subSource) {
      alert("Please fill in all required fields (Contact, Source, Sub-source)")
      return
    }

    const opportunity: Opportunity = {
      id: existingOpportunity?.id || generateId(),
      title: formData.title || `Opportunity - ${contacts.find(c => c.id === formData.contactId)?.name || 'Unknown'}`,
      contactId: formData.contactId,
      source: formData.source as OpportunitySource,
      subSource: formData.subSource,
      linkedOpportunityId: formData.linkedOpportunityId || undefined,
      assignedTo: formData.assignedTo,
      status: existingOpportunity?.status || "open",
      value: formData.value ? parseFloat(formData.value) : undefined,
      currency: formData.currency,
      notes: formData.notes || undefined,
      formId: formData.formId || undefined,
      campaignId: formData.campaignId || undefined,
      leadId: formData.leadId || undefined,
      originList: formData.originList || undefined,
      createdAt: existingOpportunity?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveOpportunity(opportunity)
    onSave()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingOpportunity ? "Edit Opportunity" : "Create Opportunity"}</DialogTitle>
          <DialogDescription>
            Create a new opportunity with source tracking for commission evidence.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact *</Label>
              <Select
                value={formData.contactId}
                onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                disabled={!!existingContact}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Opportunity title"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => {
                  setFormData({ ...formData, source: value as OpportunitySource, subSource: "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subSource">Sub-source *</Label>
              <Select
                value={formData.subSource}
                onValueChange={(value) => setFormData({ ...formData, subSource: value })}
                disabled={!formData.source}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-source" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubSources.map((subSource) => (
                    <SelectItem key={subSource} value={subSource}>
                      {subSource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(formData.source === "previous_enquiry" || formData.source === "previous_client") && (
            <div className="space-y-2">
              <Label htmlFor="linkedOpportunity">Link to Previous Opportunity</Label>
              <Select
                value={formData.linkedOpportunityId}
                onValueChange={(value) => setFormData({ ...formData, linkedOpportunityId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select previous opportunity (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {opportunities
                    .filter(o => o.contactId === formData.contactId && o.id !== existingOpportunity?.id)
                    .map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.title} ({opp.source} - {opp.subSource})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.source === "webform" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="formId">Form ID</Label>
                <Input
                  id="formId"
                  value={formData.formId}
                  onChange={(e) => setFormData({ ...formData, formId: e.target.value })}
                  placeholder="e.g., contact-form-2024"
                />
              </div>
            </div>
          )}

          {formData.source === "social" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaignId">Campaign ID</Label>
                <Input
                  id="campaignId"
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  placeholder="For paid ads"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadId">Lead ID</Label>
                <Input
                  id="leadId"
                  value={formData.leadId}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  placeholder="Platform lead ID"
                />
              </div>
            </div>
          )}

          {formData.source === "cold_outreach" && (
            <div className="space-y-2">
              <Label htmlFor="originList">Origin List</Label>
              <Input
                id="originList"
                value={formData.originList}
                onChange={(e) => setFormData({ ...formData, originList: e.target.value })}
                placeholder="e.g., Prospecting list – August 2025"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value as "linda" | "me" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="linda">Linda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="ZAR">ZAR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Opportunity</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


