"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getContacts, getOpportunities, saveOpportunity, generateId, addActivity } from "@/lib/store"
import type { Contact, OpportunitySource } from "@/lib/types"
import { ExternalLink } from "lucide-react"

interface SocialInteractionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform: "facebook" | "instagram" | "linkedin"
  onSave: () => void
}

const PLATFORM_SUBSOURCES: Record<string, string[]> = {
  facebook: [
    "Facebook DM",
    "Facebook Lead Form",
    "Facebook – Organic",
    "Facebook – Paid",
    "Facebook Comment",
    "Facebook Post",
  ],
  instagram: [
    "Instagram DM",
    "Instagram Lead Form",
    "Instagram – Organic",
    "Instagram – Paid",
    "Instagram Comment",
    "Instagram Story",
  ],
  linkedin: [
    "LinkedIn InMail",
    "LinkedIn Lead Form",
    "LinkedIn – Organic",
    "LinkedIn – Paid",
    "LinkedIn Comment",
    "LinkedIn Connection",
  ],
}

export function SocialInteractionDialog({
  open,
  onOpenChange,
  platform,
  onSave,
}: SocialInteractionDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [formData, setFormData] = useState({
    contactId: "",
    subSource: "",
    threadUrl: "",
    campaignId: "",
    leadId: "",
    notes: "",
    interactionType: "dm" as "dm" | "comment" | "lead_form",
  })

  useEffect(() => {
    setContacts(getContacts())
    if (open) {
      // Set default sub-source based on platform and interaction type
      const defaults = PLATFORM_SUBSOURCES[platform] || []
      if (defaults.length > 0 && !formData.subSource) {
        setFormData(prev => ({ ...prev, subSource: defaults[0] }))
      }
    }
  }, [open, platform])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.contactId || !formData.subSource) {
      alert("Please fill in Contact and Sub-source")
      return
    }

    const contact = contacts.find(c => c.id === formData.contactId)
    if (!contact) return

    // Create opportunity
    const opportunity = {
      id: generateId(),
      title: `Social Interaction - ${contact.name}`,
      contactId: formData.contactId,
      source: "social" as OpportunitySource,
      subSource: formData.subSource,
      assignedTo: "me" as "linda" | "me",
      status: "open" as const,
      campaignId: formData.campaignId || undefined,
      leadId: formData.leadId || undefined,
      notes: formData.notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveOpportunity(opportunity)

    // Create activity with platform thread URL
    const activityType = formData.interactionType === "dm" ? "social_dm" :
                         formData.interactionType === "comment" ? "social_comment" :
                         "social_lead_form"

    addActivity({
      id: generateId(),
      opportunityId: opportunity.id,
      contactId: formData.contactId,
      type: activityType,
      description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} ${formData.interactionType} interaction with ${contact.name}`,
      user: "me",
      platform: platform,
      platformThreadUrl: formData.threadUrl || undefined,
      createdAt: new Date().toISOString(),
    })

    onSave()
    onOpenChange(false)
    
    // Reset form
    setFormData({
      contactId: "",
      subSource: "",
      threadUrl: "",
      campaignId: "",
      leadId: "",
      notes: "",
      interactionType: "dm",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log {platform.charAt(0).toUpperCase() + platform.slice(1)} Interaction</DialogTitle>
          <DialogDescription>
            Capture a social media interaction and create an opportunity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact *</Label>
              <Select
                value={formData.contactId}
                onValueChange={(value) => setFormData({ ...formData, contactId: value })}
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
              <Label htmlFor="interactionType">Interaction Type</Label>
              <Select
                value={formData.interactionType}
                onValueChange={(value) => {
                  setFormData({ ...formData, interactionType: value as "dm" | "comment" | "lead_form" })
                  // Update sub-source based on interaction type
                  const defaults = PLATFORM_SUBSOURCES[platform] || []
                  if (value === "dm" && defaults.includes(`${platform.charAt(0).toUpperCase() + platform.slice(1)} DM`)) {
                    setFormData(prev => ({ ...prev, subSource: `${platform.charAt(0).toUpperCase() + platform.slice(1)} DM` }))
                  } else if (value === "comment" && defaults.includes(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Comment`)) {
                    setFormData(prev => ({ ...prev, subSource: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Comment` }))
                  } else if (value === "lead_form" && defaults.includes(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Lead Form`)) {
                    setFormData(prev => ({ ...prev, subSource: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Lead Form` }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dm">Direct Message</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="lead_form">Lead Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subSource">Sub-source *</Label>
            <Select
              value={formData.subSource}
              onValueChange={(value) => setFormData({ ...formData, subSource: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sub-source" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_SUBSOURCES[platform].map((subSource) => (
                  <SelectItem key={subSource} value={subSource}>
                    {subSource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threadUrl">Thread/Profile URL</Label>
            <div className="flex gap-2">
              <Input
                id="threadUrl"
                value={formData.threadUrl}
                onChange={(e) => setFormData({ ...formData, threadUrl: e.target.value })}
                placeholder={`https://${platform}.com/...`}
              />
              {formData.threadUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(formData.threadUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {(formData.subSource.includes("Paid") || formData.subSource.includes("Lead Form")) && (
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Interaction details..."
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


