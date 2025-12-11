export type OpportunitySource = "webform" | "cold_outreach" | "social" | "previous_enquiry" | "previous_client" | "forwarded"

export type OpportunityStatus = "open" | "won" | "lost" | "reversed"

export type LeadStatus = "new" | "contacted" | "follow_up" | "qualified" | "converted" | "dropped"

export type LeadSource = "webform" | "cold_call" | "social_media" | "previous_enquiry" | "previous_client" | "forwarded"

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  notes?: string
  contact_type?: "Agent" | "Direct" | "Other" | "Spam" | "Internal"
  createdAt: string
  updatedAt: string
}

export interface Opportunity {
  id: string
  title: string
  contactId: string
  source: OpportunitySource
  subSource: string // e.g., "Instagram DM", "LinkedIn InMail", "Website Form – Special Offer"
  linkedOpportunityId?: string // For reactivations
  assignedTo: "linda" | "me"
  status: OpportunityStatus
  value?: number
  currency?: string
  notes?: string
  formId?: string
  formSubmissionTime?: string
  campaignId?: string
  leadId?: string
  originList?: string
  reversedReason?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface Lead {
  id: string
  contactId: string
  source: LeadSource
  status: LeadStatus
  assignedTo: "linda" | "James"
  notes?: string
  value?: number
  conversationId?: string
  clientName?: string
  createdAt: string
  updatedAt: string
  lastContactedAt?: string
}

export interface FollowUp {
  id: string
  leadId: string
  contactId: string
  scheduledDate: string
  type: "call" | "email" | "social"
  notes?: string
  completed: boolean
  createdAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: "enquiry" | "follow_up" | "promotion" | "return_client"
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  opportunityId?: string
  leadId?: string // Legacy support
  contactId: string
  type: "email_sent" | "email_received" | "call_made" | "call_received" | "status_changed" | "note_added" | "follow_up_scheduled" | "social_dm" | "social_comment" | "social_lead_form" | "webform_submission" | "teams_message" | "teams_call" | "written_communication"
  description: string
  direction?: "inbound" | "outbound"
  user: string
  conversationId?: string
  messageId?: string
  deepLink?: string
  platform?: "facebook" | "instagram" | "linkedin"
  platformThreadUrl?: string
  callDuration?: number
  callOutcome?: string
  createdAt: string
}

export interface CallLog {
  id: string
  opportunityId?: string
  contactId: string
  phoneNumber: string
  direction: "inbound" | "outbound"
  duration?: number
  outcome?: string
  notes?: string
  originList?: string
  user: string
  occurredAt: string
  createdAt: string
}

export interface CommissionSnapshot {
  id: string
  opportunityId: string
  finalValue: number
  currency: string
  products?: string
  commissionableAmount: number
  owner: string
  source: OpportunitySource
  subSource: string
  firstTouchDate?: string
  firstTouchActivityType?: string
  closedAt: string
  lockedBy: string
  createdAt: string
}

export interface AuditTrail {
  id: string
  opportunityId: string
  fieldName: string
  oldValue?: string
  newValue?: string
  changedBy: string
  changedAt: string
}

export interface Dispute {
  id: string
  opportunityId: string
  commissionSnapshotId?: string
  nature: string
  description?: string
  supportingEvidence?: string
  status: "open" | "resolved" | "rejected"
  resolutionDecision?: string
  resolvedBy?: string
  resolvedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  external_id?: string
  subject: string
  body?: string
  start_datetime: string
  end_datetime: string
  location?: string
  is_all_day: boolean
  attendees?: Array<{ email: string; name?: string; type?: string }>
  organizer_email?: string
  follow_up_id?: string
  contact_id?: string
  opportunity_id?: string
  lead_id?: string
  status: "tentative" | "confirmed" | "cancelled" | "completed"
  contact_name?: string
  contact_email?: string
  follow_up_type?: string
  follow_up_completed?: boolean
  created_at: string
  updated_at: string
}
