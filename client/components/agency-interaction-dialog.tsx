"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { agencyInteractionsAPI, opportunitiesAPI } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Video, Phone, FileText } from "lucide-react"

interface AgencyInteraction {
  id: number
  type: string
  description: string
  direction: string
  user: string
  platform?: string
  platform_thread_url?: string
  call_duration?: number
  call_outcome?: string
  contact_id: number
  opportunity_id?: number
}

interface Contact {
  id: number
  name: string
  email: string
  company?: string
}

interface Opportunity {
  id: number
  title: string
}

interface AgencyInteractionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingInteraction?: AgencyInteraction
  contacts: Contact[]
  onSave: () => void
}

export function AgencyInteractionDialog({
  open,
  onOpenChange,
  existingInteraction,
  contacts,
  onSave,
}: AgencyInteractionDialogProps) {
  const [activeTab, setActiveTab] = useState<"teams" | "phone" | "written">("teams")
  const [contactId, setContactId] = useState<string>("")
  const [opportunityId, setOpportunityId] = useState<string>("")
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound")
  const [description, setDescription] = useState("")
  const [platformThreadUrl, setPlatformThreadUrl] = useState("")
  const [callDuration, setCallDuration] = useState("")
  const [callOutcome, setCallOutcome] = useState("")
  const [saving, setSaving] = useState(false)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  useEffect(() => {
    if (open && contactId) {
      loadOpportunities()
    }
  }, [open, contactId])

  useEffect(() => {
    if (existingInteraction) {
      setContactId(existingInteraction.contact_id.toString())
      setOpportunityId(existingInteraction.opportunity_id?.toString() || "")
      setDirection(existingInteraction.direction as "inbound" | "outbound")
      setDescription(existingInteraction.description)
      setPlatformThreadUrl(existingInteraction.platform_thread_url || "")
      setCallDuration(existingInteraction.call_duration?.toString() || "")
      setCallOutcome(existingInteraction.call_outcome || "")
      
      // Set tab based on type
      if (existingInteraction.type === "teams_message" || existingInteraction.type === "teams_call") {
        setActiveTab("teams")
      } else if (existingInteraction.type === "call_made" || existingInteraction.type === "call_received") {
        setActiveTab("phone")
      } else {
        setActiveTab("written")
      }
    } else {
      resetForm()
    }
  }, [existingInteraction, open])

  const loadOpportunities = async () => {
    if (!contactId) return
    try {
      const response = await opportunitiesAPI.getAll({ contactId })
      setOpportunities(response.data || [])
    } catch (error) {
      console.error("Error loading opportunities:", error)
    }
  }

  const resetForm = () => {
    setActiveTab("teams")
    setContactId("")
    setOpportunityId("")
    setDirection("outbound")
    setDescription("")
    setPlatformThreadUrl("")
    setCallDuration("")
    setCallOutcome("")
  }

  const getInteractionType = () => {
    switch (activeTab) {
      case "teams":
        return direction === "inbound" ? "teams_call" : "teams_message"
      case "phone":
        return direction === "inbound" ? "call_received" : "call_made"
      case "written":
        return "written_communication"
      default:
        return "teams_message"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactId) {
      alert("Please select a contact")
      return
    }

    setSaving(true)
    try {
      const interactionData = {
        contact_id: parseInt(contactId),
        type: getInteractionType(),
        description,
        direction,
        user: "me",
        platform: activeTab === "teams" ? "teams" : undefined,
        platform_thread_url: platformThreadUrl || undefined,
        call_duration: callDuration ? parseInt(callDuration) : undefined,
        call_outcome: callOutcome || undefined,
        opportunity_id: opportunityId ? parseInt(opportunityId) : undefined,
      }

      if (existingInteraction) {
        await agencyInteractionsAPI.update(existingInteraction.id.toString(), interactionData)
      } else {
        await agencyInteractionsAPI.create(interactionData)
      }

      resetForm()
      onSave()
    } catch (error: any) {
      console.error("Error saving interaction:", error)
      alert(error.response?.data?.error || "Failed to save interaction")
    } finally {
      setSaving(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingInteraction ? "Edit Interaction" : "Log Agency Interaction"}
          </DialogTitle>
          <DialogDescription>
            Track interactions with agency contacts via Teams, phone calls, or written communications
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="teams">
                <Video className="mr-2 h-4 w-4" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="phone">
                <Phone className="mr-2 h-4 w-4" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="written">
                <FileText className="mr-2 h-4 w-4" />
                Written
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teams" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-teams">Contact *</Label>
                  <Select value={contactId} onValueChange={setContactId} required>
                    <SelectTrigger id="contact-teams">
                      <SelectValue placeholder="Select agency contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} {contact.company && `(${contact.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direction-teams">Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                    <SelectTrigger id="direction-teams">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thread-url">Teams Thread URL (optional)</Label>
                <Input
                  id="thread-url"
                  type="url"
                  placeholder="https://teams.microsoft.com/..."
                  value={platformThreadUrl}
                  onChange={(e) => setPlatformThreadUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-teams">Description *</Label>
                <Textarea
                  id="description-teams"
                  placeholder="Describe the Teams interaction..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="phone" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact *</Label>
                  <Select value={contactId} onValueChange={setContactId} required>
                    <SelectTrigger id="contact-phone">
                      <SelectValue placeholder="Select agency contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} {contact.company && `(${contact.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direction-phone">Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                    <SelectTrigger id="direction-phone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    placeholder="e.g., 15"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outcome">Outcome</Label>
                  <Select value={callOutcome} onValueChange={setCallOutcome}>
                    <SelectTrigger id="outcome">
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="answered">Answered</SelectItem>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="no_answer">No Answer</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-phone">Description *</Label>
                <Textarea
                  id="description-phone"
                  placeholder="Describe the phone call..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="written" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-written">Contact *</Label>
                  <Select value={contactId} onValueChange={setContactId} required>
                    <SelectTrigger id="contact-written">
                      <SelectValue placeholder="Select agency contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} {contact.company && `(${contact.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direction-written">Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                    <SelectTrigger id="direction-written">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-written">Description *</Label>
                <Textarea
                  id="description-written"
                  placeholder="Describe the written communication (letter, fax, etc.)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          {contactId && (
            <div className="space-y-2">
              <Label htmlFor="opportunity">Link to Opportunity (optional)</Label>
              <Select value={opportunityId || "none"} onValueChange={(value) => setOpportunityId(value === "none" ? "" : value)}>
                <SelectTrigger id="opportunity">
                  <SelectValue placeholder="Select opportunity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {opportunities.map((opp) => (
                    <SelectItem key={opp.id} value={opp.id.toString()}>
                      {opp.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !contactId || !description}>
              {saving ? "Saving..." : existingInteraction ? "Update" : "Log Interaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

