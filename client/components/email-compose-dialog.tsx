"use client"

import { useState, useEffect } from "react"
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
import { getTemplates, generateId, addActivity, saveLead } from "@/lib/store"
import type { Contact, Lead, EmailTemplate } from "@/lib/types"
import { ExternalLink } from "lucide-react"

interface EmailComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact
  lead: Lead
  template?: EmailTemplate | null
  onSent?: () => void
}

export function EmailComposeDialog({ open, onOpenChange, contact, lead, template, onSent }: EmailComposeDialogProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  useEffect(() => {
    setTemplates(getTemplates())
  }, [open])

  useEffect(() => {
    if (template) {
      setSelectedTemplateId(template.id)
      applyTemplate(template)
    }
  }, [template, contact])

  const applyTemplate = (tmpl: EmailTemplate) => {
    let processedSubject = tmpl.subject
    let processedBody = tmpl.body

    // Replace placeholders
    const replacements: Record<string, string> = {
      "{{name}}": contact.name,
      "{{email}}": contact.email,
      "{{company}}": contact.company || "",
      "{{notes}}": lead.notes || "",
    }

    Object.entries(replacements).forEach(([placeholder, value]) => {
      processedSubject = processedSubject.replace(new RegExp(placeholder, "g"), value)
      processedBody = processedBody.replace(new RegExp(placeholder, "g"), value)
    })

    setSubject(processedSubject)
    setBody(processedBody)
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tmpl = templates.find((t) => t.id === templateId)
    if (tmpl) {
      applyTemplate(tmpl)
    }
  }

  const handleOpenInOutlook = () => {
    // Create mailto link for Outlook
    const mailtoLink = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    // Log the activity
    const now = new Date().toISOString()
    addActivity({
      id: generateId(),
      leadId: lead.id,
      contactId: contact.id,
      type: "email_sent",
      description: `Email sent: "${subject}"`,
      createdAt: now,
    })

    // Update lead's last contacted date
    saveLead({
      ...lead,
      lastContactedAt: now,
      updatedAt: now,
    })

    // Open mailto link
    window.open(mailtoLink, "_blank")

    onOpenChange(false)
    onSent?.()
  }

  const handleCopyToClipboard = async () => {
    const emailContent = `To: ${contact.email}\nSubject: ${subject}\n\n${body}`
    await navigator.clipboard.writeText(emailContent)

    // Log the activity
    const now = new Date().toISOString()
    addActivity({
      id: generateId(),
      leadId: lead.id,
      contactId: contact.id,
      type: "email_sent",
      description: `Email drafted: "${subject}"`,
      createdAt: now,
    })

    saveLead({
      ...lead,
      lastContactedAt: now,
      updatedAt: now,
    })

    onOpenChange(false)
    onSent?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Compose Email</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Compose an email to {contact.name}. Click "Open in Outlook" to send via your email client.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">Use Template</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">To</Label>
            <Input value={contact.email} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-foreground">
              Subject
            </Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-secondary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-foreground">
              Message
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] bg-secondary"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={handleCopyToClipboard}>
            Copy to Clipboard
          </Button>
          <Button type="button" onClick={handleOpenInOutlook}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Outlook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
