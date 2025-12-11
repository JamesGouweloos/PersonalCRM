"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, X } from "lucide-react"

interface Condition {
  type: string
  value: string
  operator: string
}

interface Action {
  type: string
  params: Record<string, any>
}

interface EmailRule {
  id?: number
  name: string
  description: string | null
  priority: number
  enabled: number
  conditions: Condition[]
  actions: Action[]
}

interface EmailRuleBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: EmailRule | null
  onSave: (rule: EmailRule) => Promise<void>
}

const CONDITION_TYPES = [
  { value: "subject_contains", label: "Subject Contains" },
  { value: "subject_matches", label: "Subject Matches (Regex)" },
  { value: "from_contains", label: "From Contains" },
  { value: "to_contains", label: "To Contains" },
  { value: "body_contains", label: "Body Contains" },
  { value: "has_category", label: "Has Category" },
  { value: "is_flagged", label: "Is Flagged" },
  { value: "in_folder", label: "In Folder" },
  { value: "direction", label: "Direction" },
  { value: "has_contact", label: "Has Contact" },
]

const OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "matches", label: "Matches (Regex)" },
]

const ACTION_TYPES = [
  { value: "assign_category", label: "Assign Category" },
  { value: "create_contact", label: "Create Contact" },
  { value: "create_opportunity", label: "Create Opportunity" },
  { value: "create_lead", label: "Create Lead" },
  { value: "create_activity", label: "Create Activity" },
  { value: "create_followup", label: "Create Follow-up" },
  { value: "update_opportunity_stage", label: "Update Opportunity Stage" },
  { value: "link_to_opportunity", label: "Link to Opportunity" },
  { value: "mark_opportunity_won", label: "Mark Opportunity as Won" },
  { value: "create_commission_snapshot", label: "Create Commission Snapshot" },
]

export function EmailRuleBuilderDialog({
  open,
  onOpenChange,
  rule,
  onSave,
}: EmailRuleBuilderDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const [conditions, setConditions] = useState<Condition[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (rule) {
      setName(rule.name || "")
      setDescription(rule.description || "")
      setPriority(rule.priority || 0)
      setEnabled(rule.enabled === 1)
      setConditions(rule.conditions || [])
      setActions(rule.actions || [])
    } else {
      // Reset form for new rule
      setName("")
      setDescription("")
      setPriority(0)
      setEnabled(true)
      setConditions([])
      setActions([])
    }
    setError(null)
  }, [rule, open])

  const addCondition = () => {
    setConditions([
      ...conditions,
      { type: "subject_contains", value: "", operator: "contains" },
    ])
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const updated = [...conditions]
    updated[index] = { ...updated[index], [field]: value }
    setConditions(updated)
  }

  const addAction = () => {
    setActions([...actions, { type: "assign_category", params: {} }])
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions]
    if (field === "type") {
      updated[index] = { type: value, params: {} }
    } else {
      updated[index] = {
        ...updated[index],
        params: { ...updated[index].params, [field]: value },
      }
    }
    setActions(updated)
  }

  const getConditionValueInput = (condition: Condition, index: number) => {
    // Special handling for boolean/enum types
    if (condition.type === "direction") {
      return (
        <Select
          value={condition.value}
          onValueChange={(value) => updateCondition(index, "value", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (condition.type === "has_contact") {
      return (
        <Select
          value={condition.value}
          onValueChange={(value) => updateCondition(index, "value", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Has Contact</SelectItem>
            <SelectItem value="false">No Contact</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (condition.type === "is_flagged") {
      return (
        <Select
          value={condition.value}
          onValueChange={(value) => updateCondition(index, "value", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Flagged</SelectItem>
            <SelectItem value="false">Not Flagged</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    // Default text input
    return (
      <Input
        value={condition.value}
        onChange={(e) => updateCondition(index, "value", e.target.value)}
        placeholder={
          condition.type === "subject_matches" || condition.operator === "matches"
            ? "Enter regex pattern"
            : "Enter value"
        }
      />
    )
  }

  const getActionParamsInput = (action: Action, index: number) => {
    switch (action.type) {
      case "assign_category":
        return (
          <div className="space-y-2">
            <Label>Category Name</Label>
            <Input
              value={action.params.category || ""}
              onChange={(e) => updateAction(index, "category", e.target.value)}
              placeholder="e.g., Source – Webform"
            />
          </div>
        )

      case "create_contact":
        return (
          <div className="space-y-2">
            <Label>Contact Type</Label>
            <Select
              value={action.params.contact_type || "Other"}
              onValueChange={(value) => updateAction(index, "contact_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Agent">Agent</SelectItem>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Spam">Spam</SelectItem>
                <SelectItem value="Internal">Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )

      case "create_opportunity":
        return (
          <div className="space-y-2">
            <div>
              <Label>Source</Label>
              <Select
                value={action.params.source || "webform"}
                onValueChange={(value) => updateAction(index, "source", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webform">Webform</SelectItem>
                  <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="previous_enquiry">Previous Enquiry</SelectItem>
                  <SelectItem value="previous_client">Previous Client</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sub Source</Label>
              <Input
                value={action.params.sub_source || ""}
                onChange={(e) => updateAction(index, "sub_source", e.target.value)}
                placeholder="e.g., Email Enquiry"
              />
            </div>
            <div>
              <Label>Title (optional, use {'{'}subject{'}'} for email subject)</Label>
              <Input
                value={action.params.title || ""}
                onChange={(e) => updateAction(index, "title", e.target.value)}
                placeholder="e.g., {{subject}}"
              />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Select
                value={action.params.assigned_to || "James"}
                onValueChange={(value) => updateAction(index, "assigned_to", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="James">James</SelectItem>
                  <SelectItem value="linda">Linda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "create_lead":
        return (
          <div className="space-y-2">
            <div>
              <Label>Source</Label>
              <Select
                value={action.params.source || "webform"}
                onValueChange={(value) => updateAction(index, "source", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webform">Webform</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="previous_enquiry">Previous Enquiry</SelectItem>
                  <SelectItem value="previous_client">Previous Client</SelectItem>
                  <SelectItem value="forwarded">Forwarded</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={action.params.status || "new"}
                onValueChange={(value) => updateAction(index, "status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned To</Label>
              <Select
                value={action.params.assigned_to || "James"}
                onValueChange={(value) => updateAction(index, "assigned_to", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="James">James</SelectItem>
                  <SelectItem value="linda">Linda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={action.params.notes || ""}
                onChange={(e) => updateAction(index, "notes", e.target.value)}
                placeholder="Optional notes for the lead"
              />
            </div>
          </div>
        )

      case "create_activity":
        return (
          <div className="space-y-2">
            <div>
              <Label>Type</Label>
              <Select
                value={action.params.type || "email_received"}
                onValueChange={(value) => updateAction(index, "type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_sent">Email Sent</SelectItem>
                  <SelectItem value="email_received">Email Received</SelectItem>
                  <SelectItem value="call_made">Call Made</SelectItem>
                  <SelectItem value="call_received">Call Received</SelectItem>
                  <SelectItem value="note_added">Note Added</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={action.params.description || ""}
                onChange={(e) => updateAction(index, "description", e.target.value)}
                placeholder="Activity description"
              />
            </div>
          </div>
        )

      case "create_followup":
        return (
          <div className="space-y-2">
            <div>
              <Label>Type</Label>
              <Select
                value={action.params.type || "email"}
                onValueChange={(value) => updateAction(index, "type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={action.params.notes || ""}
                onChange={(e) => updateAction(index, "notes", e.target.value)}
                placeholder="Follow-up notes"
              />
            </div>
          </div>
        )

      case "update_opportunity_stage":
        return (
          <div className="space-y-2">
            <Label>Stage Name</Label>
            <Input
              value={action.params.stage_name || ""}
              onChange={(e) => updateAction(index, "stage_name", e.target.value)}
              placeholder="e.g., Proposal"
            />
          </div>
        )

      case "link_to_opportunity":
        return (
          <div className="text-sm text-muted-foreground">
            Links the email to an existing opportunity if found
          </div>
        )

      case "mark_opportunity_won":
        return (
          <div className="text-sm text-muted-foreground">
            Marks the linked opportunity as won
          </div>
        )

      case "create_commission_snapshot":
        return (
          <div className="text-sm text-muted-foreground">
            Creates a commission snapshot for the linked opportunity
          </div>
        )

      default:
        return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Rule name is required")
      return
    }

    if (conditions.length === 0) {
      setError("At least one condition is required")
      return
    }

    if (actions.length === 0) {
      setError("At least one action is required")
      return
    }

    // Validate conditions
    for (const condition of conditions) {
      if (!condition.type || !condition.value) {
        setError("All conditions must have a type and value")
        return
      }
    }

    // Validate actions
    for (const action of actions) {
      if (!action.type) {
        setError("All actions must have a type")
        return
      }
    }

    setSaving(true)
    try {
      const ruleData: EmailRule = {
        id: rule?.id,
        name: name.trim(),
        description: description.trim() || null,
        priority,
        enabled: enabled ? 1 : 0,
        conditions,
        actions,
      }
      await onSave(ruleData)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save rule")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Rule" : "Create New Rule"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Auto-Create Contact for New Senders"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of what this rule does"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher priority rules run first
                </p>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Conditions</h3>
                <p className="text-sm text-muted-foreground">
                  All conditions must match for the rule to execute (AND logic)
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No conditions added. Click "Add Condition" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-secondary/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <Label>Condition Type</Label>
                          <Select
                            value={condition.type}
                            onValueChange={(value) => updateCondition(index, "type", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Operator</Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) =>
                              updateCondition(index, "operator", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Value</Label>
                          {getConditionValueInput(condition, index)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Actions</h3>
                <p className="text-sm text-muted-foreground">
                  Actions to execute when all conditions match
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No actions added. Click "Add Action" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-secondary/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-3">
                          <Label>Action Type</Label>
                          <Select
                            value={action.type}
                            onValueChange={(value) => updateAction(index, "type", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {getActionParamsInput(action, index)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}





