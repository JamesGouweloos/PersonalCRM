"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generateId, saveFollowUp, addActivity, saveLead } from "@/lib/store"
import type { Contact, Lead, FollowUp } from "@/lib/types"
import { format, addDays } from "date-fns"

interface ScheduleFollowUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  contact: Contact
  onScheduled?: () => void
}

export function ScheduleFollowUpDialog({
  open,
  onOpenChange,
  lead,
  contact,
  onScheduled,
}: ScheduleFollowUpDialogProps) {
  const [type, setType] = useState<FollowUp["type"]>("call")
  const [scheduledDate, setScheduledDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"))
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()

    const followUp: FollowUp = {
      id: generateId(),
      leadId: lead.id,
      contactId: contact.id,
      scheduledDate: new Date(scheduledDate).toISOString(),
      type,
      notes: notes || undefined,
      completed: false,
      createdAt: now,
    }
    saveFollowUp(followUp)

    // Update lead status to follow_up
    saveLead({
      ...lead,
      status: "follow_up",
      updatedAt: now,
    })

    // Add activity
    addActivity({
      id: generateId(),
      leadId: lead.id,
      contactId: contact.id,
      type: "follow_up_scheduled",
      description: `Follow-up ${type} scheduled for ${format(new Date(scheduledDate), "MMM d, yyyy")}`,
      createdAt: now,
    })

    onOpenChange(false)
    setNotes("")
    onScheduled?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Schedule Follow-up</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Schedule a follow-up for {contact.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as FollowUp["type"])}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-foreground">
                Scheduled Date
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="bg-secondary"
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Discuss upcoming promotion, check interest level..."
                className="bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
