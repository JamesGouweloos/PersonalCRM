"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Trash2, Download, Upload, Info, Database } from "lucide-react"
import { getLeads, getContacts, getFollowUps, getTemplates, getActivities } from "@/lib/store"

export default function SettingsPage() {
  const handleExportData = () => {
    const data = {
      leads: getLeads(),
      contacts: getContacts(),
      followUps: getFollowUps(),
      templates: getTemplates(),
      activities: getActivities(),
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `crm-export-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportData = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string)
            if (data.leads) localStorage.setItem("crm_leads", JSON.stringify(data.leads))
            if (data.contacts) localStorage.setItem("crm_contacts", JSON.stringify(data.contacts))
            if (data.followUps) localStorage.setItem("crm_follow_ups", JSON.stringify(data.followUps))
            if (data.templates) localStorage.setItem("crm_templates", JSON.stringify(data.templates))
            if (data.activities) localStorage.setItem("crm_activities", JSON.stringify(data.activities))
            alert("Data imported successfully! Refresh the page to see changes.")
            window.location.reload()
          } catch {
            alert("Failed to import data. Please ensure the file is valid JSON.")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      localStorage.removeItem("crm_leads")
      localStorage.removeItem("crm_contacts")
      localStorage.removeItem("crm_follow_ups")
      localStorage.removeItem("crm_templates")
      localStorage.removeItem("crm_activities")
      alert("All data cleared. Refresh the page.")
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64">
        <Header title="Settings" subtitle="Manage your CRM settings" />
        <div className="p-6 max-w-3xl">
          <Alert className="mb-6 bg-card border-border">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-foreground">Outlook Integration</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              This CRM integrates with Outlook via mailto links. When you click "Open in Outlook" from any email compose
              dialog, it will open your default email client with the pre-filled content ready to send.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Export, import, or clear your CRM data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Export all your data to a JSON file for backup or migration.
                  </p>
                  <Button onClick={handleExportData} variant="secondary" className="w-fit">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Import data from a previously exported JSON file.</p>
                  <Button onClick={handleImportData} variant="secondary" className="w-fit">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Data
                  </Button>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <p className="text-sm text-destructive">Permanently delete all data. This action cannot be undone.</p>
                  <Button onClick={handleClearData} variant="destructive" className="w-fit">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Workflow Reference</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Quick reference for your sales workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Direct Leads</h4>
                  <p className="text-sm text-muted-foreground">
                    Webform submissions come to Linda → Forwarded to you when busy → Send templated enquiry email →
                    Convert or drop-off
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Cold Outreach</h4>
                  <p className="text-sm text-muted-foreground">
                    Phone calls, social media engagement → Schedule follow-ups → Send templated emails → Convert or
                    drop-off
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Semi-Cold Outreach</h4>
                  <p className="text-sm text-muted-foreground">
                    Re-engage previous enquiries/clients → Confirm interest → Send follow-up email → Convert or drop-off
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
