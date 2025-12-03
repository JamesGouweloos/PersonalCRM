"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getContacts, getOpportunities, saveCallLog, generateId } from "@/lib/store"
import type { CallLog, Contact } from "@/lib/types"

interface CallLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId?: string
  contactId?: string
  onSave: () => void
}

const CALL_OUTCOMES = [
  "Answered - Interested",
  "Answered - Not Interested",
  "Answered - Callback Requested",
  "No Answer",
  "Voicemail Left",
  "Busy",
  "Wrong Number",
  "Not Available",
]

export function CallLogDialog({
  open,
  onOpenChange,
  opportunityId,
  contactId,
  onSave,
}: CallLogDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [formData, setFormData] = useState({
    contactId: contactId || "",
    opportunityId: opportunityId || "",
    phoneNumber: "",
    direction: "outbound" as "inbound" | "outbound",
    duration: "",
    outcome: "",
    notes: "",
    originList: "",
    occurredAt: new Date().toISOString().slice(0, 16), // Format for datetime-local input
  })

  useEffect(() => {
    setContacts(getContacts())
    if (contactId) {
      const contact = getContacts().find(c => c.id === contactId)
      setFormData(prev => ({
        ...prev,
        contactId,
        phoneNumber: contact?.phone || "",
      }))
    }
    if (opportunityId) {
      setFormData(prev => ({
        ...prev,
        opportunityId,
      }))
    }
  }, [open, contactId, opportunityId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.contactId || !formData.phoneNumber) {
      alert("Please fill in Contact and Phone Number")
      return
    }

    const callLog: CallLog = {
      id: generateId(),
      opportunityId: formData.opportunityId || undefined,
      contactId: formData.contactId,
      phoneNumber: formData.phoneNumber,
      direction: formData.direction,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      outcome: formData.outcome || undefined,
      notes: formData.notes || undefined,
      originList: formData.originList || undefined,
      user: "me", // TODO: Get from auth context
      occurredAt: new Date(formData.occurredAt).toISOString(),
      createdAt: new Date().toISOString(),
    }

    saveCallLog(callLog)
    onSave()
    onOpenChange(false)
    
    // Reset form
    setFormData({
      contactId: contactId || "",
      opportunityId: opportunityId || "",
      phoneNumber: "",
      direction: "outbound",
      duration: "",
      outcome: "",
      notes: "",
      originList: "",
      occurredAt: new Date().toISOString().slice(0, 16),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Phone Call</DialogTitle>
          <DialogDescription>
            Record a phone call for evidence tracking and commission purposes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact *</Label>
              <Select
                value={formData.contactId}
                onValueChange={(value) => {
                  const contact = contacts.find(c => c.id === value)
                  setFormData({
                    ...formData,
                    contactId: value,
                    phoneNumber: contact?.phone || formData.phoneNumber,
                  })
                }}
                disabled={!!contactId}
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
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1234567890"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="direction">Direction *</Label>
              <Select
                value={formData.direction}
                onValueChange={(value) => setFormData({ ...formData, direction: value as "inbound" | "outbound" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurredAt">Date & Time *</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.direction === "outbound" && (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="120"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select
                value={formData.outcome}
                onValueChange={(value) => setFormData({ ...formData, outcome: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {CALL_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome} value={outcome}>
                      {outcome}
                    </SelectItem>
                  ))}
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
              placeholder="Brief notes about the call..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Log Call</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


