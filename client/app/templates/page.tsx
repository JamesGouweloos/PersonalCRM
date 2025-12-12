"use client"


export const dynamic = 'force-dynamic'
import { useEffect, useState , Suspense} from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TemplateFormDialog } from "@/components/template-form-dialog"
import { getTemplates, deleteTemplate } from "@/lib/store"
import type { EmailTemplate } from "@/lib/types"
import { Plus, MoreVertical, Edit, Trash2, Copy, Mail } from "lucide-react"
import { format } from "date-fns"

const typeLabels: Record<EmailTemplate["type"], { label: string; className: string }> = {
  enquiry: { label: "Enquiry", className: "bg-primary/10 text-primary" },
  follow_up: { label: "Follow-up", className: "bg-warning/10 text-warning" },
  promotion: { label: "Promotion", className: "bg-accent/10 text-accent" },
  return_client: { label: "Return Client", className: "bg-muted text-muted-foreground" },
}

function TemplatesPageContent() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

  const loadData = () => {
    setTemplates(getTemplates())
  }

  useEffect(() => {
    loadData()
    window.addEventListener("storage", loadData)
    return () => window.removeEventListener("storage", loadData)
  }, [])

  const handleDelete = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplate(templateId)
      loadData()
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setShowAddDialog(true)
  }

  const handleDuplicate = (template: EmailTemplate) => {
    setEditingTemplate({
      ...template,
      id: "",
      name: `${template.name} (Copy)`,
    })
    setShowAddDialog(true)
  }

  const handleCopyToClipboard = async (template: EmailTemplate) => {
    await navigator.clipboard.writeText(template.body)
    alert("Template body copied to clipboard!")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-w-0 overflow-x-hidden">
        <Header title="Email Templates" subtitle="Manage your email templates for Outlook" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Header Actions */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Create and manage email templates. Use placeholders like{" "}
                <code className="rounded bg-secondary px-1 text-foreground">{"{{name}}"}</code> to personalize emails.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null)
                setShowAddDialog(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>

          {/* Templates Grid */}
          {templates.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No templates found. Create your first email template to get started.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditingTemplate(null)
                    setShowAddDialog(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const typeConfig = typeLabels[template.type]
                return (
                  <Card key={template.id} className="bg-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-foreground text-base">{template.name}</CardTitle>
                          <CardDescription className="text-muted-foreground">{template.subject}</CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyToClipboard(template)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Body
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(template.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={typeConfig.className}>{typeConfig.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {template.body.substring(0, 150)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated {format(new Date(template.updatedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <TemplateFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingTemplate={editingTemplate || undefined}
        onSave={loadData}
      />
    </div>
  )
}



export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" /><main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></main></div>}>
      <TemplatesPageContent />
    </Suspense>
  )
}