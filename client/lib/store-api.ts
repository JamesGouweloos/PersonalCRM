import type { Contact, Lead, FollowUp, EmailTemplate, Activity } from "./types"
import { contactsAPI, leadsAPI, followupsAPI, templatesAPI, activitiesAPI } from "./api"

// Helper function to transform API responses to match frontend types
function transformContact(apiContact: any): Contact {
  return {
    id: apiContact.id.toString(),
    name: apiContact.name,
    email: apiContact.email,
    phone: apiContact.phone || undefined,
    company: apiContact.company || undefined,
    title: apiContact.title || undefined,
    notes: apiContact.notes || undefined,
    contact_type: apiContact.contact_type || 'Other',
    createdAt: apiContact.created_at,
    updatedAt: apiContact.updated_at,
  }
}

function transformLead(apiLead: any, contact?: Contact): Lead {
  return {
    id: apiLead.id.toString(),
    contactId: apiLead.contact_id.toString(),
    source: apiLead.source,
    status: apiLead.status,
    assignedTo: apiLead.assigned_to === "me" ? "me" : "linda",
    notes: apiLead.notes || undefined,
    value: apiLead.value || undefined,
    createdAt: apiLead.created_at,
    updatedAt: apiLead.updated_at,
    lastContactedAt: apiLead.last_contacted_at || undefined,
  }
}

function transformFollowUp(apiFollowUp: any): FollowUp {
  return {
    id: apiFollowUp.id.toString(),
    leadId: apiFollowUp.lead_id.toString(),
    contactId: apiFollowUp.contact_id.toString(),
    scheduledDate: apiFollowUp.scheduled_date,
    type: apiFollowUp.type,
    notes: apiFollowUp.notes || undefined,
    completed: Boolean(apiFollowUp.completed),
    createdAt: apiFollowUp.created_at,
  }
}

function transformTemplate(apiTemplate: any): EmailTemplate {
  return {
    id: apiTemplate.id.toString(),
    name: apiTemplate.name,
    subject: apiTemplate.subject,
    body: apiTemplate.body,
    type: apiTemplate.type,
    createdAt: apiTemplate.created_at,
    updatedAt: apiTemplate.updated_at,
  }
}

function transformActivity(apiActivity: any): Activity {
  return {
    id: apiActivity.id.toString(),
    leadId: apiActivity.lead_id?.toString() || "",
    contactId: apiActivity.contact_id?.toString() || "",
    type: apiActivity.type,
    description: apiActivity.description,
    createdAt: apiActivity.created_at,
  }
}

// Contacts
export async function getContacts(search?: string): Promise<Contact[]> {
  try {
    const response = await contactsAPI.getAll(search)
    return response.data.map(transformContact)
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return []
  }
}

export async function saveContact(contact: Contact): Promise<Contact | null> {
  try {
    const payload = {
      name: contact.name,
      email: contact.email,
      phone: contact.phone || null,
      company: contact.company || null,
      title: contact.title || null,
      notes: contact.notes || null,
      contact_type: contact.contact_type || 'Other',
    }
    
    let response
    if (contact.id) {
      response = await contactsAPI.update(contact.id, payload)
      // Check if update failed due to duplicate email
      if (response.status === 409 || response.data?.duplicate) {
        throw new Error(response.data?.error || 'A contact with this email already exists')
      }
    } else {
      response = await contactsAPI.create(payload)
      // Check if this is a duplicate response
      if (response.data.duplicate) {
        console.warn("Contact with this email already exists:", response.data.email)
        // Return the existing contact
        return transformContact(response.data)
      }
    }
    
    // Ensure response.data exists and has an id
    if (!response.data || !response.data.id) {
      console.error("Invalid response from API:", response.data)
      return null
    }
    
    return transformContact(response.data)
  } catch (error: any) {
    console.error("Error saving contact:", error)
    // Check if error is due to duplicate email
    if (error.response?.status === 409 || error.response?.data?.duplicate || error.message?.includes('already exists')) {
      const errorMessage = error.response?.data?.error || error.message || 'A contact with this email already exists'
      throw new Error(errorMessage)
    }
    return null
  }
}

export async function deleteContact(id: string): Promise<boolean> {
  try {
    await contactsAPI.delete(id)
    return true
  } catch (error) {
    console.error("Error deleting contact:", error)
    return false
  }
}

// Leads
export async function getLeads(params?: any): Promise<Lead[]> {
  try {
    const response = await leadsAPI.getAll(params)
    return response.data.map(transformLead)
  } catch (error) {
    console.error("Error fetching leads:", error)
    return []
  }
}

export async function saveLead(lead: Lead): Promise<Lead | null> {
  try {
    const payload = {
      contact_id: parseInt(lead.contactId),
      source: lead.source,
      status: lead.status,
      assigned_to: lead.assignedTo,
      notes: lead.notes || null,
      value: lead.value || null,
      last_contacted_at: lead.lastContactedAt || null,
    }
    
    let response
    if (lead.id) {
      response = await leadsAPI.update(lead.id, payload)
    } else {
      response = await leadsAPI.create(payload)
    }
    return transformLead(response.data)
  } catch (error) {
    console.error("Error saving lead:", error)
    return null
  }
}

export async function deleteLead(id: string): Promise<boolean> {
  try {
    await leadsAPI.delete(id)
    return true
  } catch (error) {
    console.error("Error deleting lead:", error)
    return false
  }
}

// Follow-ups
export async function getFollowUps(params?: any): Promise<FollowUp[]> {
  try {
    const response = await followupsAPI.getAll(params)
    return response.data.map(transformFollowUp)
  } catch (error) {
    console.error("Error fetching follow-ups:", error)
    return []
  }
}

export async function saveFollowUp(followUp: FollowUp): Promise<FollowUp | null> {
  try {
    const payload = {
      lead_id: parseInt(followUp.leadId),
      contact_id: parseInt(followUp.contactId),
      scheduled_date: followUp.scheduledDate,
      type: followUp.type,
      notes: followUp.notes || null,
      completed: followUp.completed ? 1 : 0,
    }
    
    let response
    if (followUp.id) {
      response = await followupsAPI.update(followUp.id, payload)
    } else {
      response = await followupsAPI.create(payload)
    }
    return transformFollowUp(response.data)
  } catch (error) {
    console.error("Error saving follow-up:", error)
    return null
  }
}

export async function deleteFollowUp(id: string): Promise<boolean> {
  try {
    await followupsAPI.delete(id)
    return true
  } catch (error) {
    console.error("Error deleting follow-up:", error)
    return false
  }
}

// Email Templates
export async function getTemplates(): Promise<EmailTemplate[]> {
  try {
    const response = await templatesAPI.getAll()
    return response.data.map(transformTemplate)
  } catch (error) {
    console.error("Error fetching templates:", error)
    return []
  }
}

export async function saveTemplate(template: EmailTemplate): Promise<EmailTemplate | null> {
  try {
    const payload = {
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
    }
    
    let response
    if (template.id) {
      response = await templatesAPI.update(template.id, payload)
    } else {
      response = await templatesAPI.create(payload)
    }
    return transformTemplate(response.data)
  } catch (error) {
    console.error("Error saving template:", error)
    return null
  }
}

export async function deleteTemplate(id: string): Promise<boolean> {
  try {
    await templatesAPI.delete(id)
    return true
  } catch (error) {
    console.error("Error deleting template:", error)
    return false
  }
}

// Activities
export async function getActivities(params?: any): Promise<Activity[]> {
  try {
    const response = await activitiesAPI.getAll(params)
    return response.data.map(transformActivity)
  } catch (error) {
    console.error("Error fetching activities:", error)
    return []
  }
}

export async function addActivity(activity: Activity): Promise<Activity | null> {
  try {
    const payload = {
      lead_id: activity.leadId ? parseInt(activity.leadId) : null,
      contact_id: activity.contactId ? parseInt(activity.contactId) : null,
      type: activity.type,
      description: activity.description,
    }
    const response = await activitiesAPI.create(payload)
    return transformActivity(response.data)
  } catch (error) {
    console.error("Error adding activity:", error)
    return null
  }
}


