"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OpportunityFormDialog } from "@/components/opportunity-form-dialog"
import { CallLogDialog } from "@/components/call-log-dialog"
import { getOpportunities, getContacts, getActivities, getCallLogs, getAuditTrail, getCommissionSnapshot, getDisputes, saveOpportunity, generateId, addActivity } from "@/lib/store"
import type { Opportunity, Contact, Activity, CallLog, AuditTrail, CommissionSnapshot, Dispute } from "@/lib/types"
import { Phone, Mail, ExternalLink, Calendar, DollarSign, User, FileText, AlertCircle, CheckCircle2, XCircle, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500",
  won: "bg-green-500/10 text-green-500",
  lost: "bg-gray-500/10 text-gray-500",
  reversed: "bg-orange-500/10 text-orange-500",
}

const SOURCE_COLORS: Record<string, string> = {
  webform: "bg-purple-500/10 text-purple-500",
  cold_outreach: "bg-yellow-500/10 text-yellow-500",
  social: "bg-pink-500/10 text-pink-500",
  previous_enquiry: "bg-cyan-500/10 text-cyan-500",
  previous_client: "bg-emerald-500/10 text-emerald-500",
  forwarded: "bg-indigo-500/10 text-indigo-500",
}

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const opportunityId = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>([])
  const [commissionSnapshot, setCommissionSnapshot] = useState<CommissionSnapshot | null>(null)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCallLogDialog, setShowCallLogDialog] = useState(false)

  useEffect(() => {
    loadData()
    window.addEventListener("storage", loadData)
    return () => window.removeEventListener("storage", loadData)
  }, [opportunityId])

  const loadData = () => {
    const opps = getOpportunities()
    const opp = opps.find(o => o.id === opportunityId)
    if (!opp) {
      router.push("/opportunities")
      return
    }
    setOpportunity(opp)

    const contacts = getContacts()
    const contactData = contacts.find(c => c.id === opp.contactId)
    setContact(contactData || null)

    const allActivities = getActivities()
    setActivities(allActivities.filter(a => a.opportunityId === opportunityId || a.leadId === opportunityId))

    setCallLogs(getCallLogs(opportunityId))
    setAuditTrail(getAuditTrail(opportunityId))
    setCommissionSnapshot(getCommissionSnapshot(opportunityId))
    setDisputes(getDisputes(opportunityId))
  }

  const handleStatusChange = (newStatus: "open" | "won" | "lost" | "reversed") => {
    if (!opportunity) return

    if (newStatus === "won" && opportunity.status !== "won") {
      // Create commission snapshot
      const snapshot: CommissionSnapshot = {
        id: generateId(),
        opportunityId: opportunity.id,
        finalValue: opportunity.value || 0,
        currency: opportunity.currency || "USD",
        commissionableAmount: opportunity.value || 0,
        owner: opportunity.assignedTo,
        source: opportunity.source,
        subSource: opportunity.subSource,
        firstTouchDate: activities[0]?.createdAt,
        firstTouchActivityType: activities[0]?.type,
        closedAt: new Date().toISOString(),
        lockedBy: "me", // TODO: Get from auth
        createdAt: new Date().toISOString(),
      }
      const { saveCommissionSnapshot } = require("@/lib/store")
      saveCommissionSnapshot(snapshot)
    }

    const updated: Opportunity = {
      ...opportunity,
      status: newStatus,
      closedAt: newStatus === "won" || newStatus === "lost" ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    }
    saveOpportunity(updated)
    loadData()
  }

  if (!opportunity || !contact) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-6">Loading...</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64">
        <Header title={opportunity.title} subtitle={`Opportunity Details - ${contact.name}`} />
        <div className="p-6">
          {/* Header Actions */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={STATUS_COLORS[opportunity.status]}>{opportunity.status}</Badge>
              <Badge className={SOURCE_COLORS[opportunity.source]}>{opportunity.source.replace('_', ' ')}</Badge>
              <span className="text-sm text-muted-foreground">{opportunity.subSource}</span>
            </div>
            <div className="flex gap-2">
              {opportunity.status === "open" && (
                <>
                  <Button variant="outline" onClick={() => setShowCallLogDialog(true)}>
                    <Phone className="mr-2 h-4 w-4" />
                    Log Call
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange("won")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Won
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange("lost")}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Mark Lost
                  </Button>
                </>
              )}
              {opportunity.status === "won" && (
                <Button variant="outline" onClick={() => handleStatusChange("reversed")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reverse
                </Button>
              )}
              <Button onClick={() => setShowEditDialog(true)} disabled={opportunity.status === "won"}>
                Edit
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="calls">Call Logs</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              {opportunity.status === "won" && <TabsTrigger value="commission">Commission</TabsTrigger>}
              {disputes.length > 0 && <TabsTrigger value="disputes">Disputes</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{contact.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{contact.email}</p>
                    </div>
                    {contact.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{contact.phone}</p>
                      </div>
                    )}
                    {contact.company && (
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{contact.company}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Opportunity Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned To</p>
                      <p className="font-medium capitalize">{opportunity.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Value</p>
                      <p className="font-medium">
                        {opportunity.value ? `${opportunity.currency || "USD"} ${opportunity.value.toLocaleString()}` : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{format(new Date(opportunity.createdAt), "PPp")}</p>
                    </div>
                    {opportunity.closedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Closed</p>
                        <p className="font-medium">{format(new Date(opportunity.closedAt), "PPp")}</p>
                      </div>
                    )}
                    {opportunity.linkedOpportunityId && (
                      <div>
                        <p className="text-sm text-muted-foreground">Linked Opportunity</p>
                        <Link href={`/opportunities/${opportunity.linkedOpportunityId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            View Linked
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {opportunity.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{opportunity.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activities recorded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-4 border-l-2 border-border pl-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {activity.type === "email_sent" || activity.type === "email_received" ? (
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              ) : activity.type === "call_made" || activity.type === "call_received" ? (
                                <Phone className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                              <p className="font-medium">{activity.description}</p>
                              {activity.deepLink && (
                                <a href={activity.deepLink} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </a>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{format(new Date(activity.createdAt), "PPp")}</span>
                              <span>by {activity.user}</span>
                              {activity.direction && (
                                <Badge variant="outline">{activity.direction}</Badge>
                              )}
                              {activity.platform && (
                                <Badge variant="outline">{activity.platform}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calls" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Call Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {callLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No call logs recorded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {callLogs.map((call) => (
                        <div key={call.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{call.phoneNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(call.occurredAt), "PPp")} • {call.direction} • {call.user}
                              </p>
                              {call.outcome && (
                                <p className="text-sm mt-1">{call.outcome}</p>
                              )}
                              {call.originList && (
                                <p className="text-xs text-muted-foreground mt-1">Origin: {call.originList}</p>
                              )}
                            </div>
                            {call.duration && (
                              <Badge>{Math.floor(call.duration / 60)}m {call.duration % 60}s</Badge>
                            )}
                          </div>
                          {call.notes && (
                            <p className="text-sm mt-2 text-muted-foreground">{call.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Trail</CardTitle>
                </CardHeader>
                <CardContent>
                  {auditTrail.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {auditTrail.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="font-medium">{entry.fieldName}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.oldValue ? `${entry.oldValue} → ${entry.newValue}` : `Set to ${entry.newValue}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{entry.changedBy}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(entry.changedAt), "PPp")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {opportunity.status === "won" && (
              <TabsContent value="commission" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Commission Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {commissionSnapshot ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Final Value</p>
                            <p className="text-2xl font-bold">{commissionSnapshot.currency} {commissionSnapshot.finalValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Commissionable Amount</p>
                            <p className="text-2xl font-bold">{commissionSnapshot.currency} {commissionSnapshot.commissionableAmount.toLocaleString()}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Owner</p>
                          <p className="font-medium capitalize">{commissionSnapshot.owner}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Origin</p>
                          <p className="font-medium">{commissionSnapshot.source} - {commissionSnapshot.subSource}</p>
                        </div>
                        {commissionSnapshot.firstTouchDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">First Touch</p>
                            <p className="font-medium">{format(new Date(commissionSnapshot.firstTouchDate), "PPp")}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Locked By</p>
                          <p className="font-medium">{commissionSnapshot.lockedBy}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No commission snapshot available.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      <OpportunityFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        existingOpportunity={opportunity}
        existingContact={contact}
        onSave={loadData}
      />

      <CallLogDialog
        open={showCallLogDialog}
        onOpenChange={setShowCallLogDialog}
        opportunityId={opportunityId}
        contactId={contact.id}
        onSave={loadData}
      />
    </div>
  )
}


