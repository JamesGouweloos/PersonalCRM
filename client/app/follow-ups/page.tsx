"use client"


export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo , Suspense} from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getFollowUps, getContacts, getLeads, saveFollowUp, deleteFollowUp, addActivity, generateId } from "@/lib/store"
import type { FollowUp, Contact, Lead } from "@/lib/types"
import { Phone, Mail, Share2, MoreVertical, Trash2, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { format, isToday, isTomorrow, isPast, isThisWeek } from "date-fns"

const typeIcons = {
  call: Phone,
  email: Mail,
  social: Share2,
}

function FollowUpsPageContent() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [leads, setLeads] = useState<Record<string, Lead>>({})
  const [filterType, setFilterType] = useState<FollowUp["type"] | "all">("all")

  const loadData = () => {
    const followUpsData = getFollowUps()
    const contactsData = getContacts()
    const leadsData = getLeads()
    setFollowUps(followUpsData)
    setContacts(
      contactsData.reduce(
        (acc, c) => {
          acc[c.id] = c
          return acc
        },
        {} as Record<string, Contact>,
      ),
    )
    setLeads(
      leadsData.reduce(
        (acc, l) => {
          acc[l.id] = l
          return acc
        },
        {} as Record<string, Lead>,
      ),
    )
  }

  useEffect(() => {
    loadData()
    window.addEventListener("storage", loadData)
    return () => window.removeEventListener("storage", loadData)
  }, [])

  const { pending, completed, overdue, todayTasks, thisWeekTasks } = useMemo(() => {
    const filtered = followUps.filter((f) => filterType === "all" || f.type === filterType)
    const pending = filtered.filter((f) => !f.completed)
    const completed = filtered.filter((f) => f.completed)
    const overdue = pending.filter((f) => isPast(new Date(f.scheduledDate)) && !isToday(new Date(f.scheduledDate)))
    const todayTasks = pending.filter((f) => isToday(new Date(f.scheduledDate)))
    const thisWeekTasks = pending.filter(
      (f) =>
        isThisWeek(new Date(f.scheduledDate)) &&
        !isToday(new Date(f.scheduledDate)) &&
        !isPast(new Date(f.scheduledDate)),
    )
    return { pending, completed, overdue, todayTasks, thisWeekTasks }
  }, [followUps, filterType])

  const handleToggleComplete = (followUp: FollowUp) => {
    const now = new Date().toISOString()
    saveFollowUp({
      ...followUp,
      completed: !followUp.completed,
    })

    if (!followUp.completed) {
      addActivity({
        id: generateId(),
        leadId: followUp.leadId,
        contactId: followUp.contactId,
        type: followUp.type === "call" ? "call_made" : "email_sent",
        description: `Follow-up ${followUp.type} completed`,
        createdAt: now,
      })
    }

    loadData()
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this follow-up?")) {
      deleteFollowUp(id)
      loadData()
    }
  }

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    if (isPast(date)) return "Overdue"
    return format(date, "EEE, MMM d")
  }

  const getDateBadgeClass = (date: Date, completed: boolean) => {
    if (completed) return "bg-accent/10 text-accent"
    if (isPast(date) && !isToday(date)) return "bg-destructive/10 text-destructive"
    if (isToday(date)) return "bg-warning/10 text-warning"
    return "bg-muted text-muted-foreground"
  }

  const FollowUpCard = ({ followUp }: { followUp: FollowUp }) => {
    const contact = contacts[followUp.contactId]
    const lead = leads[followUp.leadId]
    const Icon = typeIcons[followUp.type]
    const date = new Date(followUp.scheduledDate)

    if (!contact) return null

    return (
      <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
        <Checkbox
          checked={followUp.completed}
          onCheckedChange={() => handleToggleComplete(followUp)}
          className="mt-1"
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className={`font-medium ${followUp.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {followUp.type === "call" && "Call "}
                {followUp.type === "email" && "Email "}
                {followUp.type === "social" && "Message "}
                {contact.name}
              </p>
              <p className="text-sm text-muted-foreground">{contact.email}</p>
              {followUp.notes && <p className="mt-1 text-sm text-muted-foreground">{followUp.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getDateBadgeClass(date, followUp.completed)}>
                {followUp.completed ? "Completed" : getDateLabel(date)}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDelete(followUp.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-w-0 overflow-x-hidden">
        <Header title="Follow-ups" subtitle="Manage your scheduled follow-ups" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Overdue
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{overdue.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    Today
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{todayTasks.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    This Week
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{thisWeekTasks.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    Completed
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{completed.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="mb-6 flex items-center gap-4">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FollowUp["type"] | "all")}>
              <SelectTrigger className="w-[150px] bg-secondary">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="call">Phone Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="bg-secondary">
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pending.length === 0 ? (
                <Card className="bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No pending follow-ups. Schedule follow-ups from the Leads page.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {overdue.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Overdue ({overdue.length})
                      </h3>
                      <div className="space-y-3">
                        {overdue.map((followUp) => (
                          <FollowUpCard key={followUp.id} followUp={followUp} />
                        ))}
                      </div>
                    </div>
                  )}

                  {todayTasks.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-warning flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Today ({todayTasks.length})
                      </h3>
                      <div className="space-y-3">
                        {todayTasks.map((followUp) => (
                          <FollowUpCard key={followUp.id} followUp={followUp} />
                        ))}
                      </div>
                    </div>
                  )}

                  {thisWeekTasks.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-primary flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        This Week ({thisWeekTasks.length})
                      </h3>
                      <div className="space-y-3">
                        {thisWeekTasks.map((followUp) => (
                          <FollowUpCard key={followUp.id} followUp={followUp} />
                        ))}
                      </div>
                    </div>
                  )}

                  {pending.filter(
                    (f) =>
                      !isPast(new Date(f.scheduledDate)) &&
                      !isToday(new Date(f.scheduledDate)) &&
                      !isThisWeek(new Date(f.scheduledDate)),
                  ).length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Upcoming
                      </h3>
                      <div className="space-y-3">
                        {pending
                          .filter(
                            (f) =>
                              !isPast(new Date(f.scheduledDate)) &&
                              !isToday(new Date(f.scheduledDate)) &&
                              !isThisWeek(new Date(f.scheduledDate)),
                          )
                          .map((followUp) => (
                            <FollowUpCard key={followUp.id} followUp={followUp} />
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3">
              {completed.length === 0 ? (
                <Card className="bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">No completed follow-ups yet.</p>
                  </CardContent>
                </Card>
              ) : (
                completed.map((followUp) => <FollowUpCard key={followUp.id} followUp={followUp} />)
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}



export default function FollowUpsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" /><main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></main></div>}>
      <FollowUpsPageContent />
    </Suspense>
  )
}