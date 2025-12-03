"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Mail, Phone, Calendar, Edit, Trash2, Copy, Briefcase, XCircle } from "lucide-react"
import type { Lead, Contact, EmailTemplate, FollowUp } from "@/lib/types"
import { getTemplates, generateId, addActivity, saveLead, convertLeadToOpportunity, addNotInterestedLead, saveFollowUp, deleteLead } from "@/lib/store"
import { EmailComposeDialog } from "./email-compose-dialog"
import { ScheduleFollowUpDialog } from "./schedule-followup-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface LeadActionsDropdownProps {
  lead: Lead
  contact: Contact
  onEdit: () => void
  onDelete: () => void
  onRefresh: () => void
}

export function LeadActionsDropdown({ lead, contact, onEdit, onDelete, onRefresh }: LeadActionsDropdownProps) {
  const router = useRouter()
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [showEnquiryDialog, setShowEnquiryDialog] = useState(false)
  const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false)
  const [enquirySubSource, setEnquirySubSource] = useState("")
  const [notInterestedReason, setNotInterestedReason] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  const handleSendEmail = (template?: EmailTemplate) => {
    if (template) {
      setSelectedTemplate(template)
    }
    setShowEmailDialog(true)
  }

  const handleLogCall = () => {
    const now = new Date().toISOString()
    addActivity({
      id: generateId(),
      leadId: lead.id,
      contactId: contact.id,
      type: "call_made",
      description: `Phone call made to ${contact.name}`,
      createdAt: now,
    })

    // Update last contacted date
    saveLead({
      ...lead,
      lastContactedAt: now,
      updatedAt: now,
    })

    onRefresh()
  }

  const handleConvertToEnquiry = () => {
    setShowEnquiryDialog(true)
  }

  const handleConfirmEnquiry = () => {
    const opportunity = convertLeadToOpportunity(lead, contact, enquirySubSource || undefined)
    onRefresh()
    setShowEnquiryDialog(false)
    router.push(`/opportunities/${opportunity.id}`)
  }

  const handleConvertToFollowUp = () => {
    // Create follow-up for next week
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    const followUp: FollowUp = {
      id: generateId(),
      leadId: lead.id,
      contactId: contact.id,
      scheduledDate: nextWeek.toISOString(),
      type: "call",
      notes: `Follow-up from lead: ${contact.name}`,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    
    saveFollowUp(followUp)
    
    // Remove from leads
    deleteLead(lead.id)
    
    // Add activity
    addActivity({
      id: generateId(),
      leadId: lead.id,
      contactId: contact.id,
      type: "follow_up_scheduled",
      description: `Lead moved to Follow-ups list`,
      user: "me",
      createdAt: new Date().toISOString(),
    })
    
    onRefresh()
    router.push("/follow-ups")
  }

  const handleNotInterested = () => {
    setShowNotInterestedDialog(true)
  }

  const handleConfirmNotInterested = () => {
    addNotInterestedLead(lead, notInterestedReason)
    onRefresh()
    setShowNotInterestedDialog(false)
    router.push("/not-interested")
  }

  const templates = getTemplates()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Convert Lead</div>
          <DropdownMenuItem onClick={handleConvertToEnquiry}>
            <Briefcase className="mr-2 h-4 w-4" />
            Enquiry
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleConvertToFollowUp}>
            <Calendar className="mr-2 h-4 w-4" />
            Follow-up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleNotInterested} className="text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            Not Interested
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleSendEmail()}>
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogCall}>
            <Phone className="mr-2 h-4 w-4" />
            Log Phone Call
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowFollowUpDialog(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Follow-up
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {templates.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Quick Templates</div>
              {templates.slice(0, 3).map((template) => (
                <DropdownMenuItem key={template.id} onClick={() => handleSendEmail(template)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {template.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Lead
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EmailComposeDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        contact={contact}
        lead={lead}
        template={selectedTemplate}
        onSent={onRefresh}
      />

      <ScheduleFollowUpDialog
        open={showFollowUpDialog}
        onOpenChange={setShowFollowUpDialog}
        lead={lead}
        contact={contact}
        onScheduled={onRefresh}
      />

      {/* Enquiry Conversion Dialog */}
      <Dialog open={showEnquiryDialog} onOpenChange={setShowEnquiryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Enquiry</DialogTitle>
            <DialogDescription>
              Convert this lead to an Opportunity (Enquiry). The lead will be moved from the Leads list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subSource">Sub-source (optional)</Label>
              <Input
                id="subSource"
                value={enquirySubSource}
                onChange={(e) => setEnquirySubSource(e.target.value)}
                placeholder="e.g., Website Form – Special Offer"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Contact:</strong> {contact.name}</p>
              <p><strong>Source:</strong> {lead.source}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnquiryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEnquiry}>Convert to Enquiry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Interested Dialog */}
      <Dialog open={showNotInterestedDialog} onOpenChange={setShowNotInterestedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Not Interested</DialogTitle>
            <DialogDescription>
              Move this lead to the "Not Interested" list. The lead will be removed from active leads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={notInterestedReason}
                onChange={(e) => setNotInterestedReason(e.target.value)}
                placeholder="Why is this lead not interested at this time?"
                rows={3}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Contact:</strong> {contact.name}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotInterestedDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmNotInterested}>
              Mark as Not Interested
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
