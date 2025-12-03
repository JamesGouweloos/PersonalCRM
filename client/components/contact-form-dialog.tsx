"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveContact } from "@/lib/store-api"
import type { Contact } from "@/lib/types"

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingContact?: Contact
  onSave?: () => void
}

export function ContactFormDialog({ open, onOpenChange, existingContact, onSave }: ContactFormDialogProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [notes, setNotes] = useState("")
  const [contactType, setContactType] = useState<"Agent" | "Direct" | "Other" | "Spam" | "Internal">("Other")
  const [saving, setSaving] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  useEffect(() => {
    if (existingContact) {
      setName(existingContact.name)
      setEmail(existingContact.email)
      setPhone(existingContact.phone || "")
      setCompany(existingContact.company || "")
      setNotes(existingContact.notes || "")
      setContactType((existingContact as any).contact_type || "Other")
    } else {
      resetForm()
    }
  }, [existingContact, open])

  const resetForm = () => {
    setName("")
    setEmail("")
    setPhone("")
    setCompany("")
    setNotes("")
    setContactType("Other")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setDuplicateError(null)

    const contact: Contact = {
      id: existingContact?.id || "",
      name,
      email,
      phone: phone || undefined,
      company: company || undefined,
      notes: notes || undefined,
      contact_type: contactType,
      createdAt: existingContact?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    try {
      const saved = await saveContact(contact)
      
      setSaving(false)
      
      if (saved) {
        // Check if this was a duplicate (saved contact has same email but different ID)
        if (!existingContact && saved.email.toLowerCase().trim() === email.toLowerCase().trim() && saved.id !== contact.id) {
          setDuplicateError("A contact with this email already exists. The existing contact was loaded.")
          // Still close and refresh after a moment
          setTimeout(() => {
            onOpenChange(false)
            resetForm()
            onSave?.()
          }, 2000)
        } else {
          onOpenChange(false)
          resetForm()
          onSave?.()
        }
      } else {
        setDuplicateError("Failed to save contact. Please try again.")
      }
    } catch (error: any) {
      setSaving(false)
      const errorMessage = error.message || "Failed to save contact. A contact with this email may already exist."
      setDuplicateError(errorMessage)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">{existingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  setDuplicateError(null)
                }}
                required
                className="bg-secondary"
              />
              {duplicateError && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">{duplicateError}</p>
              )}
            </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="contact_type" className="text-foreground">
                Type *
              </Label>
              <Select value={contactType} onValueChange={(value: "Agent" | "Direct" | "Other" | "Spam" | "Internal") => setContactType(value)}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Spam">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this contact..."
                className="bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : existingContact ? "Update Contact" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
