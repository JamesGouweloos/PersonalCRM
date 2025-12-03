"use client"

import type React from "react"

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
import { generateId, saveTemplate } from "@/lib/store"
import type { EmailTemplate } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface TemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingTemplate?: EmailTemplate
  onSave?: () => void
}

const placeholders = [
  { key: "{{name}}", description: "Contact's name" },
  { key: "{{email}}", description: "Contact's email" },
  { key: "{{company}}", description: "Contact's company" },
  { key: "{{notes}}", description: "Lead notes" },
  { key: "{{promotion_details}}", description: "Promotion info" },
]

export function TemplateFormDialog({ open, onOpenChange, existingTemplate, onSave }: TemplateFormDialogProps) {
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [type, setType] = useState<EmailTemplate["type"]>("enquiry")

  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name)
      setSubject(existingTemplate.subject)
      setBody(existingTemplate.body)
      setType(existingTemplate.type)
    } else {
      resetForm()
    }
  }, [existingTemplate, open])

  const resetForm = () => {
    setName("")
    setSubject("")
    setBody("")
    setType("enquiry")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()

    const template: EmailTemplate = {
      id: existingTemplate?.id || generateId(),
      name,
      subject,
      body,
      type,
      createdAt: existingTemplate?.createdAt || now,
      updatedAt: now,
    }
    saveTemplate(template)

    onOpenChange(false)
    resetForm()
    onSave?.()
  }

  const insertPlaceholder = (placeholder: string) => {
    setBody((prev) => prev + placeholder)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {existingTemplate ? "Edit Template" : "Create Email Template"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create reusable email templates for common communications. Use placeholders to personalize emails.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Template Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Initial Enquiry Response"
                  required
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Template Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as EmailTemplate["type"])}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enquiry">Enquiry Response</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="return_client">Return Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-foreground">
                Email Subject *
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Thank you for your enquiry"
                required
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body" className="text-foreground">
                  Email Body *
                </Label>
                <span className="text-xs text-muted-foreground">Click to insert placeholder</span>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                {placeholders.map((p) => (
                  <Badge
                    key={p.key}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => insertPlaceholder(p.key)}
                  >
                    {p.key}
                  </Badge>
                ))}
              </div>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email template here..."
                required
                className="min-h-[200px] bg-secondary font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{existingTemplate ? "Update Template" : "Create Template"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
