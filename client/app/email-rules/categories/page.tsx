"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { emailRulesAPI } from "@/lib/api"
import { Plus, Edit, Trash2, Loader2, ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"

interface CategoryMapping {
  id: number
  category_name: string
  crm_field_type: "source" | "stage" | "sub_source"
  crm_field_value: string
  created_at: string
}

export default function CategoryMappingsPage() {
  const [mappings, setMappings] = useState<CategoryMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingMapping, setEditingMapping] = useState<CategoryMapping | null>(null)
  const [formData, setFormData] = useState({
    category_name: "",
    crm_field_type: "source" as "source" | "stage" | "sub_source",
    crm_field_value: ""
  })

  useEffect(() => {
    loadMappings()
  }, [])

  const loadMappings = async () => {
    try {
      setLoading(true)
      const response = await emailRulesAPI.getCategories()
      setMappings(response.data || [])
    } catch (error) {
      console.error("Error loading category mappings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (editingMapping) {
        await emailRulesAPI.updateCategory(editingMapping.id.toString(), formData)
      } else {
        await emailRulesAPI.createCategory(formData)
      }
      await loadMappings()
      setShowCreateDialog(false)
      setEditingMapping(null)
      setFormData({ category_name: "", crm_field_type: "source", crm_field_value: "" })
    } catch (error: any) {
      console.error("Error saving mapping:", error)
      alert("Failed to save mapping: " + (error.response?.data?.error || error.message))
    }
  }

  const handleEdit = (mapping: CategoryMapping) => {
    setEditingMapping(mapping)
    setFormData({
      category_name: mapping.category_name,
      crm_field_type: mapping.crm_field_type,
      crm_field_value: mapping.crm_field_value
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category mapping?")) {
      return
    }

    try {
      await emailRulesAPI.deleteCategory(id.toString())
      await loadMappings()
    } catch (error) {
      console.error("Error deleting mapping:", error)
      alert("Failed to delete mapping")
    }
  }

  const getFieldTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      source: "bg-blue-500",
      stage: "bg-green-500",
      sub_source: "bg-purple-500"
    }
    return colors[type] || "bg-gray-500"
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64">
        <Header title="Category Mappings" subtitle="Map Outlook categories to CRM fields" />
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/email-rules">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Category Mappings</h2>
                <p className="text-muted-foreground mt-1">
                  Map Outlook email categories to CRM source, stage, and sub-source fields
                </p>
              </div>
            </div>
            <Button onClick={() => {
              setEditingMapping(null)
              setFormData({ category_name: "", crm_field_type: "source", crm_field_value: "" })
              setShowCreateDialog(true)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Mapping
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Mappings</CardTitle>
                <CardDescription>
                  {mappings.length} category mapping{mappings.length !== 1 ? "s" : ""} configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mappings.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No category mappings</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create mappings to automatically tag emails based on Outlook categories
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappings.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-foreground">{mapping.category_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Maps to: <Badge className={getFieldTypeBadge(mapping.crm_field_type)}>
                                {mapping.crm_field_type}
                              </Badge> = {mapping.crm_field_value}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(mapping)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create/Edit Dialog */}
          {showCreateDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>{editingMapping ? "Edit Mapping" : "Create Mapping"}</CardTitle>
                  <CardDescription>
                    Map an Outlook category to a CRM field
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Outlook Category Name
                    </label>
                    <Input
                      placeholder="e.g., Source – Webform"
                      value={formData.category_name}
                      onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      CRM Field Type
                    </label>
                    <Select
                      value={formData.crm_field_type}
                      onValueChange={(value: any) => setFormData({ ...formData, crm_field_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="source">Source</SelectItem>
                        <SelectItem value="stage">Stage</SelectItem>
                        <SelectItem value="sub_source">Sub-source</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      CRM Field Value
                    </label>
                    <Input
                      placeholder="e.g., webform, social, follow_up"
                      value={formData.crm_field_value}
                      onChange={(e) => setFormData({ ...formData, crm_field_value: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateDialog(false)
                        setEditingMapping(null)
                        setFormData({ category_name: "", crm_field_type: "source", crm_field_value: "" })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      {editingMapping ? "Update" : "Create"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


