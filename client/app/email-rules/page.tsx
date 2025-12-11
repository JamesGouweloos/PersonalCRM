"use client"

import { useEffect, useState, Suspense } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { emailRulesAPI } from "@/lib/api"
import { Plus, Edit, Trash2, Play, Loader2, Settings, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { EmailRuleBuilderDialog } from "@/components/email-rule-builder-dialog"

interface EmailRule {
  id: number
  name: string
  description: string | null
  priority: number
  enabled: number
  conditions: Array<{
    type: string
    value: string
    operator: string
  }>
  actions: Array<{
    type: string
    params: any
  }>
  created_at: string
  updated_at: string
}

function EmailRulesContent() {
  const [rules, setRules] = useState<EmailRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<EmailRule | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved !== null) {
      setSidebarCollapsed(saved === "true")
    }
    const handleStorageChange = () => {
      const updated = localStorage.getItem("sidebar_collapsed")
      if (updated !== null) {
        setSidebarCollapsed(updated === "true")
      }
    }
    window.addEventListener("storage", handleStorageChange)
    const interval = setInterval(handleStorageChange, 500)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await emailRulesAPI.getAll()
      setRules(response.data || [])
    } catch (error) {
      console.error("Error loading rules:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEnabled = async (rule: EmailRule) => {
    try {
      await emailRulesAPI.update(rule.id.toString(), {
        ...rule,
        enabled: rule.enabled ? 0 : 1
      })
      await loadRules()
    } catch (error) {
      console.error("Error toggling rule:", error)
      alert("Failed to update rule")
    }
  }

  const handleDelete = async (ruleId: number) => {
    if (!confirm("Are you sure you want to delete this rule?")) {
      return
    }

    try {
      await emailRulesAPI.delete(ruleId.toString())
      await loadRules()
    } catch (error) {
      console.error("Error deleting rule:", error)
      alert("Failed to delete rule")
    }
  }

  const getConditionDescription = (condition: any) => {
    const typeLabels: Record<string, string> = {
      subject_contains: "Subject contains",
      subject_matches: "Subject matches",
      from_contains: "From contains",
      to_contains: "To contains",
      body_contains: "Body contains",
      has_category: "Has category",
      is_flagged: "Is flagged",
      in_folder: "In folder"
    }
    return `${typeLabels[condition.type] || condition.type} "${condition.value}"`
  }

  const getActionDescription = (action: any) => {
    const typeLabels: Record<string, string> = {
      assign_category: "Assign category",
      create_contact: "Create contact",
      create_opportunity: "Create opportunity",
      create_activity: "Create activity",
      create_followup: "Create follow-up",
      update_opportunity_stage: "Update stage",
      link_to_opportunity: "Link to opportunity",
      mark_opportunity_won: "Mark as won",
      create_commission_snapshot: "Create commission snapshot"
    }
    return typeLabels[action.type] || action.type
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={`${sidebarCollapsed ? "ml-16" : "ml-64"} min-w-0 overflow-x-hidden`} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Email Rules" subtitle="Automate email processing with custom rules" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Email Automation Rules</h2>
              <p className="text-muted-foreground mt-1">
                Configure rules to automatically process emails and create CRM records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/email-rules/categories">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Category Mappings
                </Button>
              </Link>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No rules configured</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first rule to start automating email processing
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                          {rule.enabled ? (
                            <Badge className="bg-green-500">Enabled</Badge>
                          ) : (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </div>
                        {rule.description && (
                          <CardDescription className="mt-2">{rule.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled === 1}
                          onCheckedChange={() => handleToggleEnabled(rule)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingRule(rule)
                            setShowCreateDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Conditions</h4>
                        <div className="space-y-1">
                          {rule.conditions.map((condition, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              • {getConditionDescription(condition)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Actions</h4>
                        <div className="space-y-1">
                          {rule.actions.map((action, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              • {getActionDescription(action)}
                              {action.params?.category && `: ${action.params.category}`}
                              {action.params?.source && ` (${action.params.source})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rule Builder Dialog */}
          <EmailRuleBuilderDialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open)
              if (!open) {
                setEditingRule(null)
              }
            }}
            rule={editingRule}
            onSave={async (ruleData) => {
              try {
                if (editingRule?.id) {
                  await emailRulesAPI.update(editingRule.id.toString(), ruleData)
                } else {
                  await emailRulesAPI.create(ruleData)
                }
                await loadRules()
              } catch (error: any) {
                console.error("Error saving rule:", error)
                throw error
              }
            }}
          />
        </div>
      </main>
    </div>
  )
}

export default function EmailRulesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" />
        <main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center">
          <div className="text-muted-foreground">Loading email rules...</div>
        </main>
      </div>
    }>
      <EmailRulesContent />
    </Suspense>
  )
}


