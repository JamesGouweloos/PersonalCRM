"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { StatsCard } from "@/components/stats-card"
import { RecentActivity } from "@/components/recent-activity"
import { PipelineOverview } from "@/components/pipeline-overview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SocialInteractionDialog } from "@/components/social-interaction-dialog"
import { WebformSubmissionDialog } from "@/components/webform-submission-dialog"
import { getLeads, getContacts, getFollowUps, getOpportunities } from "@/lib/store"
import { Users, UserPlus, Calendar, TrendingUp, Facebook, Instagram, Linkedin, FileText, Plus } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalOpportunities: 0,
    totalContacts: 0,
    pendingFollowUps: 0,
    conversionRate: 0,
  })
  const [showFacebookDialog, setShowFacebookDialog] = useState(false)
  const [showInstagramDialog, setShowInstagramDialog] = useState(false)
  const [showLinkedInDialog, setShowLinkedInDialog] = useState(false)
  const [showWebformDialog, setShowWebformDialog] = useState(false)

  useEffect(() => {
    const loadStats = () => {
      const leads = getLeads()
      const opportunities = getOpportunities()
      const contacts = getContacts()
      const followUps = getFollowUps()

      const converted = opportunities.filter((o) => o.status === "won").length
      const total = opportunities.length
      const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

      const pendingFollowUps = followUps.filter((f) => !f.completed && new Date(f.scheduledDate) >= new Date()).length

      setStats({
        totalLeads: leads.length,
        totalOpportunities: opportunities.length,
        totalContacts: contacts.length,
        pendingFollowUps,
        conversionRate,
      })
    }

    loadStats()
    window.addEventListener("storage", loadStats)
    return () => window.removeEventListener("storage", loadStats)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64">
        <Header title="Dashboard" subtitle="Overview of your sales pipeline" />
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Leads"
              value={stats.totalLeads}
              change="+12%"
              changeType="positive"
              icon={UserPlus}
            />
            <StatsCard
              title="Opportunities"
              value={stats.totalOpportunities}
              change="+8%"
              changeType="positive"
              icon={TrendingUp}
            />
            <StatsCard
              title="Total Contacts"
              value={stats.totalContacts}
              change="+5%"
              changeType="positive"
              icon={Users}
            />
            <StatsCard
              title="Pending Follow-ups"
              value={stats.pendingFollowUps}
              change={stats.pendingFollowUps > 5 ? "High" : "Normal"}
              changeType={stats.pendingFollowUps > 5 ? "negative" : "neutral"}
              icon={Calendar}
            />
          </div>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={() => setShowWebformDialog(true)}
                >
                  <FileText className="mb-2 h-6 w-6" />
                  <span>Webform</span>
                  <span className="text-xs text-muted-foreground mt-1">Submission</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={() => setShowFacebookDialog(true)}
                >
                  <Facebook className="mb-2 h-6 w-6 text-blue-600" />
                  <span>Facebook</span>
                  <span className="text-xs text-muted-foreground mt-1">Interaction</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={() => setShowInstagramDialog(true)}
                >
                  <Instagram className="mb-2 h-6 w-6 text-pink-600" />
                  <span>Instagram</span>
                  <span className="text-xs text-muted-foreground mt-1">Interaction</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={() => setShowLinkedInDialog(true)}
                >
                  <Linkedin className="mb-2 h-6 w-6 text-blue-700" />
                  <span>LinkedIn</span>
                  <span className="text-xs text-muted-foreground mt-1">Interaction</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <PipelineOverview />
            <RecentActivity />
          </div>
        </div>
      </main>

      <SocialInteractionDialog
        open={showFacebookDialog}
        onOpenChange={setShowFacebookDialog}
        platform="facebook"
        onSave={() => {
          const loadStats = () => {
            const opportunities = getOpportunities()
            setStats(prev => ({ ...prev, totalOpportunities: opportunities.length }))
          }
          loadStats()
        }}
      />
      <SocialInteractionDialog
        open={showInstagramDialog}
        onOpenChange={setShowInstagramDialog}
        platform="instagram"
        onSave={() => {
          const loadStats = () => {
            const opportunities = getOpportunities()
            setStats(prev => ({ ...prev, totalOpportunities: opportunities.length }))
          }
          loadStats()
        }}
      />
      <SocialInteractionDialog
        open={showLinkedInDialog}
        onOpenChange={setShowLinkedInDialog}
        platform="linkedin"
        onSave={() => {
          const loadStats = () => {
            const opportunities = getOpportunities()
            setStats(prev => ({ ...prev, totalOpportunities: opportunities.length }))
          }
          loadStats()
        }}
      />
      <WebformSubmissionDialog
        open={showWebformDialog}
        onOpenChange={setShowWebformDialog}
        onSave={() => {
          const loadStats = () => {
            const opportunities = getOpportunities()
            setStats(prev => ({ ...prev, totalOpportunities: opportunities.length }))
          }
          loadStats()
        }}
      />
    </div>
  )
}
