"use client"

import { useEffect, useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getLeads, getContacts, getFollowUps, getActivities } from "@/lib/store"
import type { Lead, Contact, FollowUp, Activity, LeadSource, LeadStatus } from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Users, Target } from "lucide-react"
import { format, subDays, startOfDay } from "date-fns"

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#a1a1a1", "#ef4444", "#8b5cf6"]

const sourceLabels: Record<LeadSource, string> = {
  webform: "Webform",
  cold_call: "Cold Call",
  social_media: "Social Media",
  previous_enquiry: "Previous Enquiry",
  previous_client: "Previous Client",
  forwarded: "Forwarded",
}

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow Up",
  qualified: "Qualified",
  converted: "Converted",
  dropped: "Dropped",
}

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    const loadData = () => {
      setLeads(getLeads())
      setContacts(getContacts())
      setFollowUps(getFollowUps())
      setActivities(getActivities())
    }
    loadData()
    window.addEventListener("storage", loadData)
    return () => window.removeEventListener("storage", loadData)
  }, [])

  const stats = useMemo(() => {
    const converted = leads.filter((l) => l.status === "converted").length
    const dropped = leads.filter((l) => l.status === "dropped").length
    const active = leads.filter((l) => !["converted", "dropped"].includes(l.status)).length
    const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0
    const dropRate = leads.length > 0 ? Math.round((dropped / leads.length) * 100) : 0

    const totalValue = leads
      .filter((l) => l.status === "converted" && l.value)
      .reduce((sum, l) => sum + (l.value || 0), 0)

    const pendingFollowUps = followUps.filter((f) => !f.completed).length
    const completedFollowUps = followUps.filter((f) => f.completed).length

    return {
      totalLeads: leads.length,
      converted,
      dropped,
      active,
      conversionRate,
      dropRate,
      totalValue,
      pendingFollowUps,
      completedFollowUps,
    }
  }, [leads, followUps])

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    leads.forEach((lead) => {
      const label = sourceLabels[lead.source]
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [leads])

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    leads.forEach((lead) => {
      const label = statusLabels[lead.status]
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [leads])

  const conversionBySource = useMemo(() => {
    const sourceStats: Record<string, { total: number; converted: number }> = {}
    leads.forEach((lead) => {
      const label = sourceLabels[lead.source]
      if (!sourceStats[label]) {
        sourceStats[label] = { total: 0, converted: 0 }
      }
      sourceStats[label].total++
      if (lead.status === "converted") {
        sourceStats[label].converted++
      }
    })
    return Object.entries(sourceStats).map(([name, data]) => ({
      name,
      rate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
      total: data.total,
    }))
  }, [leads])

  const activityTimeline = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      return {
        date: format(date, "EEE"),
        fullDate: startOfDay(date),
        activities: 0,
        leads: 0,
      }
    })

    activities.forEach((activity) => {
      const activityDate = startOfDay(new Date(activity.createdAt))
      const dayIndex = last7Days.findIndex((d) => d.fullDate.getTime() === activityDate.getTime())
      if (dayIndex >= 0) {
        last7Days[dayIndex].activities++
      }
    })

    leads.forEach((lead) => {
      const leadDate = startOfDay(new Date(lead.createdAt))
      const dayIndex = last7Days.findIndex((d) => d.fullDate.getTime() === leadDate.getTime())
      if (dayIndex >= 0) {
        last7Days[dayIndex].leads++
      }
    })

    return last7Days
  }, [activities, leads])

  const assignmentData = useMemo(() => {
    const linda = leads.filter((l) => l.assignedTo === "linda").length
    const me = leads.filter((l) => l.assignedTo === "me").length
    return [
      { name: "Linda", value: linda },
      { name: "Me", value: me },
    ]
  }, [leads])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64">
        <Header title="Analytics" subtitle="Track your sales performance" />
        <div className="p-6">
          {/* Key Metrics */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.converted} of {stats.totalLeads} leads converted
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Drop-off Rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.dropRate}%</div>
                <p className="text-xs text-muted-foreground">{stats.dropped} leads dropped off</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pipeline Value</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${stats.totalValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From converted leads</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
                <Users className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.active}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Lead Sources Pie Chart */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Lead Sources</CardTitle>
                <CardDescription className="text-muted-foreground">Distribution of leads by source</CardDescription>
              </CardHeader>
              <CardContent>
                {sourceData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {sourceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141414",
                          border: "1px solid #262626",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pipeline Status Bar Chart */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Pipeline Status</CardTitle>
                <CardDescription className="text-muted-foreground">Leads by current status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="name" stroke="#a1a1a1" tick={{ fill: "#a1a1a1" }} />
                      <YAxis stroke="#a1a1a1" tick={{ fill: "#a1a1a1" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141414",
                          border: "1px solid #262626",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Conversion by Source */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Conversion by Source</CardTitle>
                <CardDescription className="text-muted-foreground">Which sources convert best</CardDescription>
              </CardHeader>
              <CardContent>
                {conversionBySource.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={conversionBySource} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis type="number" stroke="#a1a1a1" tick={{ fill: "#a1a1a1" }} unit="%" />
                      <YAxis dataKey="name" type="category" width={100} stroke="#a1a1a1" tick={{ fill: "#a1a1a1" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141414",
                          border: "1px solid #262626",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value}%`, "Conversion Rate"]}
                      />
                      <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Activity Timeline</CardTitle>
                <CardDescription className="text-muted-foreground">Last 7 days activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#a1a1a1" tick={{ fill: "#a1a1a1" }} />
                    <YAxis stroke="#a1a1a1" tick={{ fill: "#a1a1a1" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141414",
                        border: "1px solid #262626",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="activities"
                      name="Activities"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="leads"
                      name="New Leads"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Assignment Distribution */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Lead Assignment</CardTitle>
              <CardDescription className="text-muted-foreground">Distribution between Linda and you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-12">
                {assignmentData.map((item, index) => (
                  <div key={item.name} className="text-center">
                    <div
                      className="mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${COLORS[index]}20` }}
                    >
                      <span className="text-2xl font-bold" style={{ color: COLORS[index] }}>
                        {item.value}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {leads.length > 0 ? `${Math.round((item.value / leads.length) * 100)}%` : "0%"} of leads
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
