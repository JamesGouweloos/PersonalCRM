import type { Contact, Lead, FollowUp, EmailTemplate, Activity, Opportunity, CallLog, CommissionSnapshot, AuditTrail, Dispute } from "./types"

const STORAGE_KEYS = {
  contacts: "crm_contacts",
  leads: "crm_leads",
  notInterested: "crm_not_interested",
  opportunities: "crm_opportunities",
  followUps: "crm_follow_ups",
  templates: "crm_templates",
  activities: "crm_activities",
  callLogs: "crm_call_logs",
  commissionSnapshots: "crm_commission_snapshots",
  auditTrail: "crm_audit_trail",
  disputes: "crm_disputes",
}

// Helper functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : defaultValue
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

// Contacts
export function getContacts(): Contact[] {
  return getFromStorage<Contact[]>(STORAGE_KEYS.contacts, [])
}

export function saveContact(contact: Contact): void {
  const contacts = getContacts()
  const index = contacts.findIndex((c) => c.id === contact.id)
  if (index >= 0) {
    contacts[index] = contact
  } else {
    contacts.push(contact)
  }
  saveToStorage(STORAGE_KEYS.contacts, contacts)
}

export function deleteContact(id: string): void {
  const contacts = getContacts().filter((c) => c.id !== id)
  saveToStorage(STORAGE_KEYS.contacts, contacts)
}

// Leads
export function getLeads(): Lead[] {
  return getFromStorage<Lead[]>(STORAGE_KEYS.leads, [])
}

export function saveLead(lead: Lead): void {
  const leads = getLeads()
  const index = leads.findIndex((l) => l.id === lead.id)
  if (index >= 0) {
    leads[index] = lead
  } else {
    leads.push(lead)
  }
  saveToStorage(STORAGE_KEYS.leads, leads)
}

export function deleteLead(id: string): void {
  const leads = getLeads().filter((l) => l.id !== id)
  saveToStorage(STORAGE_KEYS.leads, leads)
}

// Follow-ups
export function getFollowUps(): FollowUp[] {
  return getFromStorage<FollowUp[]>(STORAGE_KEYS.followUps, [])
}

export function saveFollowUp(followUp: FollowUp): void {
  const followUps = getFollowUps()
  const index = followUps.findIndex((f) => f.id === followUp.id)
  if (index >= 0) {
    followUps[index] = followUp
  } else {
    followUps.push(followUp)
  }
  saveToStorage(STORAGE_KEYS.followUps, followUps)
}

export function deleteFollowUp(id: string): void {
  const followUps = getFollowUps().filter((f) => f.id !== id)
  saveToStorage(STORAGE_KEYS.followUps, followUps)
}

// Email Templates
export function getTemplates(): EmailTemplate[] {
  return getFromStorage<EmailTemplate[]>(STORAGE_KEYS.templates, defaultTemplates)
}

export function saveTemplate(template: EmailTemplate): void {
  const templates = getTemplates()
  const index = templates.findIndex((t) => t.id === template.id)
  if (index >= 0) {
    templates[index] = template
  } else {
    templates.push(template)
  }
  saveToStorage(STORAGE_KEYS.templates, templates)
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id)
  saveToStorage(STORAGE_KEYS.templates, templates)
}

// Activities
export function getActivities(): Activity[] {
  return getFromStorage<Activity[]>(STORAGE_KEYS.activities, [])
}

export function addActivity(activity: Activity): void {
  const activities = getActivities()
  activities.unshift(activity)
  // Keep only last 100 activities
  saveToStorage(STORAGE_KEYS.activities, activities.slice(0, 100))
}

// Opportunities
export function getOpportunities(): Opportunity[] {
  return getFromStorage<Opportunity[]>(STORAGE_KEYS.opportunities, [])
}

export function saveOpportunity(opportunity: Opportunity): void {
  const opportunities = getOpportunities()
  const index = opportunities.findIndex((o) => o.id === opportunity.id)
  if (index >= 0) {
    opportunities[index] = opportunity
  } else {
    opportunities.push(opportunity)
  }
  saveToStorage(STORAGE_KEYS.opportunities, opportunities)
  
  // Create audit trail entry for changes
  if (index >= 0) {
    const oldOpp = opportunities[index]
    // Log key field changes
    const fieldsToTrack = ['status', 'assignedTo', 'value', 'source', 'subSource']
    fieldsToTrack.forEach(field => {
      if (oldOpp[field as keyof Opportunity] !== opportunity[field as keyof Opportunity]) {
        addAuditTrail({
          id: generateId(),
          opportunityId: opportunity.id,
          fieldName: field,
          oldValue: String(oldOpp[field as keyof Opportunity] || ''),
          newValue: String(opportunity[field as keyof Opportunity] || ''),
          changedBy: 'me', // TODO: Get from auth context
          changedAt: new Date().toISOString(),
        })
      }
    })
  }
}

export function deleteOpportunity(id: string): void {
  const opportunities = getOpportunities()
  const opp = opportunities.find(o => o.id === id)
  if (opp && opp.status === 'won') {
    throw new Error('Cannot delete closed won opportunity. Use reversal instead.')
  }
  const filtered = opportunities.filter((o) => o.id !== id)
  saveToStorage(STORAGE_KEYS.opportunities, filtered)
}

// Call Logs
export function getCallLogs(opportunityId?: string): CallLog[] {
  const logs = getFromStorage<CallLog[]>(STORAGE_KEYS.callLogs, [])
  if (opportunityId) {
    return logs.filter(log => log.opportunityId === opportunityId)
  }
  return logs
}

export function saveCallLog(callLog: CallLog): void {
  const logs = getCallLogs()
  const index = logs.findIndex((l) => l.id === callLog.id)
  if (index >= 0) {
    logs[index] = callLog
  } else {
    logs.push(callLog)
  }
  saveToStorage(STORAGE_KEYS.callLogs, logs)
  
  // Create activity record
  addActivity({
    id: generateId(),
    opportunityId: callLog.opportunityId,
    contactId: callLog.contactId,
    type: callLog.direction === 'inbound' ? 'call_received' : 'call_made',
    description: `Call ${callLog.direction === 'inbound' ? 'received from' : 'made to'} ${callLog.phoneNumber}${callLog.outcome ? ` - ${callLog.outcome}` : ''}`,
    direction: callLog.direction,
    user: callLog.user,
    callDuration: callLog.duration,
    callOutcome: callLog.outcome,
    createdAt: callLog.occurredAt,
  })
}

// Commission Snapshots
export function getCommissionSnapshot(opportunityId: string): CommissionSnapshot | null {
  const snapshots = getFromStorage<CommissionSnapshot[]>(STORAGE_KEYS.commissionSnapshots, [])
  return snapshots.find(s => s.opportunityId === opportunityId) || null
}

export function saveCommissionSnapshot(snapshot: CommissionSnapshot): void {
  const snapshots = getFromStorage<CommissionSnapshot[]>(STORAGE_KEYS.commissionSnapshots, [])
  const index = snapshots.findIndex((s) => s.id === snapshot.id)
  if (index >= 0) {
    snapshots[index] = snapshot
  } else {
    snapshots.push(snapshot)
  }
  saveToStorage(STORAGE_KEYS.commissionSnapshots, snapshots)
}

// Audit Trail
export function getAuditTrail(opportunityId: string): AuditTrail[] {
  const trail = getFromStorage<AuditTrail[]>(STORAGE_KEYS.auditTrail, [])
  return trail.filter(t => t.opportunityId === opportunityId).sort((a, b) => 
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )
}

export function addAuditTrail(entry: AuditTrail): void {
  const trail = getFromStorage<AuditTrail[]>(STORAGE_KEYS.auditTrail, [])
  trail.push(entry)
  saveToStorage(STORAGE_KEYS.auditTrail, trail)
}

// Disputes
export function getDisputes(opportunityId?: string): Dispute[] {
  const disputes = getFromStorage<Dispute[]>(STORAGE_KEYS.disputes, [])
  if (opportunityId) {
    return disputes.filter(d => d.opportunityId === opportunityId)
  }
  return disputes
}

export function saveDispute(dispute: Dispute): void {
  const disputes = getDisputes()
  const index = disputes.findIndex((d) => d.id === dispute.id)
  if (index >= 0) {
    disputes[index] = { ...dispute, updatedAt: new Date().toISOString() }
  } else {
    disputes.push(dispute)
  }
  saveToStorage(STORAGE_KEYS.disputes, disputes)
}

// Not Interested Leads
export function getNotInterestedLeads(): Lead[] {
  return getFromStorage<Lead[]>(STORAGE_KEYS.notInterested, [])
}

export function addNotInterestedLead(lead: Lead, reason?: string): void {
  const notInterested = getNotInterestedLeads()
  // Add reason as notes if provided
  const leadWithReason: Lead = {
    ...lead,
    notes: reason ? `${lead.notes || ''}\n\nNot Interested Reason: ${reason}`.trim() : lead.notes,
    status: "dropped" as LeadStatus,
  }
  notInterested.push(leadWithReason)
  saveToStorage(STORAGE_KEYS.notInterested, notInterested)
  
  // Remove from active leads
  deleteLead(lead.id)
  
  // Add activity
  addActivity({
    id: generateId(),
    leadId: lead.id,
    contactId: lead.contactId,
    type: "status_changed",
    description: `Lead marked as "Not interested at this time"${reason ? `: ${reason}` : ''}`,
    user: "me", // TODO: Get from auth
    createdAt: new Date().toISOString(),
  })
}

// Lead Conversion Functions
export function convertLeadToOpportunity(lead: Lead, contact: Contact, subSource?: string): Opportunity {
  // Map lead source to opportunity source
  const sourceMap: Record<LeadSource, OpportunitySource> = {
    webform: "webform",
    cold_call: "cold_outreach",
    social_media: "social",
    previous_enquiry: "previous_enquiry",
    previous_client: "previous_client",
    forwarded: "forwarded",
  }
  
  const opportunity: Opportunity = {
    id: generateId(),
    title: `Opportunity - ${contact.name}`,
    contactId: lead.contactId,
    source: sourceMap[lead.source],
    subSource: subSource || getDefaultSubSource(lead.source),
    assignedTo: lead.assignedTo,
    status: "open",
    value: lead.value,
    currency: "USD",
    notes: lead.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  saveOpportunity(opportunity)
  
  // Remove from leads
  deleteLead(lead.id)
  
  // Add activity
  addActivity({
    id: generateId(),
    opportunityId: opportunity.id,
    contactId: contact.id,
    type: "note_added",
    description: `Lead converted to Opportunity (Enquiry)`,
    user: "me", // TODO: Get from auth
    createdAt: new Date().toISOString(),
  })
  
  return opportunity
}

function getDefaultSubSource(leadSource: LeadSource): string {
  const defaults: Record<LeadSource, string> = {
    webform: "Website Form",
    cold_call: "Phone – Outbound",
    social_media: "Social Media – Organic",
    previous_enquiry: "Reactivation",
    previous_client: "Return Guest",
    forwarded: "Email Forward",
  }
  return defaults[leadSource] || "Unknown"
}

// Default templates for Outlook integration
const defaultTemplates: EmailTemplate[] = [
  {
    id: "template-1",
    name: "Initial Enquiry Response",
    subject: "Thank you for your enquiry",
    body: `Dear {{name}},

Thank you for your enquiry about our services. We appreciate your interest and would love to help you.

I'll be reviewing your requirements and will get back to you shortly with more details about how we can assist you.

In the meantime, please don't hesitate to reach out if you have any questions.

Best regards`,
    type: "enquiry",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template-2",
    name: "Follow-up After Call",
    subject: "Following up on our conversation",
    body: `Dear {{name}},

It was great speaking with you today. As discussed, I wanted to follow up with the details we covered.

{{notes}}

Please let me know if you have any questions or would like to proceed.

Best regards`,
    type: "follow_up",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template-3",
    name: "Promotion Outreach",
    subject: "Special Offer Just for You",
    body: `Dear {{name}},

I hope this email finds you well. I wanted to reach out to let you know about our current promotion.

{{promotion_details}}

This offer is available for a limited time, so please don't hesitate to get in touch if you're interested.

Best regards`,
    type: "promotion",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "template-4",
    name: "Previous Client Return",
    subject: "We'd love to have you back!",
    body: `Dear {{name}},

I hope you're doing well! It's been a while since your last stay with us, and we've been thinking about you.

We'd love to welcome you back. Please let me know if you're interested in planning another visit.

Best regards`,
    type: "return_client",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
